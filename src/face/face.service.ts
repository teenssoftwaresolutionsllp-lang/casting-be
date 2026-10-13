import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { FaceCryptoService } from './face-crypto.service';
import { FaceRepository } from './face.repository';
import { EnrollDto } from './dto/enroll.dto';
import { VerifyDto } from './dto/verify.dto';

const CHALLENGE_LIFETIME_MS = 60_000;
const FACE_TOKEN_LIFETIME = '5m';
const REAUTH_MAX_AGE_SECONDS = 5 * 60;
const VERIFY_RATE_LIMIT = 10;
const VERIFY_RATE_WINDOW_MS = 60_000;
const LOCKOUT_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60_000;

interface RequestAuditContext {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class FaceService {
  constructor(
    private readonly faceRepository: FaceRepository,
    private readonly faceCrypto: FaceCryptoService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async acceptConsent(userId: string, version: string) {
    const consent = await this.faceRepository.recordConsent(userId, version);
    return {
      accepted: true,
      version: consent.consentVersion,
      acceptedAt: consent.acceptedAt,
    };
  }

  async enroll(userId: string, authIssuedAt: unknown, dto: EnrollDto) {
    this.validateEmbedding(dto.embedding);
    this.requireRecentAuthentication(authIssuedAt);

    const consent = await this.faceRepository.getLatestConsent(userId);
    if (!consent) {
      throw new ForbiddenException({ code: 'BIOMETRIC_CONSENT_REQUIRED' });
    }

    const encrypted = this.faceCrypto.encrypt(dto.embedding);
    await this.faceRepository.saveTemplate({
      userId,
      ...encrypted,
      modelVersion: dto.modelVersion,
      status: 'active',
    });
    return { enrolled: true, modelVersion: dto.modelVersion };
  }

  async createChallenge(userId: string, purpose: string) {
    const id = randomUUID();
    const expiresAt = new Date(Date.now() + CHALLENGE_LIFETIME_MS);
    const challenge = await this.faceRepository.createChallenge({
      id,
      userId,
      nonce: id,
      purpose,
      expiresAt,
    });
    return { challengeId: challenge.id, expiresAt: challenge.expiresAt };
  }

  async verify(
    userId: string,
    dto: VerifyDto,
    auditContext: RequestAuditContext,
  ) {
    this.validateEmbedding(dto.embedding);
    await this.assertNotLocked(userId);
    await this.assertNotRateLimited(userId, auditContext.ip);

    const template = await this.faceRepository.getActiveTemplate(userId);
    if (!template) {
      throw new UnauthorizedException({ code: 'FACE_NOT_ENROLLED' });
    }

    const challenge = await this.faceRepository.consumeChallenge(
      dto.challengeId,
      userId,
    );
    if (!challenge) {
      const priorChallenge = await this.faceRepository.findChallengeForAttempt(
        dto.challengeId,
        userId,
      );
      await this.faceRepository.recordAttempt({
        userId,
        challengeId: priorChallenge?.id ?? null,
        purpose: priorChallenge?.purpose ?? null,
        result: 'expired',
        livenessPassed: dto.livenessPassed,
        deviceId: dto.deviceId,
        ip: auditContext.ip,
      });
      throw new BadRequestException({ code: 'CHALLENGE_EXPIRED' });
    }

    if (!dto.livenessPassed) {
      await this.recordFailure(
        userId,
        challenge.id,
        challenge.purpose,
        dto,
        auditContext,
      );
      await this.assertNotLocked(userId);
      throw new UnauthorizedException({ code: 'LIVENESS_FAILED' });
    }

    const enrolledEmbedding = this.faceCrypto.decrypt(template);
    this.validateEmbedding(enrolledEmbedding);
    const distance = this.euclideanDistance(enrolledEmbedding, dto.embedding);
    const score = 1 / (1 + distance);

    if (distance > this.getDistanceThreshold()) {
      await this.faceRepository.recordAttempt({
        userId,
        challengeId: challenge.id,
        purpose: challenge.purpose,
        result: 'failed',
        similarityScore: score,
        livenessPassed: true,
        deviceId: dto.deviceId,
        ip: auditContext.ip,
      });
      await this.assertNotLocked(userId);
      throw new UnauthorizedException({ code: 'FACE_MISMATCH' });
    }

    await this.faceRepository.recordAttempt({
      userId,
      challengeId: challenge.id,
      purpose: challenge.purpose,
      result: 'passed',
      similarityScore: score,
      livenessPassed: true,
      deviceId: dto.deviceId,
      ip: auditContext.ip,
    });
    const faceToken = await this.jwtService.signAsync(
      { sub: userId, fv: true, purpose: challenge.purpose },
      { expiresIn: FACE_TOKEN_LIFETIME },
    );
    return { faceToken, expiresIn: 300 };
  }

  async getStatus(userId: string) {
    const [consent, template] = await Promise.all([
      this.faceRepository.getLatestConsent(userId),
      this.faceRepository.getActiveTemplate(userId),
    ]);
    return {
      enrolled: !!template,
      modelVersion: template?.modelVersion ?? null,
      consent: consent
        ? {
            accepted: true,
            version: consent.consentVersion,
            acceptedAt: consent.acceptedAt,
          }
        : { accepted: false, version: null, acceptedAt: null },
    };
  }

  async deleteEnrollment(userId: string, auditContext: RequestAuditContext) {
    const deletedTemplateIds =
      await this.faceRepository.deleteTemplates(userId);
    if (!deletedTemplateIds.length) {
      throw new UnauthorizedException({ code: 'FACE_NOT_ENROLLED' });
    }
    await this.activityLogService.log(
      userId,
      'FACE_TEMPLATE_DELETED',
      'face_template',
      deletedTemplateIds[0],
      { deletedCount: deletedTemplateIds.length },
      auditContext.ip,
      auditContext.userAgent,
    );
    return { deleted: true };
  }

  private async recordFailure(
    userId: string,
    challengeId: string,
    purpose: string,
    dto: VerifyDto,
    auditContext: RequestAuditContext,
  ) {
    await this.faceRepository.recordAttempt({
      userId,
      challengeId,
      purpose,
      result: 'failed',
      livenessPassed: dto.livenessPassed,
      deviceId: dto.deviceId,
      ip: auditContext.ip,
    });
  }

  private async assertNotRateLimited(userId: string, ip?: string) {
    const since = new Date(Date.now() - VERIFY_RATE_WINDOW_MS);
    const attempts = await this.faceRepository.countRecentAttempts(
      userId,
      ip ?? null,
      since,
    );
    if (attempts >= VERIFY_RATE_LIMIT) {
      throw new HttpException(
        { code: 'FACE_RATE_LIMITED' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async assertNotLocked(userId: string) {
    const attempts = await this.faceRepository.getLatestAttempts(
      userId,
      LOCKOUT_ATTEMPTS,
    );
    const lockoutStartedAt = attempts[0]?.createdAt;
    const isLocked =
      attempts.length === LOCKOUT_ATTEMPTS &&
      attempts.every((attempt) => attempt.result === 'failed') &&
      !!lockoutStartedAt &&
      Date.now() - lockoutStartedAt.getTime() < LOCKOUT_DURATION_MS;
    if (isLocked) {
      throw new ForbiddenException({ code: 'FACE_LOCKED' });
    }
  }

  private requireRecentAuthentication(authIssuedAt: unknown) {
    const now = Math.floor(Date.now() / 1000);
    if (
      typeof authIssuedAt !== 'number' ||
      !Number.isFinite(authIssuedAt) ||
      authIssuedAt > now ||
      now - authIssuedAt > REAUTH_MAX_AGE_SECONDS
    ) {
      throw new UnauthorizedException({ code: 'FACE_REAUTH_REQUIRED' });
    }
  }

  private validateEmbedding(embedding: number[]) {
    const configuredLength = Number(
      this.configService.get<string>('FACE_EMBEDDING_LENGTH'),
    );
    if (!Number.isSafeInteger(configuredLength) || configuredLength <= 0) {
      throw new ServiceUnavailableException({
        code: 'FACE_CONFIGURATION_UNAVAILABLE',
      });
    }
    if (
      embedding.length !== configuredLength ||
      embedding.some((value) => !Number.isFinite(value))
    ) {
      throw new BadRequestException({ code: 'INVALID_FACE_EMBEDDING' });
    }
  }

  private getDistanceThreshold(): number {
    const threshold = Number(
      this.configService.get<string>('FACE_DISTANCE_THRESHOLD'),
    );
    if (!Number.isFinite(threshold) || threshold <= 0) {
      throw new ServiceUnavailableException({
        code: 'FACE_CONFIGURATION_UNAVAILABLE',
      });
    }
    return threshold;
  }

  private euclideanDistance(left: number[], right: number[]): number {
    if (left.length !== right.length) {
      throw new BadRequestException({ code: 'INVALID_FACE_EMBEDDING' });
    }
    const squaredDistance = left.reduce((sum, value, index) => {
      const difference = value - right[index];
      return sum + difference * difference;
    }, 0);
    return Math.sqrt(squaredDistance);
  }
}
