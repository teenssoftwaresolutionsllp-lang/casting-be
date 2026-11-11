import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { VideoService } from './video.service';

describe('VideoService', () => {
  let service: VideoService;
  let repository: {
    findAllWithUserLike: jest.Mock;
    findById: jest.Mock;
    deleteByIdAndCreator: jest.Mock;
    hasLiked: jest.Mock;
    addLike: jest.Mock;
    removeLike: jest.Mock;
    createComment: jest.Mock;
  };
  let notificationService: {
    createNotification: jest.Mock;
  };
  let s3: {
    upload: jest.Mock;
    delete: jest.Mock;
    getUrl: jest.Mock;
    resolveUrl: jest.Mock;
    isS3Key: jest.Mock;
  };

  beforeEach(() => {
    repository = {
      findAllWithUserLike: jest.fn().mockResolvedValue([]),
      findById: jest.fn(),
      deleteByIdAndCreator: jest.fn(),
      hasLiked: jest.fn(),
      addLike: jest.fn(),
      removeLike: jest.fn(),
      createComment: jest.fn(),
    };
    notificationService = {
      createNotification: jest.fn().mockResolvedValue({}),
    };
    s3 = {
      upload: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
      getUrl: jest.fn().mockImplementation(async (k) => `https://s3.example.com/${k}`),
      resolveUrl: jest.fn().mockImplementation(async (k) => (k ? `https://s3.example.com/${k}` : null)),
      isS3Key: jest.fn().mockImplementation((k) => Boolean(k && !k.startsWith('http'))),
    };
    service = new VideoService(repository as any, notificationService as any, s3 as any);
  });

  it('paginates the video feed using the requested limit and offset', async () => {
    await expect(
      service.findAll('viewer-id', undefined, { limit: 4, offset: 8 }),
    ).resolves.toEqual([]);

    expect(repository.findAllWithUserLike).toHaveBeenCalledWith(
      'viewer-id',
      undefined,
      { limit: 4, offset: 8 },
      true,
    );
  });

  it('keeps photo posts available to the dedicated photos feed', async () => {
    await service.findAll('viewer-id', 'Photos', undefined, false);

    expect(repository.findAllWithUserLike).toHaveBeenCalledWith(
      'viewer-id',
      'Photos',
      undefined,
      false,
    );
  });

  it('rejects invalid video feed pagination values', async () => {
    await expect(
      service.findAll('viewer-id', undefined, { limit: 0, offset: 0 }),
    ).rejects.toThrow('limit must be between 1 and 100');
    await expect(
      service.findAll('viewer-id', undefined, { limit: 4, offset: -1 }),
    ).rejects.toThrow('limit must be between 1 and 100');
    await expect(
      service.findAll('viewer-id', undefined, { limit: 101, offset: 0 }),
    ).rejects.toThrow('limit must be between 1 and 100');
  });

  it('allows the post creator to delete a video or photo post', async () => {
    repository.findById.mockResolvedValue({ creatorId: 'owner-id', url: 'videos/v1.mp4', thumb: 'videos/v1.mp4' });
    repository.deleteByIdAndCreator.mockResolvedValue(true);

    await expect(service.deleteVideo('post-id', 'owner-id')).resolves.toEqual({ deleted: true });
    expect(repository.deleteByIdAndCreator).toHaveBeenCalledWith('post-id', 'owner-id');
    expect(s3.delete).toHaveBeenCalledWith('videos/v1.mp4');
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

  it('notifies the post owner when a new like is added', async () => {
    repository.findById.mockResolvedValue({
      creatorId: 'owner-id',
      likesCount: 4,
    });
    repository.hasLiked.mockResolvedValue(false);
    repository.addLike.mockResolvedValue(true);

    await expect(service.toggleLikeVideo('post-id', 'actor-id')).resolves.toEqual({
      liked: true,
      likesCount: 5,
    });
    expect(repository.addLike).toHaveBeenCalledWith('post-id', 'actor-id');
    expect(notificationService.createNotification).toHaveBeenCalledWith(
      'owner-id',
      'New like',
      'Someone liked your post.',
      {
        actorId: 'actor-id',
        type: 'POST_LIKED',
        entityType: 'VIDEO',
        entityId: 'post-id',
      },
    );
  });

  it('does not notify for an unlike', async () => {
    repository.findById.mockResolvedValue({
      creatorId: 'owner-id',
      likesCount: 1,
    });
    repository.hasLiked.mockResolvedValue(true);

    await service.toggleLikeVideo('post-id', 'actor-id');

    expect(repository.addLike).not.toHaveBeenCalled();
  });

  it('notifies the post owner when a comment is created', async () => {
    repository.findById.mockResolvedValue({ creatorId: 'owner-id' });
    repository.createComment.mockResolvedValue({ id: 'comment-id' });

    await service.postComment('post-id', 'actor-id', { text: 'Nice work' });

    expect(repository.createComment).toHaveBeenCalledWith({
      videoId: 'post-id',
      userId: 'actor-id',
      text: 'Nice work',
    });
    expect(notificationService.createNotification).toHaveBeenCalledWith(
      'owner-id',
      'New comment',
      'Someone commented on your post.',
      {
        actorId: 'actor-id',
        type: 'POST_COMMENTED',
        entityType: 'VIDEO',
        entityId: 'post-id',
      },
    );
  });

  it('does not notify when a concurrent like was already inserted', async () => {
    repository.findById.mockResolvedValue({
      creatorId: 'owner-id',
      likesCount: 4,
    });
    repository.hasLiked.mockResolvedValue(false);
    repository.addLike.mockResolvedValue(false);

    await expect(service.toggleLikeVideo('post-id', 'actor-id')).resolves.toEqual({
      liked: true,
      likesCount: 4,
    });
    expect(repository.addLike).toHaveBeenCalledWith('post-id', 'actor-id');
    expect(notificationService.createNotification).not.toHaveBeenCalled();
  });
});
