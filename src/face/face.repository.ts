import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, gt, isNull } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_DB } from '../db/db.module';
import * as schema from '../db/schema';

@Injectable()
export class FaceRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async recordConsent(userId: string, consentVersion: string) {
    const [consent] = await this.db
      .insert(schema.biometricConsents)
      .values({ userId, consentVersion })
      .returning({
        consentVersion: schema.biometricConsents.consentVersion,
        acceptedAt: schema.biometricConsents.acceptedAt,
      });
    return consent;
  }

  async getLatestConsent(userId: string) {
    const [consent] = await this.db
      .select({
        consentVersion: schema.biometricConsents.consentVersion,
        acceptedAt: schema.biometricConsents.acceptedAt,
      })
      .from(schema.biometricConsents)
      .where(eq(schema.biometricConsents.userId, userId))
      .orderBy(desc(schema.biometricConsents.acceptedAt))
      .limit(1);
    return consent ?? null;
  }

  async saveTemplate(
    template: typeof schema.faceTemplates.$inferInsert,
  ): Promise<string> {
    return this.db.transaction(async (transaction) => {
      await transaction
        .update(schema.faceTemplates)
        .set({ status: 'revoked', revokedAt: new Date() })
        .where(
          and(
            eq(schema.faceTemplates.userId, template.userId),
            eq(schema.faceTemplates.status, 'active'),
          ),
        );
      const [saved] = await transaction
        .insert(schema.faceTemplates)
        .values(template)
        .returning({ id: schema.faceTemplates.id });
      return saved.id;
    });
  }

  async getActiveTemplate(userId: string) {
    const [template] = await this.db
      .select()
      .from(schema.faceTemplates)
      .where(
        and(
          eq(schema.faceTemplates.userId, userId),
          eq(schema.faceTemplates.status, 'active'),
        ),
      )
      .limit(1);
    return template ?? null;
  }

  async hasActiveTemplate(userId: string): Promise<boolean> {
    return (await this.getActiveTemplate(userId)) !== null;
  }

  async createChallenge(challenge: typeof schema.faceChallenges.$inferInsert) {
    const [created] = await this.db
      .insert(schema.faceChallenges)
      .values(challenge)
      .returning({
        id: schema.faceChallenges.id,
        expiresAt: schema.faceChallenges.expiresAt,
      });
    return created;
  }

  async consumeChallenge(id: string, userId: string) {
    const now = new Date();
    const [challenge] = await this.db
      .update(schema.faceChallenges)
      .set({ usedAt: now })
      .where(
        and(
          eq(schema.faceChallenges.id, id),
          eq(schema.faceChallenges.userId, userId),
          eq(schema.faceChallenges.nonce, id),
          isNull(schema.faceChallenges.usedAt),
          gt(schema.faceChallenges.expiresAt, now),
        ),
      )
      .returning({
        id: schema.faceChallenges.id,
        purpose: schema.faceChallenges.purpose,
      });
    return challenge ?? null;
  }

  async findChallengeForAttempt(id: string, userId: string) {
    const [challenge] = await this.db
      .select({
        id: schema.faceChallenges.id,
        purpose: schema.faceChallenges.purpose,
      })
      .from(schema.faceChallenges)
      .where(
        and(
          eq(schema.faceChallenges.id, id),
          eq(schema.faceChallenges.userId, userId),
        ),
      )
      .limit(1);
    return challenge ?? null;
  }

  async countRecentAttempts(
    userId: string,
    ip: string | null,
    since: Date,
  ): Promise<number> {
    const ipCondition =
      ip === null
        ? isNull(schema.faceAttempts.ip)
        : eq(schema.faceAttempts.ip, ip);
    const [result] = await this.db
      .select({ value: count() })
      .from(schema.faceAttempts)
      .where(
        and(
          eq(schema.faceAttempts.userId, userId),
          ipCondition,
          gt(schema.faceAttempts.createdAt, since),
        ),
      );
    return result.value;
  }

  async getLatestAttempts(userId: string, limit: number) {
    return this.db
      .select({
        result: schema.faceAttempts.result,
        createdAt: schema.faceAttempts.createdAt,
      })
      .from(schema.faceAttempts)
      .where(eq(schema.faceAttempts.userId, userId))
      .orderBy(desc(schema.faceAttempts.createdAt))
      .limit(limit);
  }

  async recordAttempt(attempt: typeof schema.faceAttempts.$inferInsert) {
    await this.db.insert(schema.faceAttempts).values(attempt);
  }

  async deleteTemplates(userId: string): Promise<string[]> {
    const deleted = await this.db
      .delete(schema.faceTemplates)
      .where(eq(schema.faceTemplates.userId, userId))
      .returning({ id: schema.faceTemplates.id });
    return deleted.map((template) => template.id);
  }
}
