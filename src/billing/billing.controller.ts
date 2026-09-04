import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PaymentsService } from './payments.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { SubscriptionService } from './subscription.service';
import { QuotaService } from '../users/quota.service';
import { getFreeCommentLimit, getPaymentOptions } from '../common/plan-policy';

@ApiTags('03 Billing & Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class BillingController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly subscriptionService: SubscriptionService,
    private readonly quotaService: QuotaService,
  ) {}

  @Get('payments/plans')
  @ApiOperation({ summary: 'List available payment/upgrade plans, pricing, and limits' })
  async getPlans() {
    return getPaymentOptions();
  }

  @Post('payments/checkout')
  @ApiOperation({ summary: 'Create a Razorpay order. User is not marked paid yet.' })
  async checkout(@CurrentUser() user: { sub: string }, @Body() dto: CreateCheckoutDto) {
    return this.paymentsService.createCheckout(user.sub, dto.plan);
  }

  @Post('payments/verify')
  @ApiOperation({ summary: 'Verify Razorpay payment on the server, then activate the plan.' })
  async verify(@CurrentUser() user: { sub: string }, @Body() dto: VerifyPaymentDto) {
    return this.paymentsService.verifyCheckout(user.sub, dto);
  }

  @Get('subscriptions/me')
  @ApiOperation({ summary: 'Current plan, remaining daily quota, payment options, and plan history. Always from the database.' })
  async me(@CurrentUser() user: { sub: string }) {
    const snapshot = await this.quotaService.loadFreshQuota(user.sub);
    const history = await this.subscriptionService.getHistory(user.sub);
    const commentLimit = this.quotaService.commentLimitFor(snapshot);

    return {
      isPaid: snapshot.isPaidActive,
      plan: snapshot.plan,
      subscriptionStatus: snapshot.user.subscriptionStatus,
      currentPeriodEnd: snapshot.user.currentPeriodEnd,
      previousPlan: snapshot.user.previousPlan,
      planChangedAt: snapshot.user.planChangedAt,
      limits: snapshot.limits,
      usedToday: {
        likes: snapshot.user.likesUsedToday,
        comments: snapshot.user.commentsUsedToday,
        profileViews: snapshot.user.profileViewsUsedToday,
        scrollProfiles: snapshot.user.scrollProfilesUsedToday,
        messages: snapshot.user.messagesUsedToday ?? 0,
        auditionApplications: snapshot.user.auditionApplicationsUsedToday ?? 0,
      },
      remainingToday: {
        likes: Math.max(0, snapshot.limits.likesPerDay - snapshot.user.likesUsedToday),
        comments: Math.max(0, commentLimit - snapshot.user.commentsUsedToday),
        profileViews: Math.max(0, snapshot.limits.profileViewsPerDay - snapshot.user.profileViewsUsedToday),
        scrollProfiles: Math.max(0, snapshot.limits.profileScrollsPerDay - snapshot.user.scrollProfilesUsedToday),
        messages: Math.max(0, snapshot.limits.messagesPerDay - (snapshot.user.messagesUsedToday ?? 0)),
        auditionApplications: Math.max(0, snapshot.limits.auditionApplicationsPerDay - (snapshot.user.auditionApplicationsUsedToday ?? 0)),
      },
      paymentOptions: getPaymentOptions(snapshot.plan),
      freeCommentRule:
        snapshot.plan === 'free'
          ? {
              likesNeededForComments: 20,
              commentsUnlocked: getFreeCommentLimit(snapshot.user.likesUsedToday),
            }
          : null,
      history,
    };
  }
}
