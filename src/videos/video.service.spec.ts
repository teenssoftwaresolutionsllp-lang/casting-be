import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { VideoService } from './video.service';

describe('VideoService', () => {
  let service: VideoService;
  let repository: {
    findById: jest.Mock;
    deleteByIdAndCreator: jest.Mock;
    hasLiked: jest.Mock;
    addLike: jest.Mock;
    removeLike: jest.Mock;
    createComment: jest.Mock;
  };

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      deleteByIdAndCreator: jest.fn(),
      hasLiked: jest.fn(),
      addLike: jest.fn(),
      removeLike: jest.fn(),
      createComment: jest.fn(),
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
    expect(repository.addLike).toHaveBeenCalledWith('post-id', 'actor-id', {
      userId: 'owner-id',
      actorId: 'actor-id',
      type: 'POST_LIKED',
      title: 'New like',
      text: 'Someone liked your post.',
      entityType: 'VIDEO',
      entityId: 'post-id',
    });
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

    expect(repository.createComment).toHaveBeenCalledWith(
      { videoId: 'post-id', userId: 'actor-id', text: 'Nice work' },
      {
        userId: 'owner-id',
        actorId: 'actor-id',
        type: 'POST_COMMENTED',
        title: 'New comment',
        text: 'Someone commented on your post.',
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
    expect(repository.addLike).toHaveBeenCalledWith(
      'post-id',
      'actor-id',
      expect.objectContaining({ type: 'POST_LIKED' }),
    );
  });
});
