import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, or, ilike, sql } from 'drizzle-orm';
import { DRIZZLE_DB } from '../db/db.module';
import * as schema from '../db/schema';

@Injectable()
export class UserRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(user: typeof schema.users.$inferInsert) {
    const [created] = await this.db.insert(schema.users).values(user).returning();
    return created;
  }

  async findById(id: string) {
    const results = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);
    return results[0] || null;
  }

  async findByEmail(email: string) {
    const results = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);
    return results[0] || null;
  }

  async findByUsername(username: string) {
    const results = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.username, username))
      .limit(1);
    return results[0] || null;
  }

  async findByMobile(mobile: string) {
    const results = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.mobile, mobile))
      .limit(1);
    return results[0] || null;
  }

  async findByTrkCode(trkCode: string) {
    const results = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.trkCode, trkCode))
      .limit(1);
    return results[0] || null;
  }

  async generateTrkCode(): Promise<string> {
    const yearSuffix = new Date().getFullYear().toString().slice(-2); // '26'
    const prefix = `TRK${yearSuffix}`;

    const [latest] = await this.db
      .select({ trkCode: schema.users.trkCode })
      .from(schema.users)
      .where(sql`${schema.users.trkCode} LIKE ${prefix + '%'}`)
      .orderBy(sql`${schema.users.trkCode} DESC`)
      .limit(1);

    let nextSeq = 1;
    if (latest?.trkCode) {
      const numPart = parseInt(latest.trkCode.slice(prefix.length), 10);
      if (!isNaN(numPart)) {
        nextSeq = numPart + 1;
      }
    }

    return `${prefix}${nextSeq.toString().padStart(4, '0')}`;
  }

  async update(id: string, updateData: Partial<typeof schema.users.$inferInsert>) {
    const [updated] = await this.db
      .update(schema.users)
      .set(updateData)
      .where(eq(schema.users.id, id))
      .returning();
    return updated;
  }

  async exploreTalent(queryName?: string, category?: string) {
    let whereClause;
    
    // Always filter for role = 'artist' for exploring talent
    const baseCondition = eq(schema.users.role, 'artist');
    
    if (queryName && category && category !== 'All') {
      whereClause = and(
        baseCondition,
        ilike(schema.users.fullName, `%${queryName}%`),
        eq(schema.users.category, category),
      );
    } else if (queryName) {
      whereClause = and(baseCondition, ilike(schema.users.fullName, `%${queryName}%`));
    } else if (category && category !== 'All') {
      whereClause = and(baseCondition, eq(schema.users.category, category));
    } else {
      whereClause = baseCondition;
    }

    return this.db.select().from(schema.users).where(whereClause);
  }

  // Follow relationships
  async followUser(followerId: string, followingId: string) {
    await this.db.insert(schema.follows).values({
      followerId,
      followingId,
    });
  }

  async unfollowUser(followerId: string, followingId: string) {
    await this.db
      .delete(schema.follows)
      .where(
        and(
          eq(schema.follows.followerId, followerId),
          eq(schema.follows.followingId, followingId),
        ),
      );
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const results = await this.db
      .select()
      .from(schema.follows)
      .where(
        and(
          eq(schema.follows.followerId, followerId),
          eq(schema.follows.followingId, followingId),
        ),
      )
      .limit(1);
    return results.length > 0;
  }

  async getFollowersCount(userId: string): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.follows)
      .where(eq(schema.follows.followingId, userId));
    return result?.count || 0;
  }

  async getFollowingCount(userId: string): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.follows)
      .where(eq(schema.follows.followerId, userId));
    return result?.count || 0;
  }

  async getVideosCount(userId: string): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.videos)
      .where(eq(schema.videos.creatorId, userId));
    return result?.count || 0;
  }
}
