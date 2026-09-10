import { Module } from '@nestjs/common';
import { UserModule } from '../users/user.module';
import { BillingController } from './billing.controller';
import { PaymentsService } from './payments.service';
import { RazorpayClient } from './razorpay.client';
import { SubscriptionRepository } from './subscription.repository';
import { SubscriptionService } from './subscription.service';
import { PaidPlanGuard } from '../auth/paid-plan.guard';

@Module({
  imports: [UserModule],
  controllers: [BillingController],
  providers: [RazorpayClient, PaymentsService, SubscriptionRepository, SubscriptionService, PaidPlanGuard],
  exports: [SubscriptionService, SubscriptionRepository, PaidPlanGuard],
})
export class BillingModule {}
