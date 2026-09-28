import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gt, inArray, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_DB } from '../db/db.module';
import * as schema from '../db/schema';

@Injectable()
export class StoriesRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(story: typeof schema.stories.$inferInsert) {
    const [created] = await this.db.insert(schema.stories).values(story).returning();
    return created;
  }

  async getFeed(viewerId: string, limit: number, offset: number) {
    const now = new Date();
    const creators = await this.db
      .select({ creatorId: schema.stories.creatorId })
      .from(schema.stories)
      .where(gt(schema.stories.expiresAt, now))
      .groupBy(schema.stories.creatorId)
      .orderBy(desc(sql`max(${schema.stories.createdAt})`))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = creators.length > limit;
    const creatorIds = creators.slice(0, limit).map(({ creatorId }) => creatorId);
    if (creatorIds.length === 0) {
      return { stories: [], pagination: { limit, offset, hasMore: false } };
    }

    const rows = await this.db
      .select({
        id: schema.stories.id,
        creatorId: schema.stories.creatorId,
        mediaUrl: schema.stories.mediaUrl,
        mediaType: schema.stories.mediaType,
        createdAt: schema.stories.createdAt,
        expiresAt: schema.stories.expiresAt,
        creatorName: schema.users.fullName,
        creatorUsername: schema.users.username,
        creatorPic: schema.users.profilePhoto,
        viewedAt: schema.storyViews.viewedAt,
      })
      .from(schema.stories)
      .innerJoin(schema.users, eq(schema.stories.creatorId, schema.users.id))
      .leftJoin(
        schema.storyViews,
        and(
          eq(schema.storyViews.storyId, schema.stories.id),
          eq(schema.storyViews.viewerId, viewerId),
        ),
      )
      .where(and(gt(schema.stories.expiresAt, now), inArray(schema.stories.creatorId, creatorIds)))
      .orderBy(desc(schema.stories.createdAt));

    const grouped = new Map<string, {
      creatorId: string;
      creatorName: string;
      creatorUsername: string | null;
      creatorPic: string | null;
      hasUnviewed: boolean;
      items: Array<{
        id: string;
        mediaUrl: string;
        mediaType: string;
        createdAt: Date;
        expiresAt: Date;
        viewed: boolean;
      }>;
    }>();

    for (const row of rows) {
      let group = grouped.get(row.creatorId);
      if (!group) {
        group = {
          creatorId: row.creatorId,
          creatorName: row.creatorName,
          creatorUsername: row.creatorUsername,
          creatorPic: row.creatorPic,
          hasUnviewed: false,
          items: [],
        };
        grouped.set(row.creatorId, group);
      }
      const viewed = row.viewedAt !== null;
      group.items.push({
        id: row.id,
        mediaUrl: row.mediaUrl,
        mediaType: row.mediaType,
        createdAt: row.createdAt,
        expiresAt: row.expiresAt,
        viewed,
      });
      group.hasUnviewed ||= !viewed;
    }

    return {
      stories: creatorIds.map((creatorId) => grouped.get(creatorId)).filter(Boolean),
      pagination: { limit, offset, hasMore },
    };
  }

  async findById(id: string) {
    const [story] = await this.db
      .select()
      .from(schema.stories)
      .where(eq(schema.stories.id, id))
      .limit(1);
    return story || null;
  }

  async markViewed(storyId: string, viewerId: string) {
    await this.db
      .insert(schema.storyViews)
      .values({ storyId, viewerId })
      .onConflictDoNothing();
  }

  async deleteById(id: string) {
    await this.db.delete(schema.stories).where(eq(schema.stories.id, id));
  }
}
