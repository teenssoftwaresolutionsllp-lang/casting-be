import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, or, ilike, sql, desc, gte } from 'drizzle-orm';
import { DRIZZLE_DB } from '../db/db.module';
import * as schema from '../db/schema';

@Injectable()
export class AdminRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  // ==========================================
  // ADMIN USER OPERATIONS
  // ==========================================

  async findAdminByEmail(email: string) {
    const results = await this.db
      .select()
      .from(schema.adminUsers)
      .where(eq(schema.adminUsers.email, email))
      .limit(1);
    return results[0] || null;
  }

  async createAdmin(data: typeof schema.adminUsers.$inferInsert) {
    const [created] = await this.db.insert(schema.adminUsers).values(data).returning();
    return created;
  }

  async updateLastLogin(id: string) {
    await this.db
      .update(schema.adminUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(schema.adminUsers.id, id));
  }

  // ==========================================
  // USER MANAGEMENT
  // ==========================================

  async getAllUsers(page: number = 1, limit: number = 20, search?: string, role?: string) {
    const offset = (page - 1) * limit;
    const conditions: any[] = [];

    if (search) {
      conditions.push(
        or(
          ilike(schema.users.fullName, `%${search}%`),
          ilike(schema.users.email, `%${search}%`),
          ilike(schema.users.mobile, `%${search}%`),
          ilike(schema.users.trkCode, `%${search}%`),
          ilike(schema.users.username, `%${search}%`),
        ),
      );
    }

    if (role && role !== 'all') {
      conditions.push(eq(schema.users.role, role));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return this.db
      .select()
      .from(schema.users)
      .where(whereClause)
      .orderBy(desc(schema.users.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async countUsers(search?: string, role?: string): Promise<number> {
    const conditions: any[] = [];

    if (search) {
      conditions.push(
        or(
          ilike(schema.users.fullName, `%${search}%`),
          ilike(schema.users.email, `%${search}%`),
          ilike(schema.users.mobile, `%${search}%`),
          ilike(schema.users.trkCode, `%${search}%`),
          ilike(schema.users.username, `%${search}%`),
        ),
      );
    }

    if (role && role !== 'all') {
      conditions.push(eq(schema.users.role, role));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.users)
      .where(whereClause);
    return result?.count || 0;
  }

  async getUserById(id: string) {
    const results = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);
    return results[0] || null;
  }

  // ==========================================
  // USER CONTENT QUERIES
  // ==========================================

  async getUserVideos(userId: string) {
    return this.db
      .select()
      .from(schema.videos)
      .where(eq(schema.videos.creatorId, userId))
      .orderBy(desc(schema.videos.createdAt));
  }

  async getUserAuditions(userId: string) {
    return this.db
      .select()
      .from(schema.auditions)
      .where(eq(schema.auditions.creatorId, userId))
      .orderBy(desc(schema.auditions.createdAt));
  }

  async getUserApplications(userId: string) {
    return this.db
      .select({
        id: schema.applications.id,
        auditionId: schema.applications.auditionId,
        coverLetter: schema.applications.coverLetter,
        status: schema.applications.status,
        details: schema.applications.details,
        createdAt: schema.applications.createdAt,
        auditionTitle: schema.auditions.title,
        auditionCategory: schema.auditions.category,
      })
      .from(schema.applications)
      .leftJoin(schema.auditions, eq(schema.applications.auditionId, schema.auditions.id))
      .where(eq(schema.applications.applicantId, userId))
      .orderBy(desc(schema.applications.createdAt));
  }

  async getUserStories(userId: string) {
    return this.db
      .select()
      .from(schema.stories)
      .where(eq(schema.stories.creatorId, userId))
      .orderBy(desc(schema.stories.createdAt));
  }

  async getUserFollowers(userId: string) {
    return this.db
      .select({
        id: schema.users.id,
        fullName: schema.users.fullName,
        email: schema.users.email,
        profilePhoto: schema.users.profilePhoto,
        role: schema.users.role,
        trkCode: schema.users.trkCode,
      })
      .from(schema.follows)
      .innerJoin(schema.users, eq(schema.follows.followerId, schema.users.id))
      .where(eq(schema.follows.followingId, userId));
  }

  async getUserFollowing(userId: string) {
    return this.db
      .select({
        id: schema.users.id,
        fullName: schema.users.fullName,
        email: schema.users.email,
        profilePhoto: schema.users.profilePhoto,
        role: schema.users.role,
        trkCode: schema.users.trkCode,
      })
      .from(schema.follows)
      .innerJoin(schema.users, eq(schema.follows.followingId, schema.users.id))
      .where(eq(schema.follows.followerId, userId));
  }

  // ==========================================
  // DASHBOARD STATS
  // ==========================================

  async getDashboardStats() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      [totalUsers],
      [totalArtists],
      [totalAudiences],
      [totalVideos],
      [totalAuditions],
      [totalApplications],
      [newUsersToday],
      [newUsersWeek],
      [newUsersMonth],
    ] = await Promise.all([
      this.db.select({ count: sql<number>`count(*)::int` }).from(schema.users),
      this.db.select({ count: sql<number>`count(*)::int` }).from(schema.users).where(eq(schema.users.role, 'artist')),
      this.db.select({ count: sql<number>`count(*)::int` }).from(schema.users).where(eq(schema.users.role, 'audience')),
      this.db.select({ count: sql<number>`count(*)::int` }).from(schema.videos),
      this.db.select({ count: sql<number>`count(*)::int` }).from(schema.auditions),
      this.db.select({ count: sql<number>`count(*)::int` }).from(schema.applications),
      this.db.select({ count: sql<number>`count(*)::int` }).from(schema.users).where(gte(schema.users.createdAt, startOfToday)),
      this.db.select({ count: sql<number>`count(*)::int` }).from(schema.users).where(gte(schema.users.createdAt, startOfWeek)),
      this.db.select({ count: sql<number>`count(*)::int` }).from(schema.users).where(gte(schema.users.createdAt, startOfMonth)),
    ]);

    return {
      totalUsers: totalUsers?.count || 0,
      totalArtists: totalArtists?.count || 0,
      totalAudiences: totalAudiences?.count || 0,
      totalVideos: totalVideos?.count || 0,
      totalAuditions: totalAuditions?.count || 0,
      totalApplications: totalApplications?.count || 0,
      newUsersToday: newUsersToday?.count || 0,
      newUsersThisWeek: newUsersWeek?.count || 0,
      newUsersThisMonth: newUsersMonth?.count || 0,
    };
  }

  // Count helpers for user detail
  async getVideosCount(userId: string): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.videos)
      .where(eq(schema.videos.creatorId, userId));
    return result?.count || 0;
  }

  async getAuditionsCount(userId: string): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.auditions)
      .where(eq(schema.auditions.creatorId, userId));
    return result?.count || 0;
  }

  async getApplicationsCount(userId: string): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.applications)
      .where(eq(schema.applications.applicantId, userId));
    return result?.count || 0;
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
}
