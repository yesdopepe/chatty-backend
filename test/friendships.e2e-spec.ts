import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../src/auth/auth.module';
import { UsersModule } from '../src/users/users.module';
import { FriendshipsModule } from '../src/friendships/friendships.module';
import { testDatabaseConfig } from './database.config';

describe('Friendships (e2e)', () => {
  let app: INestApplication;
  let jwtToken1: string; // for first test user
  let jwtToken2: string; // for second test user
  let jwtToken3: string; // for third test user
  let user1Id: string;
  let user2Id: string;
  let user3Id: string;

  const testUser1 = {
    username: 'testuser1',
    email: 'test1@example.com',
    password: 'password123',
  };

  const testUser2 = {
    username: 'testuser2',
    email: 'test2@example.com',
    password: 'password123',
  };

  const testUser3 = {
    username: 'testuser3',
    email: 'test3@example.com',
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

    const response3 = await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser3);
    jwtToken3 = response3.body.access_token;
    user3Id = response3.body.user.user_id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Friend Request Flow', () => {
    it('should send a friend request successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/friendships/request')
        .set('Authorization', `Bearer ${jwtToken1}`)
        .send({ friendId: user2Id })
        .expect(201);

      expect(response.body.status).toBe('pending');
    });

    it('should not allow sending duplicate friend requests', async () => {
      await request(app.getHttpServer())
        .post('/friendships/request')
        .set('Authorization', `Bearer ${jwtToken1}`)
        .send({ friendId: user2Id })
        .expect(400);
    });

    it('should accept a friend request', async () => {
      const response = await request(app.getHttpServer())
        .post(`/friendships/accept/${user1Id}`)
        .set('Authorization', `Bearer ${jwtToken2}`)
        .expect(200);

      expect(response.body.status).toBe('accepted');
    });
  });

  describe('Search and Pagination', () => {
    it('should search friends with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/friendships/search')
        .set('Authorization', `Bearer ${jwtToken1}`)
        .query({ search: 'test', page: 1, limit: 10 })
        .expect(200);

      expect(response.body.meta).toBeDefined();
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBeTruthy();
    });

    it('should search users for friend requests', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/search')
        .set('Authorization', `Bearer ${jwtToken1}`)
        .query({ search: 'test', page: 1, limit: 10 })
        .expect(200);

      expect(response.body.meta).toBeDefined();
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBeTruthy();
    });
  });

  describe('Blocking Flow', () => {
    it('should block a user successfully', async () => {
      await request(app.getHttpServer())
        .post(`/friendships/block/${user3Id}`)
        .set('Authorization', `Bearer ${jwtToken1}`)
        .expect(200);

      // Verify blocked user cannot send friend request
      await request(app.getHttpServer())
        .post('/friendships/request')
        .set('Authorization', `Bearer ${jwtToken3}`)
        .send({ friendId: user1Id })
        .expect(400);
    });

    it('should unblock a user successfully', async () => {
      await request(app.getHttpServer())
        .delete(`/friendships/unblock/${user3Id}`)
        .set('Authorization', `Bearer ${jwtToken1}`)
        .expect(200);

      // Verify unblocked user can now send friend request
      await request(app.getHttpServer())
        .post('/friendships/request')
        .set('Authorization', `Bearer ${jwtToken3}`)
        .send({ friendId: user1Id })
        .expect(201);
    });
  });

  describe('Friend Suggestions', () => {
    it('should get friend suggestions', async () => {
      // First create a network of friendships
      await request(app.getHttpServer())
        .post('/friendships/request')
        .set('Authorization', `Bearer ${jwtToken2}`)
        .send({ friendId: user3Id })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/friendships/accept/${user2Id}`)
        .set('Authorization', `Bearer ${jwtToken3}`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/friendships/suggestions')
        .set('Authorization', `Bearer ${jwtToken1}`)
        .query({ limit: 5 })
        .expect(200);

      expect(Array.isArray(response.body)).toBeTruthy();
      // User 3 should be suggested as they're friends with User 2
      expect(
        response.body.some((user) => user.user_id === user3Id),
      ).toBeTruthy();
    });
  });
});
