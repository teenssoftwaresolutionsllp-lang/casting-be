import {
  Global,
  INestApplication,
  Module,
  ValidationPipe,
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule, JwtService }   from '@nestjs/jwt';
import { useContainer } from 'class-validator';
import request, { Response as SupertestResponse } from 'supertest';
import { App } from 'supertest/types';
import { ActivityLogService } from '../src/activity-log/activity-log.service';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { DRIZZLE_DB } from '../src/db/db.module';
import { FaceModule } from '../src/face/face.module';
import { FaceRepository } from '../src/face/face.repository';
import { FaceVerifiedGuard } from '../src/face/face-verified.guard';
import { RequireFaceVerification } from '../src/face/require-face-verification.decorator';

const TEST_JWT_SECRET = 'face-verification-e2e-test-secret';
const TEST_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

@Global()
@Module({
  providers: [{ provide: DRIZZLE_DB, useValue: {} }],
  exports: [DRIZZLE_DB],
})
class TestDatabaseModule {}

@Controller('protected')
@UseGuards(JwtAuthGuard, FaceVerifiedGuard)
class FaceProtectedTestController {
  @Get()
  @RequireFaceVerification('manage-account')
  protectedAction() {
    return { verified: true };
  }
}

describe('Face verification flow (e2e)', () => {
  let app: INestApplication<App>;
  let authToken: string;
  let repository: ReturnType<typeof createMemoryRepository>;
  const originalEnvironment = {
    FACE_ENCRYPTION_KEYS: process.env.FACE_ENCRYPTION_KEYS,
    FACE_ENCRYPTION_KEY_VERSION: process.env.FACE_ENCRYPTION_KEY_VERSION,
    FACE_EMBEDDING_LENGTH: process.env.FACE_EMBEDDING_LENGTH,
    FACE_DISTANCE_THRESHOLD: process.env.FACE_DISTANCE_THRESHOLD,
  };

  beforeAll(async () => {
    process.env.FACE_ENCRYPTION_KEYS = JSON.stringify({
      1: Buffer.alloc(32, 7).toString('base64'),
    });
    process.env.FACE_ENCRYPTION_KEY_VERSION = '1';
    process.env.FACE_EMBEDDING_LENGTH = '2';
    process.env.FACE_DISTANCE_THRESHOLD = '0.5';

    repository = createMemoryRepository();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        JwtModule.register({ global: true, secret: TEST_JWT_SECRET }),
        TestDatabaseModule,
        FaceModule,
      ],
      controllers: [FaceProtectedTestController],
    })
      .overrideProvider(FaceRepository)
      .useValue(repository)
      .overrideProvider(ActivityLogService)
      .useValue({ log: jest.fn() })
      .compile();

    app = moduleFixture.createNestApplication();
    useContainer(moduleFixture, { fallbackOnErrors: true });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    authToken = await app
      .get(JwtService)
      .signAsync({ sub: TEST_USER_ID }, { expiresIn: '7d' });
  });

  afterAll(async () => {
    await app.close();
    restoreEnvironment(
      'FACE_ENCRYPTION_KEYS',
      originalEnvironment.FACE_ENCRYPTION_KEYS,
    );
    restoreEnvironment(
      'FACE_ENCRYPTION_KEY_VERSION',
      originalEnvironment.FACE_ENCRYPTION_KEY_VERSION,
    );
    restoreEnvironment(
      'FACE_EMBEDDING_LENGTH',
      originalEnvironment.FACE_EMBEDDING_LENGTH,
    );
    restoreEnvironment(
      'FACE_DISTANCE_THRESHOLD',
      originalEnvironment.FACE_DISTANCE_THRESHOLD,
    );
  });

  it('enrolls, verifies once, and authorizes only the matching protected purpose', async () => {
    await request(app.getHttpServer())
      .post('/face/consent')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ version: '2026-01' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/face/enroll')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        embedding: [0.1],
        modelVersion: 'test-model-v1',
        sampleCount: 3,
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/face/enroll')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        embedding: [0.1, 0.2],
        modelVersion: 'test-model-v1',
        sampleCount: 3,
      })
      .expect(201);

    const challengeResponse = await request(app.getHttpServer())
      .post('/face/challenge')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ purpose: 'manage-account' })
      .expect(201);

    const protectedBeforeVerification = await request(app.getHttpServer())
      .get('/protected')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(401);
    expect(
      responseBody<{ code: string }>(protectedBeforeVerification).code,
    ).toBe('FACE_VERIFICATION_REQUIRED');

    const challengeId = responseBody<{ challengeId: string }>(
      challengeResponse,
    ).challengeId;
    const verificationResponse = await request(app.getHttpServer())
      .post('/face/verify')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        challengeId,
        embedding: [0.1, 0.2],
        livenessPassed: true,
        deviceId: 'test-device',
      })
      .expect(201);

    const faceToken = responseBody<{ faceToken: string }>(
      verificationResponse,
    ).faceToken;
    await request(app.getHttpServer())
      .get('/protected')
      .set('Authorization', `Bearer ${authToken}`)
      .set('X-Face-Token', faceToken)
      .expect(200)
      .expect({ verified: true });

    const replayResponse = await request(app.getHttpServer())
      .post('/face/verify')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        challengeId,
        embedding: [0.1, 0.2],
        livenessPassed: true,
      })
      .expect(400);
    expect(responseBody<{ code: string }>(replayResponse).code).toBe(
      'CHALLENGE_EXPIRED',
    );
    expect(repository.attempts.map(({ result }) => result)).toEqual([
      'passed',
      'expired',
    ]);
  });
});

