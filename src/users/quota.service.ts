import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq, sql } from 'drizzle-orm';
import { DRIZZLE_DB } from '../db/db.module';
import * as schema from '../db/schema';
import {
  getFreeCommentLimit,
  parsePlanName,
  PLAN_LIMITS,
  PlanLimits,
  PlanName,
} from '../common/plan-policy';

export type QuotaUser = typeof schema.users.$inferSelect;

export type QuotaSnapshot = {
  user: QuotaUser;
  plan: PlanName;
  limits: PlanLimits;
  isPaidActive: boolean;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class QuotaService {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Always call this before checking likes / comments / profiles.
   *
   * Step 1: load the user from the DATABASE (not from the JWT, not from the request body).
   * Step 2: if 24 hours passed, set today's counters back to 0.
   * Step 3: if the paid period ended, treat them as a free user for limits.
   */
  async loadFreshQuota(userId: string): Promise<QuotaSnapshot> {
    return this.db.transaction(async (tx) => {
      const [locked] = await tx
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, userId));

      if (!locked) {
        throw new NotFoundException('User not found.');
      }

      let user = locked;
      const lastReset = user.lastQuotaResetAt ? new Date(user.lastQuotaResetAt).getTime() : 0;
      const needsReset = Date.now() - lastReset >= ONE_DAY_MS;

      if (needsReset) {
        const [resetUser] = await tx
          .update(schema.users)
          .set({
            likesUsedToday: 0,
            commentsUsedToday: 0,
            profileViewsUsedToday: 0,
            scrollProfilesUsedToday: 0,
            lastQuotaResetAt: new Date(),
          })
          .where(eq(schema.users.id, userId))
          .returning();
        user = resetUser;
      }

      const paidStillValid = this.hasActivePaidPeriod(user);
      const plan: PlanName = paidStillValid ? parsePlanName(user.subscriptionPlan) : 'free';

      return {
        user,
        plan,
        limits: PLAN_LIMITS[plan],
        isPaidActive: paidStillValid && plan !== 'free',
      };
    });
  }

  hasActivePaidPeriod(user: QuotaUser): boolean {
    if (!user.isPaid) {
      return false;
    }
    if (user.subscriptionStatus !== 'active') {
      return false;
    }
    if (!user.currentPeriodEnd) {
      return false;
    }
    return new Date(user.currentPeriodEnd).getTime() > Date.now();
  }

  /**
   * Add 1 like to today's count, but ONLY if they still have likes left.
   * The database itself checks the number, so two fast taps cannot sneak past the limit.
   */
  async tryConsumeLike(userId: string, maxLikes: number): Promise<boolean> {
    const [row] = await this.db
      .update(schema.users)
      .set({ likesUsedToday: sql`${schema.users.likesUsedToday} + 1` })
      .where(and(eq(schema.users.id, userId), sql`${schema.users.likesUsedToday} < ${maxLikes}`))
      .returning({ likesUsedToday: schema.users.likesUsedToday });
    return Boolean(row);
  }

  async tryConsumeComment(userId: string, maxComments: number): Promise<boolean> {
    const [row] = await this.db
      .update(schema.users)
      .set({ commentsUsedToday: sql`${schema.users.commentsUsedToday} + 1` })
      .where(and(eq(schema.users.id, userId), sql`${schema.users.commentsUsedToday} < ${maxComments}`))
      .returning({ commentsUsedToday: schema.users.commentsUsedToday });
    return Boolean(row);
  }

  async tryConsumeProfileView(userId: string, maxViews: number): Promise<boolean> {
    const [row] = await this.db
      .update(schema.users)
      .set({ profileViewsUsedToday: sql`${schema.users.profileViewsUsedToday} + 1` })
      .where(and(eq(schema.users.id, userId), sql`${schema.users.profileViewsUsedToday} < ${maxViews}`))
      .returning({ profileViewsUsedToday: schema.users.profileViewsUsedToday });
    return Boolean(row);
  }

  async addScrollUsage(userId: string, count: number): Promise<void> {
    if (count <= 0) {
      return;
    }
    await this.db
      .update(schema.users)
      .set({
        scrollProfilesUsedToday: sql`${schema.users.scrollProfilesUsedToday} + ${count}`,
      })
      .where(eq(schema.users.id, userId));
  }

  commentLimitFor(snapshot: QuotaSnapshot): number {
    if (snapshot.plan === 'free') {
      return getFreeCommentLimit(snapshot.user.likesUsedToday);
    }
    return snapshot.limits.commentsPerDay;
  }

  paywall(message: string) {
    return {
      paywall: true,
      message,
      remaining: 0,
      hasMore: false,
      profiles: [] as unknown[],
    };
  }

  throwPaywall(message: string): never {
    throw new ForbiddenException({
      paywall: true,
      message,
      remaining: 0,
    });
  }
}
