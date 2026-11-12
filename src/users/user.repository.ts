import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, gt, ilike, sql, inArray } from 'drizzle-orm';
import { DRIZZLE_DB } from '../db/db.module';
import * as schema from '../db/schema';

@Injectable()
export class UserRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(user: typeof schema.users.$inferInsert) {
    const [created] = await this.db
      .insert(schema.users)
      .values(user)
      .returning();
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

  async findByIds(ids: string[]) {
    if (!ids.length) return [];
    return this.db
      .select()
      .from(schema.users)
      .where(inArray(schema.users.id, ids));
  }

  async findHelpDetailsById(id: string) {
    const results = await this.db
      .select({
        id: schema.users.id,
        fullName: schema.users.fullName,
        username: schema.users.username,
        email: schema.users.email,
        mobile: schema.users.mobile,
        trkCode: schema.users.trkCode,
        role: schema.users.role,
        age: schema.users.age,
        stageName: schema.users.stageName,
        dob: schema.users.dob,
        gender: schema.users.gender,
        country: schema.users.country,
        state: schema.users.state,
        city: schema.users.city,
        address: schema.users.address,
        postalCode: schema.users.postalCode,
        profilePhoto: schema.users.profilePhoto,
        category: schema.users.category,
        experience: schema.users.experience,
        skills: schema.users.skills,
        languages: schema.users.languages,
        preferredLanguage: schema.users.preferredLanguage,
        qualification: schema.users.qualification,
        institute: schema.users.institute,
        occupation: schema.users.occupation,
        availableFor: schema.users.availableFor,
        union: schema.users.union,
        relocate: schema.users.relocate,
        height: schema.users.height,
        weight: schema.users.weight,
        bodyType: schema.users.bodyType,
        skinTone: schema.users.skinTone,
        hairColor: schema.users.hairColor,
        eyeColor: schema.users.eyeColor,
        preferredRole: schema.users.preferredRole,
        travelAvailability: schema.users.travelAvailability,
        nightShoots: schema.users.nightShoots,
        headshot: schema.users.headshot,
        fullBody: schema.users.fullBody,
        introVideo: schema.users.introVideo,
        previousWork: schema.users.previousWork,
        instagram: schema.users.instagram,
        youtube: schema.users.youtube,
        facebookUrl: schema.users.facebookUrl,
        imdb: schema.users.imdb,
        website: schema.users.website,
        resume: schema.users.resume,
        awards: schema.users.awards,
        bio: schema.users.bio,
        createdAt: schema.users.createdAt,
        updatedAt: schema.users.updatedAt,
      })
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);
    return results[0] || null;
  }

  async deleteById(id: string): Promise<boolean> {
    const [deleted] = await this.db
      .delete(schema.users)
      .where(eq(schema.users.id, id))
      .returning({ id: schema.users.id });
    return Boolean(deleted);
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

  async findByOtpPhone(phone: string) {
    const nationalNumber = phone.slice(-10);
    const results = await this.db
      .select()
      .from(schema.users)
      .where(
        sql`${schema.users.phone} = ${phone} OR regexp_replace(${schema.users.mobile}, '[^0-9]', '', 'g') IN (${phone}, ${nationalNumber})`,
      )
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

  async update(
    id: string,
    updateData: Partial<typeof schema.users.$inferInsert>,
  ) {
    const [updated] = await this.db
      .update(schema.users)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(schema.users.id, id))
      .returning();
    return updated;
  }

  async setPasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ) {
    await this.db
      .update(schema.users)
      .set({
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: expiresAt,
      })
      .where(eq(schema.users.id, userId));
  }

  async clearPasswordResetToken(userId: string, tokenHash: string) {
    await this.db
      .update(schema.users)
      .set({ passwordResetTokenHash: null, passwordResetExpiresAt: null })
      .where(
        and(
          eq(schema.users.id, userId),
          eq(schema.users.passwordResetTokenHash, tokenHash),
        ),
      );
  }

  async resetPasswordWithToken(
    tokenHash: string,
    password: string,
  ): Promise<boolean> {
    const [updated] = await this.db
      .update(schema.users)
      .set({
        password,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      })
      .where(
        and(
          eq(schema.users.passwordResetTokenHash, tokenHash),
          gt(schema.users.passwordResetExpiresAt, new Date()),
        ),
      )
      .returning({ id: schema.users.id });

    return Boolean(updated);
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
      whereClause = and(
        baseCondition,
        ilike(schema.users.fullName, `%${queryName}%`),
      );
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

  async getFollowersCountByUserIds(
    userIds: string[],
  ): Promise<Record<string, number>> {
    if (!userIds.length) return {};

    const results = await this.db
      .select({
        userId: schema.follows.followingId,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.follows)
      .where(inArray(schema.follows.followingId, userIds))
      .groupBy(schema.follows.followingId);

    return results.reduce(
      (acc, row) => {
        acc[row.userId] = Number(row.count);
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  async getFollowingCount(userId: string): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.follows)
      .where(eq(schema.follows.followerId, userId));
    return result?.count || 0;
  }

  async getFollowStatusMap(
    currentUserId: string,
    targetUserIds: string[],
  ): Promise<Record<string, boolean>> {
    if (!targetUserIds.length) return {};

    const rows = await this.db
      .select({
        followingId: schema.follows.followingId,
      })
      .from(schema.follows)
      .where(
        and(
          eq(schema.follows.followerId, currentUserId),
          inArray(schema.follows.followingId, targetUserIds),
        ),
      );

    return rows.reduce(
      (acc, row) => {
        acc[row.followingId] = true;
        return acc;
      },
      {} as Record<string, boolean>,
    );
  }

  async getVideosCount(userId: string): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.videos)
      .where(eq(schema.videos.creatorId, userId));
    return result?.count || 0;
  }

  async getVideosCountByUserIds(
    userIds: string[],
  ): Promise<Record<string, number>> {
    if (!userIds.length) return {};

    const results = await this.db
      .select({
        creatorId: schema.videos.creatorId,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.videos)
      .where(inArray(schema.videos.creatorId, userIds))
      .groupBy(schema.videos.creatorId);

    return results.reduce(
      (acc, row) => {
        acc[row.creatorId] = Number(row.count);
        return acc;
      },
      {} as Record<string, number>,
    );
  }
}
