import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc, sql } from 'drizzle-orm';
import { DRIZZLE_DB } from '../db/db.module';
import * as schema from '../db/schema';

@Injectable()
export class VideoRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(video: typeof schema.videos.$inferInsert) {
    const [created] = await this.db.insert(schema.videos).values(video).returning();
    return created;
  }

  async findById(id: string) {
    const results = await this.db
      .select({
        id: schema.videos.id,
        category: schema.videos.category,
        creatorId: schema.videos.creatorId,
        title: schema.videos.title,
        desc: schema.videos.desc,
        url: schema.videos.url,
        thumb: schema.videos.thumb,
        viewsCount: schema.videos.viewsCount,
        likesCount: schema.videos.likesCount,
        createdAt: schema.videos.createdAt,
        creatorName: schema.users.fullName,
        creatorPic: schema.users.profilePhoto,
        creatorCategory: schema.users.category,
      })
      .from(schema.videos)
      .leftJoin(schema.users, eq(schema.videos.creatorId, schema.users.id))
      .where(eq(schema.videos.id, id))
      .limit(1);
    return results[0] || null;
  }

  async findAll(category?: string) {
    const query = this.db
      .select({
        id: schema.videos.id,
        category: schema.videos.category,
        creatorId: schema.videos.creatorId,
        title: schema.videos.title,
        desc: schema.videos.desc,
        url: schema.videos.url,
        thumb: schema.videos.thumb,
        viewsCount: schema.videos.viewsCount,
        likesCount: schema.videos.likesCount,
        createdAt: schema.videos.createdAt,
        creatorName: schema.users.fullName,
        creatorPic: schema.users.profilePhoto,
        creatorCategory: schema.users.category,
      })
      .from(schema.videos)
      .leftJoin(schema.users, eq(schema.videos.creatorId, schema.users.id));

    if (category && category !== 'All') {
      query.where(eq(schema.videos.category, category));
    }

    return query.orderBy(desc(schema.videos.createdAt));
  }

  async incrementViews(id: string) {
    await this.db
      .update(schema.videos)
      .set({
        viewsCount: sql`${schema.videos.viewsCount} + 1`,
      })
      .where(eq(schema.videos.id, id));
  }

  // Like operations
  async hasLiked(videoId: string, userId: string): Promise<boolean> {
    const results = await this.db
      .select()
      .from(schema.videoLikes)
      .where(
        and(
          eq(schema.videoLikes.videoId, videoId),
          eq(schema.videoLikes.userId, userId),
        ),
      )
      .limit(1);
    return results.length > 0;
  }

  async addLike(videoId: string, userId: string) {
    await this.db.insert(schema.videoLikes).values({ videoId, userId });
    await this.db
      .update(schema.videos)
      .set({
        likesCount: sql`${schema.videos.likesCount} + 1`,
      })
      .where(eq(schema.videos.id, videoId));
  }

  async removeLike(videoId: string, userId: string) {
    await this.db
      .delete(schema.videoLikes)
      .where(
        and(
          eq(schema.videoLikes.videoId, videoId),
          eq(schema.videoLikes.userId, userId),
        ),
      );
    await this.db
      .update(schema.videos)
      .set({
        likesCount: sql`GREATEST(0, ${schema.videos.likesCount} - 1)`,
      })
      .where(eq(schema.videos.id, videoId));
  }

  // Comments
  async getComments(videoId: string) {
    return this.db
      .select({
        id: schema.comments.id,
        videoId: schema.comments.videoId,
        userId: schema.comments.userId,
        text: schema.comments.text,
        likesCount: schema.comments.likesCount,
        createdAt: schema.comments.createdAt,
        author: schema.users.fullName,
        authorPic: schema.users.profilePhoto,
      })
      .from(schema.comments)
      .leftJoin(schema.users, eq(schema.comments.userId, schema.users.id))
      .where(eq(schema.comments.videoId, videoId))
      .orderBy(desc(schema.comments.createdAt));
  }

  async createComment(comment: typeof schema.comments.$inferInsert) {
    const [created] = await this.db.insert(schema.comments).values(comment).returning();
    return created;
  }

  async getCommentById(commentId: string) {
    const results = await this.db
      .select()
      .from(schema.comments)
      .where(eq(schema.comments.id, commentId))
      .limit(1);
    return results[0] || null;
  }

  async hasLikedComment(commentId: string, userId: string): Promise<boolean> {
    const results = await this.db
      .select()
      .from(schema.commentLikes)
      .where(
        and(
          eq(schema.commentLikes.commentId, commentId),
          eq(schema.commentLikes.userId, userId),
        ),
      )
      .limit(1);
    return results.length > 0;
  }

  async addCommentLike(commentId: string, userId: string) {
    await this.db.insert(schema.commentLikes).values({ commentId, userId });
    await this.db
      .update(schema.comments)
      .set({
        likesCount: sql`${schema.comments.likesCount} + 1`,
      })
      .where(eq(schema.comments.id, commentId));
  }

  async removeCommentLike(commentId: string, userId: string) {
    await this.db
      .delete(schema.commentLikes)
      .where(
        and(
          eq(schema.commentLikes.commentId, commentId),
          eq(schema.commentLikes.userId, userId),
        ),
      );
    await this.db
      .update(schema.comments)
      .set({
        likesCount: sql`GREATEST(0, ${schema.comments.likesCount} - 1)`,
      })
      .where(eq(schema.comments.id, commentId));
  }
}
