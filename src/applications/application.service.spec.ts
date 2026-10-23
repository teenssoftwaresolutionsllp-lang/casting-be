import { BadRequestException } from '@nestjs/common';
import { ApplicationService } from './application.service';

describe('ApplicationService notifications', () => {
  let service: ApplicationService;
  let applicationRepository: {
    findByAuditionAndApplicant: jest.Mock;
    create: jest.Mock;
  };
  let auditionRepository: { findById: jest.Mock };

  beforeEach(() => {
    applicationRepository = {
      findByAuditionAndApplicant: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'application-id' }),
    };
    auditionRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'audition-id',
        creatorId: 'publisher-id',
        title: 'Feature Film',
      }),
    };
    service = new ApplicationService(
      applicationRepository as any,
      auditionRepository as any,
    );
  });

  it('notifies the publisher when a new application is submitted', async () => {
    await expect(
      service.apply('audition-id', 'applicant-id', { coverLetter: 'My experience' }),
    ).resolves.toEqual({ id: 'application-id' });

    expect(applicationRepository.create).toHaveBeenCalledWith(
      {
        auditionId: 'audition-id',
        applicantId: 'applicant-id',
        coverLetter: 'My experience',
      },
      {
        userId: 'publisher-id',
        actorId: 'applicant-id',
        type: 'AUDITION_APPLIED',
        title: 'New audition application',
        text: 'Someone applied for "Feature Film".',
        entityType: 'AUDITION',
        entityId: 'audition-id',
      },
    );
  });

  it('does not create an application or notification for the audition publisher', async () => {
    await expect(
      service.apply('audition-id', 'publisher-id', { coverLetter: 'My experience' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(applicationRepository.create).not.toHaveBeenCalled();
  });

  it('does not create a second notification for a duplicate application', async () => {
    applicationRepository.findByAuditionAndApplicant.mockResolvedValue({
      id: 'existing-application',
    });

    await expect(
      service.apply('audition-id', 'applicant-id', { coverLetter: 'My experience' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(applicationRepository.create).not.toHaveBeenCalled();
  });
});
