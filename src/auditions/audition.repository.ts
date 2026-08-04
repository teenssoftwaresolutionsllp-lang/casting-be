import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc } from 'drizzle-orm';
import { DRIZZLE_DB } from '../db/db.module';
import * as schema from '../db/schema';

@Injectable()
export class AuditionRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(audition: typeof schema.auditions.$inferInsert) {
    const [created] = await this.db.insert(schema.auditions).values(audition).returning();
    return created;
  }

  async findById(id: string) {
    const results = await this.db
      .select({
        id: schema.auditions.id,
        creatorId: schema.auditions.creatorId,
        title: schema.auditions.title,
        category: schema.auditions.category,
        role: schema.auditions.role,
        location: schema.auditions.location,
        pay: schema.auditions.pay,
        deadline: schema.auditions.deadline,
        lang: schema.auditions.lang,
        desc: schema.auditions.desc,
        createdAt: schema.auditions.createdAt,
        contactName: schema.users.fullName,
      })
      .from(schema.auditions)
      .leftJoin(schema.users, eq(schema.auditions.creatorId, schema.users.id))
      .where(eq(schema.auditions.id, id))
      .limit(1);
    return results[0] || null;
  }

  async findAll(category?: string) {
    const query = this.db
      .select({
        id: schema.auditions.id,
        creatorId: schema.auditions.creatorId,
        title: schema.auditions.title,
        category: schema.auditions.category,
        role: schema.auditions.role,
        location: schema.auditions.location,
        pay: schema.auditions.pay,
        deadline: schema.auditions.deadline,
        lang: schema.auditions.lang,
        desc: schema.auditions.desc,
        createdAt: schema.auditions.createdAt,
        contactName: schema.users.fullName,
      })
      .from(schema.auditions)
      .leftJoin(schema.users, eq(schema.auditions.creatorId, schema.users.id));

    if (category && category !== 'All') {
      query.where(eq(schema.auditions.category, category));
    }

    return query.orderBy(desc(schema.auditions.createdAt));
  }

  async findMyPosted(creatorId: string) {
    return this.db
      .select({
        id: schema.auditions.id,
        creatorId: schema.auditions.creatorId,
        title: schema.auditions.title,
        category: schema.auditions.category,
        role: schema.auditions.role,
        location: schema.auditions.location,
        pay: schema.auditions.pay,
        deadline: schema.auditions.deadline,
        lang: schema.auditions.lang,
        desc: schema.auditions.desc,
        createdAt: schema.auditions.createdAt,
        contactName: schema.users.fullName,
      })
      .from(schema.auditions)
      .leftJoin(schema.users, eq(schema.auditions.creatorId, schema.users.id))
      .where(eq(schema.auditions.creatorId, creatorId))
      .orderBy(desc(schema.auditions.createdAt));
  }

  async getApplicantsForAudition(auditionId: string) {
    return this.db
      .select({
        id: schema.applications.id,
        applicantId: schema.applications.applicantId,
        name: schema.users.fullName,
        category: schema.users.category,
        status: schema.applications.status,
        appliedDate: schema.applications.createdAt,
        coverLetter: schema.applications.coverLetter,
        details: schema.applications.details,
      })
      .from(schema.applications)
      .leftJoin(schema.users, eq(schema.applications.applicantId, schema.users.id))
      .where(eq(schema.applications.auditionId, auditionId))
      .orderBy(desc(schema.applications.createdAt));
  }
}
