import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { StoriesService } from './stories.service';

describe('StoriesService', () => {
  let service: StoriesService;
  let repository: {
    create: jest.Mock;
    getFeed: jest.Mock;
    findById: jest.Mock;
    markViewed: jest.Mock;
    deleteById: jest.Mock;
  };
  let mediaService: { uploadFile: jest.Mock };

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      getFeed: jest.fn(),
      findById: jest.fn(),
      markViewed: jest.fn(),
      deleteById: jest.fn(),
    };
    mediaService = { uploadFile: jest.fn().mockResolvedValue('https://cdn.example/story.jpg') };
    service = new StoriesService(repository as any, mediaService as any);
  });

  it('uploads image stories and assigns a 24-hour expiration', async () => {
    const file = { mimetype: 'image/jpeg' } as Express.Multer.File;
    const now = Date.now();
    repository.create.mockImplementation(async (story) => story);

    const result = await service.create('creator-id', file);

    expect(mediaService.uploadFile).toHaveBeenCalledWith(file, 'stories');
    expect(result.creatorId).toBe('creator-id');
    expect(result.mediaType).toBe('image');
    expect(result.mediaUrl).toBe('https://cdn.example/story.jpg');
    expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(now + 24 * 60 * 60 * 1000);
    expect(result.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 24 * 60 * 60 * 1000);
  });

  it('identifies video uploads and clamps feed pagination', async () => {
    repository.create.mockImplementation(async (story) => story);
    repository.getFeed.mockResolvedValue({ stories: [], pagination: {} });

    await service.create('creator-id', { mimetype: 'video/mp4' } as Express.Multer.File);
    await service.getFeed('viewer-id', 500, -4);

    expect(repository.create.mock.calls[0][0].mediaType).toBe('video');
    expect(repository.getFeed).toHaveBeenCalledWith('viewer-id', 50, 0);
  });

  it('marks an active story as viewed', async () => {
    repository.findById.mockResolvedValue({ expiresAt: new Date(Date.now() + 60_000) });

    await expect(service.markViewed('story-id', 'viewer-id')).resolves.toEqual({ viewed: true });
    expect(repository.markViewed).toHaveBeenCalledWith('story-id', 'viewer-id');
  });

  it('rejects missing or expired stories when marking them viewed', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.markViewed('missing', 'viewer-id')).rejects.toBeInstanceOf(NotFoundException);

    repository.findById.mockResolvedValue({ expiresAt: new Date(Date.now() - 1) });
    await expect(service.markViewed('expired', 'viewer-id')).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.markViewed).not.toHaveBeenCalled();
  });

  it('allows only the story owner to delete a story', async () => {
    repository.findById.mockResolvedValue({ creatorId: 'other-user' });
    await expect(service.delete('story-id', 'viewer-id')).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.deleteById).not.toHaveBeenCalled();

    repository.findById.mockResolvedValue({ creatorId: 'owner-id' });
    await expect(service.delete('story-id', 'owner-id')).resolves.toEqual({ deleted: true });
    expect(repository.deleteById).toHaveBeenCalledWith('story-id');
  });
});
