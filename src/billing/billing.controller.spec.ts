import { BillingController } from './billing.controller';
import { PLAN_LIMITS } from '../common/plan-policy';

describe('BillingController', () => {
  let controller: BillingController;
  let mockPaymentsService: any;
  let mockSubscriptionService: any;
  let mockQuotaService: any;

  beforeEach(() => {
    mockPaymentsService = {
      createCheckout: jest.fn(),
      verifyCheckout: jest.fn(),
    };
    mockSubscriptionService = {
      getHistory: jest.fn().mockResolvedValue([]),
    };
    mockQuotaService = {
      loadFreshQuota: jest.fn(),
      commentLimitFor: jest.fn().mockReturnValue(2),
    };
    controller = new BillingController(
      mockPaymentsService,
      mockSubscriptionService,
      mockQuotaService,
    );
  });

  describe('getPlans', () => {
    it('returns payment plans and endpoints', async () => {
      const plans = await controller.getPlans();
      expect(plans.checkoutEndpoint).toBe('/payments/checkout');
      expect(plans.verifyEndpoint).toBe('/payments/verify');
      expect(plans.plans.length).toBeGreaterThan(0);
      expect(plans.plans[0].limits).toBeDefined();
    });
  });

  describe('me', () => {
    it('returns free plan with message & audition application quotas', async () => {
      mockQuotaService.loadFreshQuota.mockResolvedValue({
        isPaidActive: false,
        plan: 'free',
        limits: PLAN_LIMITS.free,
        user: {
          subscriptionStatus: 'inactive',
          currentPeriodEnd: null,
          previousPlan: null,
          planChangedAt: null,
          likesUsedToday: 5,
          commentsUsedToday: 0,
          profileViewsUsedToday: 2,
          scrollProfilesUsedToday: 10,
          messagesUsedToday: 3,
          auditionApplicationsUsedToday: 1,
        },
      });

      const res = await controller.me({ sub: 'user-1' });
      expect(res.plan).toBe('free');
      expect(res.isPaid).toBe(false);
      expect(res.limits.messagesPerDay).toBe(5);
      expect(res.limits.auditionApplicationsPerDay).toBe(1);
      expect(res.usedToday.messages).toBe(3);
      expect(res.usedToday.auditionApplications).toBe(1);
      expect(res.remainingToday.messages).toBe(2);
      expect(res.remainingToday.auditionApplications).toBe(0);
      expect(res.paymentOptions.recommendedPlan).toBe('pro');
    });

    it('returns upgraded pro plan with higher limits and access', async () => {
      mockQuotaService.loadFreshQuota.mockResolvedValue({
        isPaidActive: true,
        plan: 'pro',
        limits: PLAN_LIMITS.pro,
        user: {
          subscriptionStatus: 'active',
          currentPeriodEnd: new Date(Date.now() + 86400000),
          previousPlan: 'free',
          planChangedAt: new Date(),
          likesUsedToday: 20,
          commentsUsedToday: 2,
          profileViewsUsedToday: 5,
          scrollProfilesUsedToday: 20,
          messagesUsedToday: 5,
          auditionApplicationsUsedToday: 1,
        },
      });

      const res = await controller.me({ sub: 'user-1' });
      expect(res.plan).toBe('pro');
      expect(res.isPaid).toBe(true);
      expect(res.limits.likesPerDay).toBe(200);
      expect(res.limits.profileViewsPerDay).toBe(100);
      expect(res.limits.messagesPerDay).toBe(50);
      expect(res.limits.auditionApplicationsPerDay).toBe(10);
      // User can do more than free limit now!
      expect(res.remainingToday.likes).toBe(180);
      expect(res.remainingToday.profileViews).toBe(95);
      expect(res.remainingToday.messages).toBe(45);
      expect(res.remainingToday.auditionApplications).toBe(9);
      expect(res.paymentOptions.recommendedPlan).toBe('pro_max');
    });
  });
});
