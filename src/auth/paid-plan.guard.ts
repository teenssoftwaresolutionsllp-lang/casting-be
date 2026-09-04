import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRepository } from '../users/user.repository';
import { QuotaService } from '../users/quota.service';
import { PlanName, getPaymentOptions } from '../common/plan-policy';
import { REQUIRE_PLAN_KEY } from './require-plan.decorator';

/**
 * Use this guard on routes that only paying users should hit.
 *
 * Example:
 *   @RequirePlan('pro')
 *   @UseGuards(JwtAuthGuard, PaidPlanGuard)
 *   @Get('something-premium')
 *
 * It reads the user from the DATABASE, not from the JWT "isPaid" field.
 * A fake JWT claim cannot open the door.
 */
@Injectable()
export class PaidPlanGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly userRepository: UserRepository,
    private readonly quotaService: QuotaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub;
    if (!userId) {
      throw new ForbiddenException('Not logged in.');
    }

    const needed = this.reflector.getAllAndOverride<PlanName>(REQUIRE_PLAN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) || 'pro';

    const dbUser = await this.userRepository.findById(userId);
    if (!dbUser) {
      throw new ForbiddenException('User not found.');
    }

    const snapshot = await this.quotaService.loadFreshQuota(userId);
    if (!snapshot.isPaidActive) {
      throw new ForbiddenException({
        paywall: true,
        message: 'Free limit reached. Upgrade to continue.',
        remaining: 0,
        paymentOptions: getPaymentOptions(snapshot.plan),
      });
    }

    if (needed === 'pro_max' && snapshot.plan !== 'pro_max') {
      throw new ForbiddenException({
        paywall: true,
        message: 'This feature needs Pro Max. Upgrade to continue.',
        remaining: 0,
        paymentOptions: getPaymentOptions(snapshot.plan),
      });
    }

    request.quota = snapshot;
    return true;
  }
}
