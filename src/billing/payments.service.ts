import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from '../users/user.repository';
import { SubscriptionRepository } from './subscription.repository';
import { SubscriptionService } from './subscription.service';
import { RazorpayClient } from './razorpay.client';
import { PLAN_PRICES, isPaidPlan } from '../common/plan-policy';
import { QuotaService } from '../users/quota.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly razorpay: RazorpayClient,
    private readonly userRepository: UserRepository,
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly subscriptionService: SubscriptionService,
    private readonly quotaService: QuotaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Start checkout.
   * We create a Razorpay order AND a local subscription row with status = created.
   * The user is NOT marked paid yet.
   */
  async createCheckout(userId: string, plan: 'pro' | 'pro_max') {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found.');
    }

    const snapshot = await this.quotaService.loadFreshQuota(userId);
    if (snapshot.plan === plan && snapshot.isPaidActive) {
      throw new BadRequestException(`You already have an active ${plan} plan.`);
    }

    // Pro Max is higher than Pro. Going backwards (Pro Max -> Pro) is not allowed here.
    if (snapshot.plan === 'pro_max' && plan === 'pro' && snapshot.isPaidActive) {
      throw new ForbiddenException('You are already on Pro Max. A lower plan is not sold here.');
    }

    const price = PLAN_PRICES[plan];
    const order = await this.razorpay.createOrder({
      amountPaise: price.amountPaise,
      currency: price.currency,
      receipt: `u_${userId.slice(0, 8)}_${Date.now()}`.slice(0, 40),
      notes: {
        userId,
        plan,
      },
    });

    const subscription = await this.subscriptionRepository.create({
      userId,
      plan,
      status: 'created',
      amount: price.amountPaise,
      currency: price.currency,
      provider: 'razorpay',
      providerSubscriptionId: order.id,
    });

    return {
      keyId: this.razorpay.getPublicKeyId(),
      orderId: order.id,
      amount: price.amountPaise,
      currency: price.currency,
      plan,
      subscriptionId: subscription.id,
      // The app uses these fields to open the Razorpay checkout UI.
    };
  }

  /**
   * Finish checkout.
   * We do NOT trust "payment ok" from the phone.
   * We check: signature, Razorpay payment status, order notes (user + plan), amount.
   */
  async verifyCheckout(
    userId: string,
    dto: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string },
  ) {
    const signatureOk = this.razorpay.verifyCheckoutSignature(
      dto.razorpayOrderId,
      dto.razorpayPaymentId,
      dto.razorpaySignature,
    );
    if (!signatureOk) {
      throw new ForbiddenException('Payment signature is not valid. Plan was not activated.');
    }

    const already = await this.subscriptionRepository.findByProviderPaymentId(dto.razorpayPaymentId);
    if (already && already.status === 'active') {
      const user = await this.userRepository.findById(userId);
      return this.buildPaidResponse(user!, 'Payment was already verified.');
    }

    const local = await this.subscriptionRepository.findByProviderOrderId(dto.razorpayOrderId);
    if (!local || local.userId !== userId) {
      throw new ForbiddenException('This order does not belong to the logged-in user.');
    }

    const order = await this.razorpay.getOrder(dto.razorpayOrderId);
    const payment = await this.razorpay.getPayment(dto.razorpayPaymentId);

    if (payment.order_id !== dto.razorpayOrderId) {
      throw new ForbiddenException('Payment does not match this order.');
    }
    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      throw new ForbiddenException(`Payment is not complete (status: ${payment.status}).`);
    }

    const planFromNotes = order.notes?.plan;
    const userFromNotes = order.notes?.userId;
    if (userFromNotes !== userId) {
      throw new ForbiddenException('Order user does not match the logged-in user.');
    }
    if (!planFromNotes || !isPaidPlan(planFromNotes)) {
      throw new ForbiddenException('Order plan is missing or invalid.');
    }
    if (planFromNotes !== local.plan) {
      throw new ForbiddenException('Order plan does not match our database record.');
    }

    const expected = PLAN_PRICES[planFromNotes];
    if (Number(order.amount) !== expected.amountPaise || Number(payment.amount) !== expected.amountPaise) {
      throw new ForbiddenException('Paid amount does not match the plan price.');
    }

    const reason = local.plan === 'pro_max' ? 'upgrade' : 'payment_verified';
    const { user } = await this.subscriptionService.activatePaidPlan({
      userId,
      newPlan: planFromNotes,
      subscriptionId: local.id,
      providerPaymentId: dto.razorpayPaymentId,
      reason,
    });

    return this.buildPaidResponse(user!, 'Payment verified. Plan is now active.');
  }

  private async buildPaidResponse(user: NonNullable<Awaited<ReturnType<UserRepository['findById']>>>, message: string) {
    const token = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email || '',
      role: user.role,
      isPaid: user.isPaid,
      plan: user.subscriptionPlan,
    });

    return {
      message,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isPaid: user.isPaid,
        plan: user.subscriptionPlan,
        subscriptionStatus: user.subscriptionStatus,
        currentPeriodEnd: user.currentPeriodEnd,
        previousPlan: user.previousPlan,
      },
    };
  }
}
