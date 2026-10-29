import { BadRequestException, NotFoundException } from '@nestjs/common';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let repository: {
    findByUserId: jest.Mock;
    countUnread: jest.Mock;
    create: jest.Mock;
    markAsRead: jest.Mock;
    markAllAsRead: jest.Mock;
    deleteOne: jest.Mock;
    deleteAll: jest.Mock;
  };
  let userRepository: {
    findById: jest.Mock;
  };

  beforeEach(() => {
    repository = {
      findByUserId: jest.fn().mockResolvedValue([]),
      countUnread: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      deleteOne: jest.fn(),
      deleteAll: jest.fn(),
    };
    userRepository = {
      findById: jest.fn().mockResolvedValue({ fullName: 'Jane Doe' }),
    };
    service = new NotificationService(repository as any, { sendToToken: jest.fn(), sendBatch: jest.fn() } as any, userRepository as any);
  });

  it('returns paginated notifications and unread count', async () => {
    repository.findByUserId.mockResolvedValue([
      {
        id: 'notification-id',
        type: 'POST_LIKED',
        title: 'New like',
        text: 'Someone liked your post.',
        actorId: 'actor-id',
        actorName: 'Actor',
        actorProfilePhoto: null,
        entityType: 'VIDEO',
        entityId: 'post-id',
        read: false,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]);
    repository.countUnread.mockResolvedValue(1);

    const result = await service.getMyNotifications('user-id', 5, 10);

    expect(result).toMatchObject({
      notifications: [
        {
          id: 'notification-id',
          type: 'POST_LIKED',
          actor: { id: 'actor-id', name: 'Actor', profilePhoto: null },
          entity: { type: 'VIDEO', id: 'post-id' },
          read: false,
        },
      ],
      pagination: { limit: 5, offset: 10, hasMore: false },
      unreadCount: 1,
    });
    expect(repository.findByUserId).toHaveBeenCalledWith('user-id', 5, 10);
  });

  it('rejects invalid pagination values', async () => {
    await expect(service.getMyNotifications('user-id', 101, 0)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.getMyNotifications('user-id', 20, -1)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('does not create a notification when actor is its recipient', async () => {
    await expect(
      service.createNotification('same-user', 'New like', 'Someone liked your post.', {
        actorId: 'same-user',
        type: 'POST_LIKED',
      }),
    ).resolves.toBeNull();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('replaces the generic actor text with the real user name', async () => {
    repository.create.mockResolvedValue({ id: 'notification-id' });

    await service.createNotification('user-id', 'New like', 'Someone liked your post.', {
      actorId: 'actor-id',
      type: 'POST_LIKED',
      entityType: 'VIDEO',
      entityId: 'post-id',
    });

    expect(userRepository.findById).toHaveBeenCalledWith('actor-id');
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-id',
        text: 'Jane Doe liked your post.',
        actorId: 'actor-id',
      }),
    );
  });

  it('returns not found when marking someone else’s notification as read', async () => {
    repository.markAsRead.mockResolvedValue(false);

    await expect(
      service.markAsRead('user-id', 'notification-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns not found when deleting someone else’s notification', async () => {
    repository.deleteOne.mockResolvedValue(false);

    await expect(
      service.deleteOne('user-id', 'notification-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
