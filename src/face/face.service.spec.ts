import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { FaceCryptoService } from './face-crypto.service';
import { FaceRepository } from './face.repository';
import { FaceService } from './face.service';

describe('FaceService', () => {
  let service: FaceService;
  let repository: Record<string, jest.Mock>;
  let faceCrypto: { encrypt: jest.Mock; decrypt: jest.Mock };
  let jwtService: { signAsync: jest.Mock };
  let configService: { get: jest.Mock };

  const userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  const requestDto = {
    challengeId: 'e47ac10b-58cc-4372-a567-0e02b2c3d479',
    embedding: [0.1, 0.2],
    livenessPassed: true,
    deviceId: 'device-1',
  };

  beforeEach(() => {
    repository = {
      countRecentAttempts: jest.fn().mockResolvedValue(0),
      getLatestAttempts: jest.fn().mockResolvedValue([]),
      getActiveTemplate: jest.fn().mockResolvedValue({ id: 'template-id' }),
      consumeChallenge: jest.fn().mockResolvedValue({
        id: requestDto.challengeId,
        purpose: 'manage-account',
      }),
      findChallengeForAttempt: jest.fn().mockResolvedValue({
        id: requestDto.challengeId,
        purpose: 'manage-account',
      }),
      recordAttempt: jest.fn().mockResolvedValue(undefined),
      recordConsent: jest.fn(),
      getLatestConsent: jest.fn(),
      saveTemplate: jest.fn(),
      createChallenge: jest.fn(),
      deleteTemplates: jest.fn(),
    };
    faceCrypto = {
      encrypt: jest.fn(),
      decrypt: jest.fn().mockReturnValue([0.1, 0.2]),
    };
    jwtService = { signAsync: jest.fn().mockResolvedValue('face-token') };
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'FACE_EMBEDDING_LENGTH') return '2';
        if (key === 'FACE_DISTANCE_THRESHOLD') return '0.5';
        return undefined;
      }),
    };
    service = new FaceService(
      repository as unknown as FaceRepository,
      faceCrypto as unknown as FaceCryptoService,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
      { log: jest.fn() } as unknown as ActivityLogService,
    );
  });

  it('matches embeddings using the configured Euclidean-distance threshold', async () => {
    await expect(
      service.verify(userId, requestDto, { ip: '127.0.0.1' }),
    ).resolves.toEqual({ faceToken: 'face-token', expiresIn: 300 });
    expect(repository.recordAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ result: 'passed', similarityScore: 1 }),
    );
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      { sub: userId, fv: true, purpose: 'manage-account' },
      { expiresIn: '5m' },
    );
  });

  it('rejects an embedding outside the configured distance threshold', async () => {
    faceCrypto.decrypt.mockReturnValue([1, 1]);

    await expect(
      service.verify(userId, requestDto, { ip: '127.0.0.1' }),
    ).rejects.toMatchObject({ response: { code: 'FACE_MISMATCH' } });
    expect(repository.recordAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ result: 'failed' }),
    );
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('rejects challenges after their first use', async () => {
    repository.consumeChallenge.mockResolvedValue(null);

    await expect(
      service.verify(userId, requestDto, { ip: '127.0.0.1' }),
    ).rejects.toMatchObject({
      response: { code: 'CHALLENGE_EXPIRED' },
    });
    expect(repository.recordAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        result: 'expired',
        challengeId: requestDto.challengeId,
      }),
    );
    expect(faceCrypto.decrypt).not.toHaveBeenCalled();
  });

  it('rejects failed liveness and records the attempt', async () => {
    await expect(
      service.verify(
        userId,
        { ...requestDto, livenessPassed: false },
        { ip: '127.0.0.1' },
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(repository.recordAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ result: 'failed', livenessPassed: false }),
    );
    expect(faceCrypto.decrypt).not.toHaveBeenCalled();
  });

  it('locks verification after five consecutive failures', async () => {
    repository.getLatestAttempts.mockResolvedValue(
      Array.from({ length: 5 }, () => ({
        result: 'failed',
        createdAt: new Date(),
      })),
    );

    await expect(
      service.verify(userId, requestDto, { ip: '127.0.0.1' }),
    ).rejects.toMatchObject({ response: { code: 'FACE_LOCKED' } });
    expect(repository.consumeChallenge).not.toHaveBeenCalled();
  });
});
