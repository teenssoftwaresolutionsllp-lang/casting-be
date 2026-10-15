import { Inject, Injectable } from '@nestjs/common';
import { and, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_DB } from '../db/db.module';
import * as schema from '../db/schema';

@Injectable()
export class StatsRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async getLiveStats() {
    const now = new Date();
    const genderGroup = sql<string>`
      CASE
        WHEN lower(trim(${schema.users.gender})) IN ('male', 'female', 'other')
          THEN lower(trim(${schema.users.gender}))
        ELSE 'unspecified'
      END
    `;

    const [
      [userCounts],
      roles,
      crafts,
      genders,
      states,
      [auditionCounts],
      auditionCrafts,
      [applicationCounts],
      [mediaCounts],
      [storyCounts],
      [storyViewCounts],
    ] = await Promise.all([
      this.db
        .select({
          total: sql<number>`count(*)::int`,
          artists: sql<number>`count(*) filter (where ${schema.users.role} = 'artist')::int`,
          audience: sql<number>`count(*) filter (where ${schema.users.role} = 'audience')::int`,
        })
        .from(schema.users),
      this.db
        .select({
          role: schema.users.role,
          count: sql<number>`count(*)::int`,
        })
        .from(schema.users)
        .groupBy(schema.users.role),
      this.db
        .select({
          name: sql<string>`trim(${schema.users.category})`,
          count: sql<number>`count(*)::int`,
        })
        .from(schema.users)
        .where(
          and(
            sql`${schema.users.category} is not null`,
            sql`trim(${schema.users.category}) <> ''`,
          ),
        )
        .groupBy(sql`trim(${schema.users.category})`)
        .orderBy(sql`count(*) desc`),
      this.db
        .select({
          gender: genderGroup,
          count: sql<number>`count(*)::int`,
        })
        .from(schema.users)
        .groupBy(genderGroup),
      this.db
        .select({
          name: sql<string>`trim(${schema.users.state})`,
          count: sql<number>`count(*)::int`,
        })
        .from(schema.users)
        .where(
          and(
            sql`${schema.users.state} is not null`,
            sql`trim(${schema.users.state}) <> ''`,
          ),
        )
        .groupBy(sql`trim(${schema.users.state})`)
        .orderBy(sql`count(*) desc`),
      this.db
        .select({ total: sql<number>`count(*)::int` })
        .from(schema.auditions),
      this.db
        .select({
          name: schema.auditions.category,
          count: sql<number>`count(*)::int`,
        })
        .from(schema.auditions)
        .groupBy(schema.auditions.category)
        .orderBy(sql`count(*) desc`),
      this.db
        .select({ total: sql<number>`count(*)::int` })
        .from(schema.applications),
      this.db
        .select({
          total: sql<number>`count(*)::int`,
          views: sql<number>`coalesce(sum(${schema.videos.viewsCount}), 0)::int`,
        })
        .from(schema.videos),
      this.db
        .select({
          total: sql<number>`count(*)::int`,
          active: sql<number>`count(*) filter (where ${schema.stories.expiresAt} > ${now})::int`,
        })
        .from(schema.stories),
      this.db
        .select({ total: sql<number>`count(*)::int` })
        .from(schema.storyViews),
    ]);

    const roleCounts = Object.fromEntries(
      roles.map(({ role, count }) => [role, count]),
    );
    const genderCounts = Object.fromEntries(
      genders.map(({ gender, count }) => [gender, count]),
    );

    return {
      updatedAt: now.toISOString(),
      users: {
        total: userCounts.total,
        artists: userCounts.artists,
        audience: userCounts.audience,
        byRole: roleCounts,
        byCraft: crafts,
        byGender: {
          male: genderCounts.male ?? 0,
          female: genderCounts.female ?? 0,
          other: genderCounts.other ?? 0,
          unspecified: genderCounts.unspecified ?? 0,
        },
        byState: states,
      },
      auditions: {
        total: auditionCounts.total,
        byCraft: auditionCrafts,
        live: null,
        closed: null,
      },
      applications: {
        total: applicationCounts.total,
      },
      content: {
        totalMediaPosts: mediaCounts.total,
        imagePosts: null,
        videoPosts: null,
        stories: storyCounts.total,
        activeStories: storyCounts.active,
        videoViews: mediaCounts.views,
        storyViews: storyViewCounts.total,
        reach: null,
        profileViews: null,
      },
    };
  }
}
