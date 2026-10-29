import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, desc, eq, sql } from 'drizzle-orm';
import { DRIZZLE_DB } from '../db/db.module';
import * as schema from '../db/schema';

@Injectable()
export class NotificationRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(notification: typeof schema.notifications.$inferInsert) {
    const [created] = await this.db
      .insert(schema.notifications)
      .values(notification)
      .returning();
    return created;
  }

  async createBulk(notifications: (typeof schema.notifications.$inferInsert)[]) {
    if (!notifications.length) return;
    await this.db.insert(schema.notifications).values(notifications);
  }

  async findByUserId(userId: string, limit: number, offset: number) {
    return this.db
      .select({
        id: schema.notifications.id,
        type: schema.notifications.type,
        title: schema.notifications.title,
        text: schema.notifications.text,
        actorId: schema.notifications.actorId,
        actorName: schema.users.fullName,
        actorProfilePhoto: schema.users.profilePhoto,
        entityType: schema.notifications.entityType,
        entityId: schema.notifications.entityId,
        read: schema.notifications.read,
        createdAt: schema.notifications.createdAt,
      })
      .from(schema.notifications)
      .leftJoin(schema.users, eq(schema.notifications.actorId, schema.users.id))
      .where(eq(schema.notifications.userId, userId))
      .orderBy(desc(schema.notifications.createdAt), desc(schema.notifications.id))
      .limit(limit + 1)
      .offset(offset);
  }

  async countUnread(userId: string) {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.notifications)
      .where(
        and(
          eq(schema.notifications.userId, userId),
          eq(schema.notifications.read, false),
        ),
      );
    return result.count;
  }

  async markAsRead(userId: string, notificationId: string) {
    const [updated] = await this.db
      .update(schema.notifications)
      .set({ read: true })
      .where(
        and(
          eq(schema.notifications.id, notificationId),
          eq(schema.notifications.userId, userId),
        ),
      )
      .returning({ id: schema.notifications.id });
    return !!updated;
  }

  async markAllAsRead(userId: string) {
    await this.db
      .update(schema.notifications)
      .set({ read: true })
      .where(eq(schema.notifications.userId, userId));
  }

  async deleteOne(userId: string, notificationId: string) {
    const [deleted] = await this.db
      .delete(schema.notifications)
      .where(
        and(
          eq(schema.notifications.id, notificationId),
          eq(schema.notifications.userId, userId),
        ),
      )
      .returning({ id: schema.notifications.id });
    return !!deleted;
  }

  async deleteAll(userId: string) {
    await this.db.delete(schema.notifications).where(eq(schema.notifications.userId, userId));
  }
}
