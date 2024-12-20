import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { io, Socket } from 'socket.io-client';
import { AuthModule } from '../src/auth/auth.module';
import { UsersModule } from '../src/users/users.module';
import { NotificationsModule } from '../src/notifications/notifications.module';
import { MessagesModule } from '../src/messages/messages.module';
import { ConversationsModule } from '../src/conversations/conversations.module';
import { FriendshipsModule } from '../src/friendships/friendships.module';
import { testDatabaseConfig } from './database.config';

describe('Notifications (e2e)', () => {
  let app: INestApplication;
  let notificationSocket1: Socket;
  let notificationSocket2: Socket;
  let jwtToken1: string;
  let jwtToken2: string;
  let user1Id: string;
  let user2Id: string;
  let conversationId: string;
  let notificationId: string;

  const testUser1 = {
    username: 'notifuser1',
    email: 'notif1@example.com',
    password: 'password123',
  };

  const testUser2 = {
    username: 'notifuser2',
    email: 'notif2@example.com',
    password: 'password123',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot(testDatabaseConfig),
        AuthModule,
        UsersModule,
        NotificationsModule,
        MessagesModule,
        ConversationsModule,
        FriendshipsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
    await app.listen(0); // Random port

    // Register test users
    const response1 = await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser1);
    jwtToken1 = response1.body.access_token;
    user1Id = response1.body.user.user_id;

    const response2 = await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser2);
    jwtToken2 = response2.body.access_token;
    user2Id = response2.body.user.user_id;

    // Create a conversation between users
    const conversationResponse = await request(app.getHttpServer())
      .post('/conversations')
      .set('Authorization', `Bearer ${jwtToken1}`)
      .send({
        participant_ids: [user2Id],
        is_group: false,
      });
    conversationId = conversationResponse.body.conversation_id;

    // Connect WebSocket clients
    const port = app.getHttpServer().address().port;
    const socketOptions = {
      transports: ['websocket'],
      forceNew: true,
      timeout: 10000,
    };

    notificationSocket1 = io(`http://localhost:${port}/notifications`, {
      ...socketOptions,
      auth: { token: jwtToken1 },
    });

    notificationSocket2 = io(`http://localhost:${port}/notifications`, {
      ...socketOptions,
      auth: { token: jwtToken2 },
    });

    // Wait for socket connections
    await Promise.all([
      new Promise<void>((resolve) =>
        notificationSocket1.on('connect', () => resolve()),
      ),
      new Promise<void>((resolve) =>
        notificationSocket2.on('connect', () => resolve()),
      ),
    ]);
  }, 30000); // Increase timeout to 30 seconds

  afterAll(async () => {
    notificationSocket1?.disconnect();
    notificationSocket2?.disconnect();
    await app.close();
  });

  describe('Notification Flow', () => {
    it('should receive notification when a message is sent', (done) => {
      notificationSocket2.on('notification', (notification) => {
        try {
          expect(notification.type).toBe('message');
          expect(notification.metadata.conversation_id).toBe(conversationId);
          expect(notification.metadata.sender_name).toBe(testUser1.username);
          notificationId = notification.notification_id;
          done();
        } catch (error) {
          done(error);
        }
      });

      // Send a message
      request(app.getHttpServer())
        .post('/messages')
        .set('Authorization', `Bearer ${jwtToken1}`)
        .send({
          conversation_id: conversationId,
          content: 'Hello, this is a test message',
        })
        .expect(201)
        .end((err) => {
          if (err) done(err);
        });
    }, 10000); // Increase test timeout to 10 seconds

    it('should get all notifications', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${jwtToken2}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].type).toBe('message');
    });

    it('should get unread notifications', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications/unread')
        .set('Authorization', `Bearer ${jwtToken2}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].is_read).toBeFalsy();
    });

    it('should mark a notification as read', async () => {
      const response = await request(app.getHttpServer())
        .post(`/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${jwtToken2}`)
        .expect(200);

      expect(response.body.is_read).toBeTruthy();
    });

    it('should mark all notifications as read', async () => {
      // Send another message to create a new notification
      await request(app.getHttpServer())
        .post('/messages')
        .set('Authorization', `Bearer ${jwtToken1}`)
        .send({
          conversation_id: conversationId,
          content: 'Another test message',
        })
        .expect(201);

      // Wait for notification to be created
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Mark all as read
      await request(app.getHttpServer())
        .post('/notifications/read-all')
        .set('Authorization', `Bearer ${jwtToken2}`)
        .expect(200);

      // Verify all notifications are read
      const response = await request(app.getHttpServer())
        .get('/notifications/unread')
        .set('Authorization', `Bearer ${jwtToken2}`)
        .expect(200);

      expect(response.body).toHaveLength(0);
    });

    it('should delete a notification', async () => {
      await request(app.getHttpServer())
        .delete(`/notifications/${notificationId}`)
        .set('Authorization', `Bearer ${jwtToken2}`)
        .expect(200);

      // Verify notification is not returned in list
      const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${jwtToken2}`)
        .expect(200);

      expect(
        response.body.find((n) => n.notification_id === notificationId),
      ).toBeUndefined();
    });
  });

  describe('WebSocket Authentication', () => {
    it('should reject connection with invalid token', (done) => {
      const invalidSocket = io(
        `http://localhost:${app.getHttpServer().address().port}/notifications`,
        {
          transports: ['websocket'],
          forceNew: true,
          auth: { token: 'invalid-token' },
        },
      );

      invalidSocket.on('error', (error) => {
        expect(error.message).toBe('Authentication failed');
        invalidSocket.disconnect();
        done();
      });
    });

    it('should reject connection without token', (done) => {
      const noTokenSocket = io(
        `http://localhost:${app.getHttpServer().address().port}/notifications`,
        {
          transports: ['websocket'],
          forceNew: true,
        },
      );

      noTokenSocket.on('error', (error) => {
        expect(error.message).toBe('Authentication failed');
        noTokenSocket.disconnect();
        done();
      });
    });
  });
});
