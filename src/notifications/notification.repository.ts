import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, desc } from 'drizzle-orm';
import { DRIZZLE_DB } from '../db/db.module';
import * as schema from '../db/schema';

@Injectable()
export class NotificationRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(notification: typeof schema.notifications.$inferInsert) {
    const [created] = await this.db.insert(schema.notifications).values(notification).returning();
    return created;
  }

  async findByUserId(userId: string) {
    return this.db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.userId, userId))
      .orderBy(desc(schema.notifications.createdAt));
  }

  async markAllAsRead(userId: string) {
    await this.db
      .update(schema.notifications)
      .set({ read: true })
      .where(eq(schema.notifications.userId, userId));
  }

  async deleteAll(userId: string) {
    await this.db.delete(schema.notifications).where(eq(schema.notifications.userId, userId));
  }
}
