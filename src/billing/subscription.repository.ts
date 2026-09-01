import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { desc, eq } from 'drizzle-orm';
import { DRIZZLE_DB } from '../db/db.module';
import * as schema from '../db/schema';

@Injectable()
export class SubscriptionRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(row: typeof schema.subscriptions.$inferInsert) {
    const [created] = await this.db.insert(schema.subscriptions).values(row).returning();
    return created;
  }

  async update(id: string, patch: Partial<typeof schema.subscriptions.$inferInsert>) {
    const [updated] = await this.db
      .update(schema.subscriptions)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(schema.subscriptions.id, id))
      .returning();
    return updated;
  }

  async findByProviderOrderId(orderId: string) {
    const rows = await this.db
      .select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.providerSubscriptionId, orderId))
      .limit(1);
    return rows[0] || null;
  }

  async findByProviderPaymentId(paymentId: string) {
    const rows = await this.db
      .select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.providerPaymentId, paymentId))
      .limit(1);
    return rows[0] || null;
  }

  async listForUser(userId: string) {
    return this.db
      .select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.userId, userId))
      .orderBy(desc(schema.subscriptions.createdAt));
  }

  async insertHistory(row: typeof schema.subscriptionHistory.$inferInsert) {
    const [created] = await this.db.insert(schema.subscriptionHistory).values(row).returning();
    return created;
  }

  async listHistory(userId: string) {
    return this.db
      .select()
      .from(schema.subscriptionHistory)
      .where(eq(schema.subscriptionHistory.userId, userId))
      .orderBy(desc(schema.subscriptionHistory.changedAt));
  }
}
