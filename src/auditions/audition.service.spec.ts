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
    service = new AuditionService(auditionRepository as any, {} as any);
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
