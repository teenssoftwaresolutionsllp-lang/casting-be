import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc } from 'drizzle-orm';
import { DRIZZLE_DB } from '../db/db.module';
import * as schema from '../db/schema';

@Injectable()
export class ApplicationRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(application: typeof schema.applications.$inferInsert) {
    const [created] = await this.db.insert(schema.applications).values(application).returning();
    return created;
  }

  async findById(id: string) {
    const results = await this.db
      .select({
        id: schema.applications.id,
        auditionId: schema.applications.auditionId,
        applicantId: schema.applications.applicantId,
        coverLetter: schema.applications.coverLetter,
        status: schema.applications.status,
        details: schema.applications.details,
        createdAt: schema.applications.createdAt,
        auditionTitle: schema.auditions.title,
        auditionCreatorId: schema.auditions.creatorId,
      })
      .from(schema.applications)
      .leftJoin(schema.auditions, eq(schema.applications.auditionId, schema.auditions.id))
      .where(eq(schema.applications.id, id))
      .limit(1);
    return results[0] || null;
  }

  async findByAuditionAndApplicant(auditionId: string, applicantId: string) {
    const results = await this.db
      .select()
      .from(schema.applications)
      .where(
        and(
          eq(schema.applications.auditionId, auditionId),
          eq(schema.applications.applicantId, applicantId),
        ),
      )
      .limit(1);
    return results[0] || null;
  }

  async findMyApplications(applicantId: string) {
    return this.db
      .select({
        id: schema.applications.id,
        auditionId: schema.applications.auditionId,
        auditionTitle: schema.auditions.title,
        role: schema.auditions.role,
        status: schema.applications.status,
        appliedDate: schema.applications.createdAt,
        deadline: schema.auditions.deadline,
        coverLetter: schema.applications.coverLetter,
        details: schema.applications.details,
        applicantName: schema.users.fullName,
        applicantCategory: schema.users.category,
      })
      .from(schema.applications)
      .leftJoin(schema.auditions, eq(schema.applications.auditionId, schema.auditions.id))
      .leftJoin(schema.users, eq(schema.applications.applicantId, schema.users.id))
      .where(eq(schema.applications.applicantId, applicantId))
      .orderBy(desc(schema.applications.createdAt));
  }

  async updateStatus(id: string, status: string, details: string) {
    const [updated] = await this.db
      .update(schema.applications)
      .set({ status, details })
      .where(eq(schema.applications.id, id))
      .returning();
    return updated;
  }

  async delete(id: string) {
    await this.db.delete(schema.applications).where(eq(schema.applications.id, id));
  }
}
