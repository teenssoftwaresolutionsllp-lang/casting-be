import { ForbiddenException } from '@nestjs/common';
import { AuditionService } from './audition.service';

describe('AuditionService status', () => {
  let service: AuditionService;
  let auditionRepository: {
    findById: jest.Mock;
    updateStatus: jest.Mock;
  };

  beforeEach(() => {
    auditionRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'audition-id',
        creatorId: 'creator-id',
      }),
      updateStatus: jest.fn((id: string, status: 'OPEN' | 'CLOSED') =>
        Promise.resolve({ id, status }),
      ),
    };
    service = new AuditionService(auditionRepository as any, {} as any, {} as any);
  });

  it('allows the audition creator to update its status', async () => {
    await expect(
            service.updateStatus('audition-id', 'creator-id', 'CLOSED'),
    ).resolves.toEqual({ id: 'audition-id', status: 'CLOSED' });

    expect(auditionRepository.updateStatus).toHaveBeenCalledWith(
      'audition-id',
      'CLOSED',
    );
  });

  it("allows an admin to update another creator's audition", async () => {
    await expect(
      service.updateStatus('audition-id', 'admin-id', 'OPEN', true),
    ).resolves.toEqual({ id: 'audition-id', status: 'OPEN' });
  });

  it('rejects status updates from users who do not own the audition', async () => {
    await expect(
      service.updateStatus('audition-id', 'other-user-id', 'CLOSED'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(auditionRepository.updateStatus).not.toHaveBeenCalled();
  });
});

describe('AuditionService public reads', () => {
  it('includes application counts in the creator posted audition list', async () => {
    const auditionRepository = {
      findMyPosted: jest.fn().mockResolvedValue([
        {
          id: 'audition-id',
          applicationCount: 4,
        },
      ]),
      getApplicantsForAuditionIds: jest.fn().mockResolvedValue({
        'audition-id': [{ id: 'application-id' }],
      }),
    };
    const service = new AuditionService(
      auditionRepository as any,
      {} as any,
      {} as any,
    );

    await expect(service.findMyPosted('creator-id')).resolves.toMatchObject([
      {
        id: 'audition-id',
        applicationCount: 4,
        applicants: [{ id: 'application-id' }],
      },
    ]);
  });

  it('returns the public audition listing without application state for anonymous visitors', async () => {
    const auditionRepository = {
      findAllWithUserApplication: jest.fn().mockResolvedValue([
        {
          id: 'audition-id',
          creatorId: 'creator-id',
          title: 'Casting call',
          applicationCount: 3,
          applicationId: null,
          applicationStatus: null,
        },
      ]),
    };
    const applicationRepository = {
      findByAuditionAndApplicant: jest.fn(),
    };
    const service = new AuditionService(
      auditionRepository as any,
      applicationRepository as any,
      { createNotification: jest.fn() } as any,
    );

    const result = await service.findAll(undefined);

    expect(result[0]).toMatchObject({
      id: 'audition-id',
      createdByMe: false,
      applied: false,
      applicationCount: 3,
      applicationStatus: null,
    });
    expect(auditionRepository.findAllWithUserApplication).toHaveBeenCalledWith(
      undefined,
      undefined,
    );
  });

  it('does not load application or applicant details for an anonymous audition detail read', async () => {
    const auditionRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'audition-id',
        creatorId: 'creator-id',
        applicationCount: 2,
      }),
      getApplicantsForAudition: jest.fn(),
    };
    const applicationRepository = {
      findByAuditionAndApplicant: jest.fn(),
    };
    const service = new AuditionService(
      auditionRepository as any,
      applicationRepository as any,
      { createNotification: jest.fn() } as any,
    );

    const result = await service.findOne('audition-id');

    expect(result).toMatchObject({
      createdByMe: false,
      applied: false,
      applicationCount: 2,
      applicationStatus: null,
      applicants: [],
    });
    expect(applicationRepository.findByAuditionAndApplicant).not.toHaveBeenCalled();
    expect(auditionRepository.getApplicantsForAudition).not.toHaveBeenCalled();
  });
});
