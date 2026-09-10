import { Injectable } from '@nestjs/common';
import { UserRepository } from '../users/user.repository';
import { SubscriptionRepository } from './subscription.repository';
import { PAID_PERIOD_DAYS, PlanName } from '../common/plan-policy';

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly subscriptionRepository: SubscriptionRepository,
  ) {}

  /**
   * Turn a user into a paying user AFTER payment is proven on the server.
   *
   * If they go from Pro to Pro Max:
   * - current plan becomes Pro Max right now
   * - previous plan is saved as Pro on the user row
   * - a history row is written so we never "lose" Pro
   */
  async activatePaidPlan(params: {
    userId: string;
    newPlan: Exclude<PlanName, 'free'>;
    subscriptionId: string;
    providerPaymentId: string;
    reason: string;
  }) {
    const user = await this.userRepository.findById(params.userId);
    if (!user) {
      throw new Error('User not found while activating plan.');
    }

    const now = new Date();
    const endsAt = new Date(now.getTime() + PAID_PERIOD_DAYS * 24 * 60 * 60 * 1000);
    const fromPlan = user.subscriptionPlan || 'free';

    if (fromPlan !== params.newPlan) {
      await this.subscriptionRepository.insertHistory({
        userId: params.userId,
        fromPlan,
        toPlan: params.newPlan,
        changedAt: now,
        reason: params.reason,
      });
    }

    await this.userRepository.update(params.userId, {
      previousPlan: fromPlan === params.newPlan ? user.previousPlan : fromPlan,
      subscriptionPlan: params.newPlan,
      subscriptionStatus: 'active',
      isPaid: true,
      planChangedAt: now,
      currentPeriodEnd: endsAt,
    });

    await this.subscriptionRepository.update(params.subscriptionId, {
      status: 'active',
      providerPaymentId: params.providerPaymentId,
      startedAt: now,
      endsAt,
    });

    const updated = await this.userRepository.findById(params.userId);
    return { user: updated, endsAt };
  }

  async getHistory(userId: string) {
    return this.subscriptionRepository.listHistory(userId);
  }

  async getSubscriptions(userId: string) {
    return this.subscriptionRepository.listForUser(userId);
  }
}
