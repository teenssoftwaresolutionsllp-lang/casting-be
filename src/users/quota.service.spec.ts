import { ForbiddenException } from '@nestjs/common';
import { QuotaService } from './quota.service';

describe('QuotaService', () => {
  let service: QuotaService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      transaction: jest.fn(),
      update: jest.fn(),
    };
    service = new QuotaService(mockDb);
  });

  describe('paywall & throwPaywall', () => {
    it('returns paywall payload containing paymentOptions', () => {
      const result = service.paywall('Daily message limit reached.', 'free');
      expect(result.paywall).toBe(true);
      expect(result.message).toBe('Daily message limit reached.');
      expect(result.remaining).toBe(0);
      expect(result.paymentOptions).toBeDefined();
      expect(result.paymentOptions.checkoutEndpoint).toBe('/payments/checkout');
      expect(result.paymentOptions.recommendedPlan).toBe('pro');
    });

    it('throws ForbiddenException containing paymentOptions on throwPaywall', () => {
      expect.assertions(4);
      try {
        service.throwPaywall('Daily audition application limit reached.', 'pro');
      } catch (err: any) {
        expect(err).toBeInstanceOf(ForbiddenException);
        const response = err.getResponse();
        expect(response.paywall).toBe(true);
        expect(response.paymentOptions.recommendedPlan).toBe('pro_max');
        expect(response.message).toBe('Daily audition application limit reached.');
      }
    });
  });

  describe('tryConsumeMessage', () => {
    it('returns true when increment succeeds within limit', async () => {
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ messagesUsedToday: 1 }]),
          }),
        }),
      });

      const result = await service.tryConsumeMessage('user-1', 5);
      expect(result).toBe(true);
    });

    it('returns false when quota is exhausted', async () => {
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await service.tryConsumeMessage('user-1', 5);
      expect(result).toBe(false);
    });
  });

  describe('tryConsumeAuditionApplication', () => {
    it('returns true when increment succeeds within limit', async () => {
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ auditionApplicationsUsedToday: 1 }]),
          }),
        }),
      });

      const result = await service.tryConsumeAuditionApplication('user-1', 1);
      expect(result).toBe(true);
    });

    it('returns false when quota is exhausted', async () => {
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await service.tryConsumeAuditionApplication('user-1', 1);
      expect(result).toBe(false);
    });
  });

  describe('hasActivePaidPeriod', () => {
    it('returns true for active paid user within period', () => {
      const future = new Date(Date.now() + 100000);
      const user: any = {
        isPaid: true,
        subscriptionStatus: 'active',
        currentPeriodEnd: future,
      };
      expect(service.hasActivePaidPeriod(user)).toBe(true);
    });

    it('returns false if currentPeriodEnd is in past', () => {
      const past = new Date(Date.now() - 100000);
      const user: any = {
        isPaid: true,
        subscriptionStatus: 'active',
        currentPeriodEnd: past,
      };
      expect(service.hasActivePaidPeriod(user)).toBe(false);
    });
  });
});
