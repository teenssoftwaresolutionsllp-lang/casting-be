import { Injectable } from '@nestjs/common';
import { ChatRepository } from './chat.repository';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly notificationService: NotificationService,
  ) {}

  async findOrCreateChat(currentUserId: string, targetUserId: string) {
    let chatId = await this.chatRepository.findChatBetweenUsers(currentUserId, targetUserId);
    if (!chatId) {
      chatId = await this.chatRepository.createChat(currentUserId, targetUserId);
    }
    return { chatId };
  }

  async getUserChats(userId: string) {
    return this.chatRepository.getUserChats(userId);
  }

  async getMessages(chatId: string, currentUserId: string) {
    const messages = await this.chatRepository.getMessages(chatId, currentUserId);
    return messages.map(m => ({
      ...m,
      sender: m.senderId === currentUserId ? 'me' : 'other',
    }));
  }

  async sendMessage(chatId: string, senderId: string, text: string) {
    const msg = await this.chatRepository.sendMessage(chatId, senderId, text);

    // Notify the other participant(s) of the chat
    const recipientIds = await this.chatRepository.getOtherParticipants(chatId, senderId);
    for (const recipientId of recipientIds) {
      this.notificationService
        .createNotification(
          recipientId,
          'New message',
          'You have received a new message.',
          {
            actorId: senderId,
            type: 'NEW_MESSAGE',
            entityType: 'CHAT',
            entityId: chatId,
          },
        )
        .catch(() => undefined);
    }

    return msg;
  }
}
