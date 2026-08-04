import { Injectable } from '@nestjs/common';
import { NotificationRepository } from './notification.repository';

@Injectable()
export class NotificationService {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async getMyNotifications(userId: string) {
    const list = await this.notificationRepository.findByUserId(userId);
    return list.map(n => ({
      id: n.id,
      title: n.title,
      text: n.text,
      time: n.createdAt.toISOString(),
      read: n.read,
    }));
  }

  async createNotification(userId: string, title: string, text: string) {
    return this.notificationRepository.create({
      userId,
      title,
      text,
    });
  }

  async markAllAsRead(userId: string) {
    await this.notificationRepository.markAllAsRead(userId);
    return { success: true };
  }

  async clearAll(userId: string) {
    await this.notificationRepository.deleteAll(userId);
    return { success: true };
  }
}
