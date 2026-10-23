import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationRepository } from './notification.repository';

export type NotificationType =
  | 'GENERAL'
  | 'POST_LIKED'
  | 'POST_COMMENTED'
  | 'AUDITION_APPLIED';

export type NotificationEntityType = 'VIDEO' | 'AUDITION';

@Injectable()
export class NotificationService {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async getMyNotifications(userId: string, limit = 20, offset = 0) {
    this.validatePagination(limit, offset);
    const [notifications, unreadCount] = await Promise.all([
      this.notificationRepository.findByUserId(userId, limit, offset),
      this.notificationRepository.countUnread(userId),
    ]);
    const hasMore = notifications.length > limit;

    return {
      notifications: notifications.slice(0, limit).map((notification) => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        text: notification.text,
        actor: notification.actorId
          ? {
              id: notification.actorId,
              name: notification.actorName,
              profilePhoto: notification.actorProfilePhoto,
            }
          : null,
        entity: notification.entityId
          ? {
              type: notification.entityType,
              id: notification.entityId,
            }
          : null,
        time: notification.createdAt.toISOString(),
        read: notification.read,
      })),
      pagination: {
        limit,
        offset,
        hasMore,
      },
      unreadCount,
    };
  }

  async createNotification(
    userId: string,
    title: string,
    text: string,
    metadata?: {
      actorId?: string;
      type?: NotificationType;
      entityType?: NotificationEntityType;
      entityId?: string;
    },
  ) {
    if (metadata?.actorId === userId) {
      return null;
    }

    return this.notificationRepository.create({
      userId,
      title,
      text,
      actorId: metadata?.actorId,
      type: metadata?.type ?? 'GENERAL',
      entityType: metadata?.entityType,
      entityId: metadata?.entityId,
    });
  }

  async getUnreadCount(userId: string) {
    return { unreadCount: await this.notificationRepository.countUnread(userId) };
  }

  async markAsRead(userId: string, notificationId: string) {
    const updated = await this.notificationRepository.markAsRead(
      userId,
      notificationId,
    );
    if (!updated) {
      throw new NotFoundException('Notification not found.');
    }
    return { success: true };
  }

  async markAllAsRead(userId: string) {
    await this.notificationRepository.markAllAsRead(userId);
    return { success: true };
  }

  async deleteOne(userId: string, notificationId: string) {
    const deleted = await this.notificationRepository.deleteOne(
      userId,
      notificationId,
    );
    if (!deleted) {
      throw new NotFoundException('Notification not found.');
    }
    return { success: true };
  }

  async clearAll(userId: string) {
    await this.notificationRepository.deleteAll(userId);
    return { success: true };
  }

  private validatePagination(limit: number, offset: number) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException('limit must be an integer between 1 and 100.');
    }
    if (!Number.isInteger(offset) || offset < 0) {
      throw new BadRequestException('offset must be a non-negative integer.');
    }
  }
}
