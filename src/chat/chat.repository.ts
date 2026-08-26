import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc } from 'drizzle-orm';
import { DRIZZLE_DB } from '../db/db.module';
import * as schema from '../db/schema';

@Injectable()
export class ChatRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findChatBetweenUsers(user1: string, user2: string) {
    // A chat must have both users as participants
    const chatsUser1 = await this.db.select({ chatId: schema.chatParticipants.chatId })
      .from(schema.chatParticipants)
      .where(eq(schema.chatParticipants.userId, user1));
      
    if (!chatsUser1.length) return null;
    const chatIds = chatsUser1.map(c => c.chatId);

    const chatsUser2 = await this.db.select()
      .from(schema.chatParticipants)
      .where(
        and(
          eq(schema.chatParticipants.userId, user2),
          // in array would be best, but manual find works too
        )
      );
      
    const match = chatsUser2.find(c => chatIds.includes(c.chatId));
    return match ? match.chatId : null;
  }

  async createChat(user1: string, user2: string) {
    const [chat] = await this.db.insert(schema.chats).values({}).returning();
    await this.db.insert(schema.chatParticipants).values([
      { chatId: chat.id, userId: user1 },
      { chatId: chat.id, userId: user2 },
    ]);
    return chat.id;
  }

  async getUserChats(userId: string) {
    // get all chats where user is participant
    const myChats = await this.db
      .select({ chatId: schema.chatParticipants.chatId })
      .from(schema.chatParticipants)
      .where(eq(schema.chatParticipants.userId, userId));
      
    if (!myChats.length) return [];
    const chatIds = myChats.map(c => c.chatId);

    // fetch all those chats details and the OTHER participant's details
    const otherParticipants = await this.db
      .select({
        chatId: schema.chatParticipants.chatId,
        id: schema.users.id,
        name: schema.users.fullName,
        pic: schema.users.profilePhoto,
      })
      .from(schema.chatParticipants)
      .leftJoin(schema.users, eq(schema.chatParticipants.userId, schema.users.id))
      .where(and(
        // we can't do an easy IN query without sql string in basic eq, but we can fetch all and filter
        eq(schema.chatParticipants.userId, schema.chatParticipants.userId) // dummy
      ));

    const finalParticipants = otherParticipants.filter(
      p => chatIds.includes(p.chatId) && p.id !== userId
    );
    
    // fetch last messages for these chats
    const messagesList = await this.db
      .select()
      .from(schema.messages)
      .orderBy(desc(schema.messages.createdAt)); // just simple approach

    // Map them together
    return finalParticipants.map(participant => {
      const msgs = messagesList.filter(m => m.chatId === participant.chatId);
      const lastMsg = msgs[0];
      return {
        id: participant.chatId,
        creatorId: participant.id,
        creatorName: participant.name,
        creatorPic: participant.pic || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        lastMessage: lastMsg ? lastMsg.text : 'Say hello 👋',
        time: lastMsg ? lastMsg.createdAt.toISOString() : new Date().toISOString(),
        unread: false,
      };
    });
  }

  async getMessages(chatId: string, userId: string) {
    const [participant] = await this.db
      .select({ chatId: schema.chatParticipants.chatId })
      .from(schema.chatParticipants)
      .where(and(
        eq(schema.chatParticipants.chatId, chatId),
        eq(schema.chatParticipants.userId, userId),
      ));

    if (!participant) {
      const [chat] = await this.db
        .select({ id: schema.chats.id })
        .from(schema.chats)
        .where(eq(schema.chats.id, chatId));

      if (!chat) {
        throw new NotFoundException('Chat not found.');
      }

      throw new ForbiddenException('You are not a participant in this chat.');
    }

    return this.db
      .select({
        id: schema.messages.id,
        chatId: schema.messages.chatId,
        senderId: schema.messages.senderId,
        text: schema.messages.text,
        createdAt: schema.messages.createdAt,
      })
      .from(schema.messages)
      .where(eq(schema.messages.chatId, chatId))
      .orderBy(schema.messages.createdAt);
  }

  async sendMessage(chatId: string, senderId: string, text: string) {
    const [participant] = await this.db
      .select({ chatId: schema.chatParticipants.chatId })
      .from(schema.chatParticipants)
      .where(and(
        eq(schema.chatParticipants.chatId, chatId),
        eq(schema.chatParticipants.userId, senderId),
      ));

    if (!participant) {
      const [chat] = await this.db
        .select({ id: schema.chats.id })
        .from(schema.chats)
        .where(eq(schema.chats.id, chatId));

      if (!chat) {
        throw new NotFoundException('Chat not found. Start a chat before sending messages.');
      }

      throw new ForbiddenException('You are not a participant in this chat.');
    }

    const [msg] = await this.db.insert(schema.messages).values({
      chatId,
      senderId,
      text,
    }).returning();
    return msg;
  }
}
