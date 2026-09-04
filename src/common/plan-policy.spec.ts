import {
  PLAN_LIMITS,
  PLAN_PRICES,
  PAID_PERIOD_DAYS,
  getFreeCommentLimit,
  getPaymentOptions,
  isPaidPlan,
  parsePlanName,
} from './plan-policy';

describe('Plan Policy', () => {
  describe('PLAN_LIMITS', () => {
    it('defines limits for free, pro, and pro_max', () => {
      expect(PLAN_LIMITS.free).toEqual({
        likesPerDay: 20,
        commentsPerDay: 2,
        profileViewsPerDay: 5,
        profileScrollsPerDay: 20,
        messagesPerDay: 5,
        auditionApplicationsPerDay: 1,
      });

      expect(PLAN_LIMITS.pro).toEqual({
        likesPerDay: 200,
        commentsPerDay: 30,
        profileViewsPerDay: 100,
        profileScrollsPerDay: 100,
        messagesPerDay: 50,
        auditionApplicationsPerDay: 10,
      });

      expect(PLAN_LIMITS.pro_max).toEqual({
        likesPerDay: 500,
        commentsPerDay: 100,
        profileViewsPerDay: 500,
        profileScrollsPerDay: 500,
        messagesPerDay: 500,
        auditionApplicationsPerDay: 50,
      });
    });
  });

  describe('getPaymentOptions', () => {
    it('returns available payment plans, pricing, endpoints and recommended plan', () => {
      const freeOptions = getPaymentOptions('free');
      expect(freeOptions.checkoutEndpoint).toBe('/payments/checkout');
      expect(freeOptions.verifyEndpoint).toBe('/payments/verify');
      expect(freeOptions.recommendedPlan).toBe('pro');
      expect(freeOptions.plans).toHaveLength(2);

      const proPlan = freeOptions.plans.find((p) => p.plan === 'pro')!;
      expect(proPlan.amountPaise).toBe(49900);
      expect(proPlan.amountRupees).toBe(499);
      expect(proPlan.limits.messagesPerDay).toBe(50);
      expect(proPlan.limits.auditionApplicationsPerDay).toBe(10);

      const proOptions = getPaymentOptions('pro');
      expect(proOptions.recommendedPlan).toBe('pro_max');
    });
  });

  describe('parsePlanName', () => {
    it('parses valid plans or defaults to free', () => {
      expect(parsePlanName('pro')).toBe('pro');
      expect(parsePlanName('pro_max')).toBe('pro_max');
      expect(parsePlanName('free')).toBe('free');
      expect(parsePlanName('invalid')).toBe('free');
      expect(parsePlanName(null)).toBe('free');
    });
  });

  describe('isPaidPlan', () => {
    it('correctly identifies paid plans', () => {
      expect(isPaidPlan('pro')).toBe(true);
      expect(isPaidPlan('pro_max')).toBe(true);
      expect(isPaidPlan('free')).toBe(false);
    });
  });

  describe('getFreeCommentLimit', () => {
    it('unlocks 2 comments after 20 likes', () => {
      expect(getFreeCommentLimit(0)).toBe(0);
      expect(getFreeCommentLimit(19)).toBe(0);
      expect(getFreeCommentLimit(20)).toBe(2);
      expect(getFreeCommentLimit(40)).toBe(2);
    });
  });
});
