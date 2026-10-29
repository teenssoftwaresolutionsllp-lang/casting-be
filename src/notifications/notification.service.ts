import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { NotificationRepository } from './notification.repository';
import { FcmService, FcmPayload } from './fcm.service';
import { UserRepository } from '../users/user.repository';

// ─── Notification Types ─────────────────────────────────────────────────────

export type NotificationType =
  | 'GENERAL'
  // Social
  | 'POST_LIKED'
  | 'POST_COMMENTED'
  | 'COMMENT_LIKED'
  | 'STORY_LIKED'
  | 'STORY_REPLIED'
  | 'NEW_FOLLOWER'
  // Chat
  | 'NEW_MESSAGE'
  // Auditions / Applications
  | 'AUDITION_APPLIED'
  | 'APPLICATION_SHORTLISTED'
  | 'APPLICATION_ACCEPTED'
  | 'APPLICATION_REJECTED'
  | 'APPLICATION_STATUS_UPDATED'
  | 'AUDITION_CANCELLED'
  | 'AUDITION_UPDATED';

export type NotificationEntityType =
  | 'VIDEO'
  | 'AUDITION'
  | 'APPLICATION'
  | 'STORY'
  | 'CHAT'
  | 'USER';

// ─── Notification metadata passed by callers ────────────────────────────────

export interface CreateNotificationMeta {
  actorId?: string;
  type?: NotificationType;
  entityType?: NotificationEntityType;
  entityId?: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly fcmService: FcmService,
    private readonly userRepository: UserRepository,
  ) {}

  // ── Public CRUD ────────────────────────────────────────────────────────────

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

  async getUnreadCount(userId: string) {
    return { unreadCount: await this.notificationRepository.countUnread(userId) };
  }

  async markAsRead(userId: string, notificationId: string) {
    const updated = await this.notificationRepository.markAsRead(userId, notificationId);
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
    const deleted = await this.notificationRepository.deleteOne(userId, notificationId);
    if (!deleted) {
      throw new NotFoundException('Notification not found.');
    }
    return { success: true };
  }

  async clearAll(userId: string) {
    await this.notificationRepository.deleteAll(userId);
    return { success: true };
  }

  // ── FCM Token Registration ─────────────────────────────────────────────────

  async registerFcmToken(userId: string, token: string) {
    if (!token || token.trim() === '') {
      throw new BadRequestException('FCM token must not be empty.');
    }
    await this.userRepository.update(userId, { fcmToken: token.trim() });
    return { success: true };
  }

  async clearFcmToken(userId: string) {
    await this.userRepository.update(userId, { fcmToken: null });
    return { success: true };
  }

  // ── Core create + push ─────────────────────────────────────────────────────

  /**
   * Saves a notification to the DB and fires an FCM push to the recipient.
   * Returns null if the actor and recipient are the same person (no self-notifications).
   */
  async createNotification(
    userId: string,
    title: string,
    text: string,
    metadata?: CreateNotificationMeta,
  ) {
    // Never notify someone about their own action
    if (metadata?.actorId === userId) {
      return null;
    }

    const personalizedText = await this.personalizeText(text, metadata?.actorId);

    const saved = await this.notificationRepository.create({
      userId,
      title,
      text: personalizedText,
      actorId: metadata?.actorId,
      type: metadata?.type ?? 'GENERAL',
      entityType: metadata?.entityType,
      entityId: metadata?.entityId,
    });

    // Fire-and-forget FCM push
    this.sendPush(userId, title, personalizedText, metadata).catch((err) =>
      this.logger.error(`FCM push failed for user ${userId}: ${err?.message ?? err}`),
    );

    return saved;
  }

  /**
   * Convenience: create notifications for multiple recipients at once
   * (e.g. audition cancelled — notify all applicants).
   */
  async createBulkNotifications(
    userIds: string[],
    title: string,
    text: string,
    metadata?: CreateNotificationMeta,
  ) {
    const uniqueIds = [...new Set(userIds)].filter(
      (id) => id !== metadata?.actorId,
    );
    if (!uniqueIds.length) return;

    const personalizedText = await this.personalizeText(text, metadata?.actorId);

    await this.notificationRepository.createBulk(
      uniqueIds.map((uid) => ({
        userId: uid,
        title,
        text: personalizedText,
        actorId: metadata?.actorId,
        type: metadata?.type ?? 'GENERAL',
        entityType: metadata?.entityType,
        entityId: metadata?.entityId,
      })),
    );

    // Bulk FCM
    this.sendBulkPush(uniqueIds, title, personalizedText, metadata).catch((err) =>
      this.logger.error(`Bulk FCM failed: ${err?.message ?? err}`),
    );
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async personalizeText(text: string, actorId?: string) {
    if (!text || !actorId) return text;

    const actor = await this.userRepository.findById(actorId);
    const actorName = actor?.fullName?.trim() || actor?.username?.trim() || 'Someone';

    if (!/\bSomeone\b|\bsomeone\b/i.test(text)) {
      return text;
    }

    return text.replace(/\bSomeone\b/gi, actorName);
  }

  private async sendPush(
    userId: string,
    title: string,
    body: string,
    metadata?: CreateNotificationMeta,
  ) {
    const user = await this.userRepository.findById(userId);
    if (!user?.fcmToken) return;

    const payload: FcmPayload = {
      title,
      body,
      data: this.buildFcmData(metadata),
    };

    const success = await this.fcmService.sendToToken(user.fcmToken, payload);
    if (!success) {
      // Token is invalid — clear it so we don't retry with a dead token
      await this.userRepository.update(userId, { fcmToken: null });
    }
  }

  private async sendBulkPush(
    userIds: string[],
    title: string,
    body: string,
    metadata?: CreateNotificationMeta,
  ) {
    // Fetch all users' FCM tokens in a single query
    const users = await this.userRepository.findByIds(userIds);
    const tokenToUserId: Record<string, string> = {};
    for (const user of users) {
      if (user.fcmToken) {
        tokenToUserId[user.fcmToken] = user.id;
      }
    }

    const tokens = Object.keys(tokenToUserId);
    if (!tokens.length) return;

    const payload: FcmPayload = {
      title,
      body,
      data: this.buildFcmData(metadata),
    };

    const invalidTokens = await this.fcmService.sendToMultipleTokens(tokens, payload);

    // Clean up invalid tokens concurrently
    if (invalidTokens.length) {
      await Promise.allSettled(
        invalidTokens.map((tok) => {
          const uid = tokenToUserId[tok];
          return uid ? this.userRepository.update(uid, { fcmToken: null }) : Promise.resolve();
        }),
      );
    }
  }

  private buildFcmData(metadata?: CreateNotificationMeta): Record<string, string> {
    const data: Record<string, string> = {};
    if (metadata?.type) data['type'] = metadata.type;
    if (metadata?.entityType) data['entityType'] = metadata.entityType;
    if (metadata?.entityId) data['entityId'] = metadata.entityId;
    if (metadata?.actorId) data['actorId'] = metadata.actorId;
    return data;
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
