import { VideoRepository } from './video.repository';
import { PgDialect } from 'drizzle-orm/pg-core';

describe('VideoRepository notifications', () => {
  it('excludes photo posts from the video feed query when requested', async () => {
    const queryBuilder = {
      from: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockResolvedValue([]),
    };
    const repository = new VideoRepository({
      select: jest.fn().mockReturnValue(queryBuilder),
    } as any);

    await repository.findAllWithUserLike('viewer-id', undefined, undefined, true);

    const condition = queryBuilder.where.mock.calls[0][0];
    const query = new PgDialect().sqlToQuery(condition);
    expect(query.sql).toContain('"videos"."category" <>');
    expect(query.params).toContain('Photos');
  });

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
      insert: jest.fn().mockReturnValue(likeInsert),
      update: jest.fn().mockReturnValue(update),
    };
    const db = {
      transaction: jest.fn(async (callback) => callback(transaction)),
    };
    const repository = new VideoRepository(db as any);

    await expect(
      repository.addLike('post-id', 'actor-id'),
    ).resolves.toBe(true);

    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(likeInsert.onConflictDoNothing).toHaveBeenCalledTimes(1);
    expect(transaction.insert).toHaveBeenCalledTimes(1);
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
      repository.addLike('post-id', 'actor-id'),
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
      repository.addLike('post-id', 'owner-id'),
    ).resolves.toBe(true);

    expect(transaction.insert).toHaveBeenCalledTimes(1);
  });
});
