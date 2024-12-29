import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../src/auth/auth.module';
import { testDatabaseConfig } from './database.config';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let jwtToken: string;

  beforeAll(async () => {
    // Load environment variables first
    process.env.NODE_ENV = 'test';

    moduleFixture = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot(testDatabaseConfig),
        AuthModule,
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
  }, 30000); // 30 seconds timeout

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('/auth/register (POST)', () => {
    const validUser = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
    };

    it('should register a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(validUser)
        .expect(201);

      expect(response.body.access_token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe(validUser.username);
      expect(response.body.user.email).toBe(validUser.email);
      expect(response.body.user.password_hash).toBeUndefined();
    });

    it('should fail to register with existing username', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(validUser)
        .expect(409);
    });

    it('should fail to register with invalid email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...validUser,
          email: 'invalid-email',
        })
        .expect(400);
    });
  });

  describe('/auth/login (POST)', () => {
    const loginCredentials = {
      email: 'test@example.com',
      password: 'password123',
    };

    let refreshToken: string;

    it('should login successfully and return refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginCredentials)
        .expect(200);

      expect(response.body.access_token).toBeDefined();
      expect(response.body.refresh_token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(loginCredentials.email);

      // Save tokens for later tests
      jwtToken = response.body.access_token;
      refreshToken = response.body.refresh_token;
    });

    it('should fail to login with wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          ...loginCredentials,
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should fail to login with non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401);
    });
  });

  describe('/auth/refresh (POST)', () => {
    let oldRefreshToken: string;

    beforeAll(async () => {
      // Login to get initial tokens
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });
      oldRefreshToken = response.body.refresh_token;
    });

    it('should refresh tokens successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: oldRefreshToken })
        .expect(200);

      expect(response.body.access_token).toBeDefined();
      expect(response.body.refresh_token).toBeDefined();
      expect(response.body.refresh_token).not.toBe(oldRefreshToken);
      expect(response.body.user).toBeDefined();
    });

    it('should fail with invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: 'invalid-refresh-token' })
        .expect(401);
    });

    it('should fail with already used refresh token', async () => {
      // Try to use the old refresh token again
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: oldRefreshToken })
        .expect(401);
    });
  });

  describe('/auth/logout (POST)', () => {
    it('should fail to logout without authentication', async () => {
      await request(app.getHttpServer()).post('/auth/logout').expect(401);
    });

    it('should logout successfully with valid token', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBe('Successfully logged out');
        });
    });

    it('should fail to logout with invalid token', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});
