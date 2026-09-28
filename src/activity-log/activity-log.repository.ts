import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, sql, desc, gte, lte } from 'drizzle-orm';
import { DRIZZLE_DB } from '../db/db.module';
import * as schema from '../db/schema';

@Injectable()
export class ActivityLogRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(data: typeof schema.activityLogs.$inferInsert) {
    const [created] = await this.db.insert(schema.activityLogs).values(data).returning();
    return created;
  }

  async findByUserId(userId: string, page: number = 1, limit: number = 50) {
    const offset = (page - 1) * limit;
    return this.db
      .select()
      .from(schema.activityLogs)
      .where(eq(schema.activityLogs.userId, userId))
      .orderBy(desc(schema.activityLogs.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async countByUserId(userId: string): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.activityLogs)
      .where(eq(schema.activityLogs.userId, userId));
    return result?.count || 0;
  }

  async findAll(
    page: number = 1,
    limit: number = 50,
    filters?: { action?: string; userId?: string; startDate?: string; endDate?: string },
  ) {
    const offset = (page - 1) * limit;
    const conditions: any[] = [];

    if (filters?.action) {
      conditions.push(eq(schema.activityLogs.action, filters.action));
    }
    if (filters?.userId) {
      conditions.push(eq(schema.activityLogs.userId, filters.userId));
    }
    if (filters?.startDate) {
      conditions.push(gte(schema.activityLogs.createdAt, new Date(filters.startDate)));
    }
    if (filters?.endDate) {
      conditions.push(lte(schema.activityLogs.createdAt, new Date(filters.endDate)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db
      .select({
        id: schema.activityLogs.id,
        userId: schema.activityLogs.userId,
        action: schema.activityLogs.action,
        entity: schema.activityLogs.entity,
        entityId: schema.activityLogs.entityId,
        details: schema.activityLogs.details,
        ipAddress: schema.activityLogs.ipAddress,
        userAgent: schema.activityLogs.userAgent,
        createdAt: schema.activityLogs.createdAt,
        userName: schema.users.fullName,
        userEmail: schema.users.email,
        userTrkCode: schema.users.trkCode,
      })
      .from(schema.activityLogs)
      .leftJoin(schema.users, eq(schema.activityLogs.userId, schema.users.id))
      .where(whereClause)
      .orderBy(desc(schema.activityLogs.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async countAll(filters?: { action?: string; userId?: string; startDate?: string; endDate?: string }): Promise<number> {
    const conditions: any[] = [];

    if (filters?.action) {
      conditions.push(eq(schema.activityLogs.action, filters.action));
    }
    if (filters?.userId) {
      conditions.push(eq(schema.activityLogs.userId, filters.userId));
    }
    if (filters?.startDate) {
      conditions.push(gte(schema.activityLogs.createdAt, new Date(filters.startDate)));
    }
    if (filters?.endDate) {
      conditions.push(lte(schema.activityLogs.createdAt, new Date(filters.endDate)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.activityLogs)
      .where(whereClause);
    return result?.count || 0;
  }
}
