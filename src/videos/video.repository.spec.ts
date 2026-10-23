import { VideoRepository } from './video.repository';

describe('VideoRepository notifications', () => {
  it('commits a new post like, counter update, and notification in one transaction', async () => {
    const likeInsert = {
      values: jest.fn().mockReturnThis(),
      onConflictDoNothing: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{ userId: 'actor-id' }]),
    };
    const notificationInsert = {
      values: jest.fn().mockResolvedValue(undefined),
    };
    const update = {
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue(undefined),
    };
    const transaction = {
      insert: jest
        .fn()
        .mockReturnValueOnce(likeInsert)
        .mockReturnValueOnce(notificationInsert),
      update: jest.fn().mockReturnValue(update),
    };
    const db = {
      transaction: jest.fn(async (callback) => callback(transaction)),
    };
    const repository = new VideoRepository(db as any);
    const notification = {
      userId: 'owner-id',
      actorId: 'actor-id',
      type: 'POST_LIKED',
      title: 'New like',
      text: 'Someone liked your post.',
      entityType: 'VIDEO',
      entityId: 'post-id',
    };

    await expect(
      repository.addLike('post-id', 'actor-id', notification),
    ).resolves.toBe(true);

    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(likeInsert.onConflictDoNothing).toHaveBeenCalledTimes(1);
    expect(transaction.insert).toHaveBeenCalledTimes(2);
    expect(notificationInsert.values).toHaveBeenCalledWith(notification);
    expect(transaction.update).toHaveBeenCalledTimes(1);
  });

  it('does not notify or increment the counter when a like already exists', async () => {
    const likeInsert = {
      values: jest.fn().mockReturnThis(),
      onConflictDoNothing: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([]),
    };
    const transaction = {
      insert: jest.fn().mockReturnValue(likeInsert),
      update: jest.fn(),
    };
    const repository = new VideoRepository({
      transaction: jest.fn(async (callback) => callback(transaction)),
    } as any);

    await expect(
      repository.addLike('post-id', 'actor-id', {
        userId: 'owner-id',
        actorId: 'actor-id',
        type: 'POST_LIKED',
        title: 'New like',
        text: 'Someone liked your post.',
      }),
    ).resolves.toBe(false);

    expect(transaction.insert).toHaveBeenCalledTimes(1);
    expect(transaction.update).not.toHaveBeenCalled();
  });

  it('does not notify the owner for a like on their own post', async () => {
    const likeInsert = {
      values: jest.fn().mockReturnThis(),
      onConflictDoNothing: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{ userId: 'owner-id' }]),
    };
    const update = {
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue(undefined),
    };
    const transaction = {
      insert: jest.fn().mockReturnValueOnce(likeInsert),
      update: jest.fn().mockReturnValue(update),
    };
    const repository = new VideoRepository({
      transaction: jest.fn(async (callback) => callback(transaction)),
    } as any);

    await expect(
      repository.addLike('post-id', 'owner-id', {
        userId: 'owner-id',
        actorId: 'owner-id',
        type: 'POST_LIKED',
        title: 'New like',
        text: 'Someone liked your post.',
      }),
    ).resolves.toBe(true);

    expect(transaction.insert).toHaveBeenCalledTimes(1);
  });
});