interface StoredAttempt {
  userId: string;
  ip?: string | null;
  result: string;
  createdAt: Date;
  challengeId?: string | null;
  purpose?: string | null;
  livenessPassed: boolean;
  deviceId?: string;
  similarityScore?: number;
}

function createMemoryRepository() {
  let consent: { consentVersion: string; acceptedAt: Date } | null = null;
  let template: Record<string, unknown> | null = null;
  const challenges = new Map<
    string,
    {
      id: string;
      userId: string;
      purpose: string;
      expiresAt: Date;
      usedAt?: Date;
    }
  >();
  const attempts: StoredAttempt[] = [];

  return {
    attempts,
    recordConsent: (_userId: string, consentVersion: string) => {
      consent = { consentVersion, acceptedAt: new Date() };
      return consent;
    },
    getLatestConsent: () => consent,
    saveTemplate: (value: Record<string, unknown>) => {
      template = { ...value, id: 'test-template' };
      return 'test-template';
    },
    getActiveTemplate: () => template,
    createChallenge: (value: {
      id: string;
      userId: string;
      purpose: string;
      expiresAt: Date;
    }) => {
      challenges.set(value.id, value);
      return { id: value.id, expiresAt: value.expiresAt };
    },
    consumeChallenge: (id: string, userId: string) => {
      const challenge = challenges.get(id);
      if (
        !challenge ||
        challenge.userId !== userId ||
        challenge.usedAt ||
        challenge.expiresAt <= new Date()
      ) {
        return null;
      }
      challenge.usedAt = new Date();
      return { id: challenge.id, purpose: challenge.purpose };
    },
    findChallengeForAttempt: (id: string, userId: string) => {
      const challenge = challenges.get(id);
      return challenge?.userId === userId
        ? { id: challenge.id, purpose: challenge.purpose }
        : null;
    },
    countRecentAttempts: (userId: string, ip: string | null, since: Date) =>
      attempts.filter(
        (attempt) =>
          attempt.userId === userId &&
          attempt.ip === ip &&
          attempt.createdAt > since,
      ).length,
    getLatestAttempts: (userId: string, limit: number) =>
      attempts
        .filter((attempt) => attempt.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit),
    recordAttempt: (attempt: Omit<StoredAttempt, 'createdAt'>) => {
      attempts.push({ ...attempt, createdAt: new Date() });
    },
    deleteTemplates: () => {
      const existed = template !== null;
      template = null;
      return existed ? ['test-template'] : [];
    },
  };
}

function responseBody<T>(response: SupertestResponse): T {
  return response.body as T;
}

function restoreEnvironment(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
