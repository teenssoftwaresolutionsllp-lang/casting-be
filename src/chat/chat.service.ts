import { Injectable } from '@nestjs/common';
import { ChatRepository } from './chat.repository';

@Injectable()
export class ChatService {
  constructor(private readonly chatRepository: ChatRepository) {}

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
    return this.chatRepository.sendMessage(chatId, senderId, text);
  }
}
