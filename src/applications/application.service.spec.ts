import { ApplicationService } from './application.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('ApplicationService', () => {
  let service: ApplicationService;
  let mockAppRepo: any;
  let mockAuditionRepo: any;
  let mockQuotaService: any;

  beforeEach(() => {
    mockAppRepo = {
      create: jest.fn(),
      findByAuditionAndApplicant: jest.fn(),
      findMyApplications: jest.fn(),
      findById: jest.fn(),
      delete: jest.fn(),
      updateStatus: jest.fn(),
    };
    mockAuditionRepo = {
      findById: jest.fn(),
    };
    mockQuotaService = {
      loadFreshQuota: jest.fn(),
      tryConsumeAuditionApplication: jest.fn(),
      throwPaywall: jest.fn().mockImplementation((msg, plan) => {
        throw new ForbiddenException({
          paywall: true,
          message: msg,
          remaining: 0,
        });
      }),
    };
    service = new ApplicationService(mockAppRepo, mockAuditionRepo, mockQuotaService);
  });

  describe('apply', () => {
    it('throws NotFoundException if audition does not exist', async () => {
      mockAuditionRepo.findById.mockResolvedValue(null);

      await expect(
        service.apply('aud-1', 'user-1', { coverLetter: 'Hello' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if user applies to their own audition', async () => {
      mockAuditionRepo.findById.mockResolvedValue({
        id: 'aud-1',
        creatorId: 'user-1',
      });

      await expect(
        service.apply('aud-1', 'user-1', { coverLetter: 'Hello' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if already applied', async () => {
      mockAuditionRepo.findById.mockResolvedValue({
        id: 'aud-1',
        creatorId: 'user-2',
      });
      mockAppRepo.findByAuditionAndApplicant.mockResolvedValue({
        id: 'app-existing',
      });

      await expect(
        service.apply('aud-1', 'user-1', { coverLetter: 'Hello' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('submits application successfully when quota is available', async () => {
      mockAuditionRepo.findById.mockResolvedValue({
        id: 'aud-1',
        creatorId: 'user-2',
      });
      mockAppRepo.findByAuditionAndApplicant.mockResolvedValue(null);
      mockQuotaService.loadFreshQuota.mockResolvedValue({
        plan: 'free',
        limits: { auditionApplicationsPerDay: 1 },
      });
      mockQuotaService.tryConsumeAuditionApplication.mockResolvedValue(true);
      mockAppRepo.create.mockResolvedValue({
        id: 'app-1',
        auditionId: 'aud-1',
        applicantId: 'user-1',
        coverLetter: 'Interested',
      });

      const res = await service.apply('aud-1', 'user-1', { coverLetter: 'Interested' });
      expect(res.id).toBe('app-1');
      expect(mockQuotaService.tryConsumeAuditionApplication).toHaveBeenCalledWith('user-1', 1);
      expect(mockAppRepo.create).toHaveBeenCalledWith({
        auditionId: 'aud-1',
        applicantId: 'user-1',
        coverLetter: 'Interested',
      });
    });

    it('throws paywall exception when audition application quota is exhausted', async () => {
      mockAuditionRepo.findById.mockResolvedValue({
        id: 'aud-1',
        creatorId: 'user-2',
      });
      mockAppRepo.findByAuditionAndApplicant.mockResolvedValue(null);
      mockQuotaService.loadFreshQuota.mockResolvedValue({
        plan: 'free',
        limits: { auditionApplicationsPerDay: 1 },
      });
      mockQuotaService.tryConsumeAuditionApplication.mockResolvedValue(false);

      await expect(
        service.apply('aud-1', 'user-1', { coverLetter: 'Interested' }),
      ).rejects.toThrow(ForbiddenException);

      expect(mockQuotaService.throwPaywall).toHaveBeenCalledWith(
        'Daily audition application limit reached. Upgrade to continue.',
        'free',
      );
      expect(mockAppRepo.create).not.toHaveBeenCalled();
    });
  });
});
