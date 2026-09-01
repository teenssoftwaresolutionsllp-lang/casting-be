import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc, sql } from 'drizzle-orm';
import { DRIZZLE_DB } from '../db/db.module';
import * as schema from '../db/schema';

@Injectable()
export class PhotoRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(photo: typeof schema.photos.$inferInsert) {
    const [created] = await this.db.insert(schema.photos).values(photo).returning();
    return created;
  }

  async findById(id: string) {
    const results = await this.db
      .select({
        id: schema.photos.id,
        category: schema.photos.category,
        creatorId: schema.photos.creatorId,
        title: schema.photos.title,
        desc: schema.photos.desc,
        url: schema.photos.url,
        thumb: schema.photos.thumb,
        viewsCount: schema.photos.viewsCount,
        likesCount: schema.photos.likesCount,
        createdAt: schema.photos.createdAt,
        creatorName: schema.users.fullName,
        creatorPic: schema.users.profilePhoto,
        creatorCategory: schema.users.category,
      })
      .from(schema.photos)
      .leftJoin(schema.users, eq(schema.photos.creatorId, schema.users.id))
      .where(eq(schema.photos.id, id))
      .limit(1);
    return results[0] || null;
  }

  async findAll(category?: string) {
    const query = this.db
      .select({
        id: schema.photos.id,
        category: schema.photos.category,
        creatorId: schema.photos.creatorId,
        title: schema.photos.title,
        desc: schema.photos.desc,
        url: schema.photos.url,
        thumb: schema.photos.thumb,
        viewsCount: schema.photos.viewsCount,
        likesCount: schema.photos.likesCount,
        createdAt: schema.photos.createdAt,
        creatorName: schema.users.fullName,
        creatorPic: schema.users.profilePhoto,
        creatorCategory: schema.users.category,
      })
      .from(schema.photos)
      .leftJoin(schema.users, eq(schema.photos.creatorId, schema.users.id));

    if (category && category !== 'All') {
      query.where(eq(schema.photos.category, category));
    }

    return query.orderBy(desc(schema.photos.createdAt));
  }

  async incrementViews(id: string) {
    await this.db
      .update(schema.photos)
      .set({
        viewsCount: sql`${schema.photos.viewsCount} + 1`,
      })
      .where(eq(schema.photos.id, id));
  }

  async hasLiked(photoId: string, userId: string): Promise<boolean> {
    const results = await this.db
      .select()
      .from(schema.photoLikes)
      .where(and(eq(schema.photoLikes.photoId, photoId), eq(schema.photoLikes.userId, userId)))
      .limit(1);
    return results.length > 0;
  }

  async addLike(photoId: string, userId: string) {
    await this.db.insert(schema.photoLikes).values({ photoId, userId });
    await this.db
      .update(schema.photos)
      .set({
        likesCount: sql`${schema.photos.likesCount} + 1`,
      })
      .where(eq(schema.photos.id, photoId));
  }

  async removeLike(photoId: string, userId: string) {
    await this.db
      .delete(schema.photoLikes)
      .where(and(eq(schema.photoLikes.photoId, photoId), eq(schema.photoLikes.userId, userId)));
    await this.db
      .update(schema.photos)
      .set({
        likesCount: sql`GREATEST(0, ${schema.photos.likesCount} - 1)`,
      })
      .where(eq(schema.photos.id, photoId));
  }

  async getComments(photoId: string) {
    return this.db
      .select({
        id: schema.photoComments.id,
        photoId: schema.photoComments.photoId,
        userId: schema.photoComments.userId,
        text: schema.photoComments.text,
        likesCount: schema.photoComments.likesCount,
        createdAt: schema.photoComments.createdAt,
        author: schema.users.fullName,
        authorPic: schema.users.profilePhoto,
      })
      .from(schema.photoComments)
      .leftJoin(schema.users, eq(schema.photoComments.userId, schema.users.id))
      .where(eq(schema.photoComments.photoId, photoId))
      .orderBy(desc(schema.photoComments.createdAt));
  }

  async createComment(comment: typeof schema.photoComments.$inferInsert) {
    const [created] = await this.db.insert(schema.photoComments).values(comment).returning();
    return created;
  }

  async getCommentById(commentId: string) {
    const results = await this.db
      .select()
      .from(schema.photoComments)
      .where(eq(schema.photoComments.id, commentId))
      .limit(1);
    return results[0] || null;
  }

  async hasLikedComment(commentId: string, userId: string): Promise<boolean> {
    const results = await this.db
      .select()
      .from(schema.photoCommentLikes)
      .where(and(eq(schema.photoCommentLikes.commentId, commentId), eq(schema.photoCommentLikes.userId, userId)))
      .limit(1);
    return results.length > 0;
  }

  async addCommentLike(commentId: string, userId: string) {
    await this.db.insert(schema.photoCommentLikes).values({ commentId, userId });
    await this.db
      .update(schema.photoComments)
      .set({
        likesCount: sql`${schema.photoComments.likesCount} + 1`,
      })
      .where(eq(schema.photoComments.id, commentId));
  }

  async removeCommentLike(commentId: string, userId: string) {
    await this.db
      .delete(schema.photoCommentLikes)
      .where(and(eq(schema.photoCommentLikes.commentId, commentId), eq(schema.photoCommentLikes.userId, userId)));
    await this.db
      .update(schema.photoComments)
      .set({
        likesCount: sql`GREATEST(0, ${schema.photoComments.likesCount} - 1)`,
      })
      .where(eq(schema.photoComments.id, commentId));
  }
}
