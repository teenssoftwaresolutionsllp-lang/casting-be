import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { VideoService } from './video.service';

describe('VideoService', () => {
  let service: VideoService;
  let repository: {
    findById: jest.Mock;
    deleteByIdAndCreator: jest.Mock;
  };

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      deleteByIdAndCreator: jest.fn(),
    };
    service = new VideoService(repository as any);
  });

  it('allows the post creator to delete a video or photo post', async () => {
    repository.findById.mockResolvedValue({ creatorId: 'owner-id' });
    repository.deleteByIdAndCreator.mockResolvedValue(true);

    await expect(service.deleteVideo('post-id', 'owner-id')).resolves.toEqual({ deleted: true });
    expect(repository.deleteByIdAndCreator).toHaveBeenCalledWith('post-id', 'owner-id');
  });

  it('prevents anyone other than the creator from deleting a post', async () => {
    repository.findById.mockResolvedValue({ creatorId: 'owner-id' });

    await expect(service.deleteVideo('post-id', 'other-user')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repository.deleteByIdAndCreator).not.toHaveBeenCalled();
  });

  it('returns not found for a missing post', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.deleteVideo('missing-id', 'user-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.deleteByIdAndCreator).not.toHaveBeenCalled();
  });
});
