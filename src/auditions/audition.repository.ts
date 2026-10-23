import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc, inArray } from 'drizzle-orm';
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

  async deleteById(id: string) {
    const [deleted] = await this.db
      .delete(schema.auditions)
      .where(eq(schema.auditions.id, id))
      .returning({ id: schema.auditions.id });
    return deleted || null;
  }

  async findById(id: string) {
    const results = await this.db
      .select({
        id: schema.auditions.id,
        creatorId: schema.auditions.creatorId,
        title: schema.auditions.title,
        category: schema.auditions.category,
        role: schema.auditions.role,
        roleAgeMin: schema.auditions.roleAgeMin,
        roleAgeMax: schema.auditions.roleAgeMax,
        roleGender: schema.auditions.roleGender,
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
        roleAgeMin: schema.auditions.roleAgeMin,
        roleAgeMax: schema.auditions.roleAgeMax,
        roleGender: schema.auditions.roleGender,
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

  async findAllWithUserApplication(userId: string, category?: string) {
    const query = this.db
      .select({
        id: schema.auditions.id,
        creatorId: schema.auditions.creatorId,
        title: schema.auditions.title,
        category: schema.auditions.category,
        role: schema.auditions.role,
        roleAgeMin: schema.auditions.roleAgeMin,
        roleAgeMax: schema.auditions.roleAgeMax,
        roleGender: schema.auditions.roleGender,
        location: schema.auditions.location,
        pay: schema.auditions.pay,
        deadline: schema.auditions.deadline,
        lang: schema.auditions.lang,
        desc: schema.auditions.desc,
        createdAt: schema.auditions.createdAt,
        contactName: schema.users.fullName,
        applicationId: schema.applications.id,
        applicationStatus: schema.applications.status,
      })
      .from(schema.auditions)
      .leftJoin(schema.users, eq(schema.auditions.creatorId, schema.users.id))
      .leftJoin(
        schema.applications,
        and(
          eq(schema.applications.auditionId, schema.auditions.id),
          eq(schema.applications.applicantId, userId),
        ),
      );

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
        roleAgeMin: schema.auditions.roleAgeMin,
        roleAgeMax: schema.auditions.roleAgeMax,
        roleGender: schema.auditions.roleGender,
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
        email: schema.users.email,
        mobile: schema.users.mobile,
        trkCode: schema.users.trkCode,
        profilePhoto: schema.users.profilePhoto,
        role: schema.users.role,
        gender: schema.users.gender,
        age: schema.users.age,
        dob: schema.users.dob,
        category: schema.users.category,
        experience: schema.users.experience,
        skills: schema.users.skills,
        languages: schema.users.languages,
        preferredLanguage: schema.users.preferredLanguage,
        qualification: schema.users.qualification,
        institute: schema.users.institute,
        occupation: schema.users.occupation,
        union: schema.users.union,
        height: schema.users.height,
        weight: schema.users.weight,
        bodyType: schema.users.bodyType,
        skinTone: schema.users.skinTone,
        hairColor: schema.users.hairColor,
        eyeColor: schema.users.eyeColor,
        preferredRole: schema.users.preferredRole,
        availableFor: schema.users.availableFor,
        travelAvailability: schema.users.travelAvailability,
        nightShoots: schema.users.nightShoots,
        relocate: schema.users.relocate,
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
        country: schema.users.country,
        state: schema.users.state,
        city: schema.users.city,
        address: schema.users.address,
        postalCode: schema.users.postalCode,
        stageName: schema.users.stageName,
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

  async getApplicantsForAuditionIds(auditionIds: string[]): Promise<Record<string, any[]>> {
    if (!auditionIds.length) return {};

    const rows = await this.db
      .select({
        id: schema.applications.id,
        auditionId: schema.applications.auditionId,
        applicantId: schema.applications.applicantId,
        name: schema.users.fullName,
        email: schema.users.email,
        mobile: schema.users.mobile,
        trkCode: schema.users.trkCode,
        profilePhoto: schema.users.profilePhoto,
        role: schema.users.role,
        gender: schema.users.gender,
        age: schema.users.age,
        dob: schema.users.dob,
        category: schema.users.category,
        experience: schema.users.experience,
        skills: schema.users.skills,
        languages: schema.users.languages,
        preferredLanguage: schema.users.preferredLanguage,
        qualification: schema.users.qualification,
        institute: schema.users.institute,
        occupation: schema.users.occupation,
        union: schema.users.union,
        height: schema.users.height,
        weight: schema.users.weight,
        bodyType: schema.users.bodyType,
        skinTone: schema.users.skinTone,
        hairColor: schema.users.hairColor,
        eyeColor: schema.users.eyeColor,
        preferredRole: schema.users.preferredRole,
        availableFor: schema.users.availableFor,
        travelAvailability: schema.users.travelAvailability,
        nightShoots: schema.users.nightShoots,
        relocate: schema.users.relocate,
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
        country: schema.users.country,
        state: schema.users.state,
        city: schema.users.city,
        address: schema.users.address,
        postalCode: schema.users.postalCode,
        stageName: schema.users.stageName,
        status: schema.applications.status,
        appliedDate: schema.applications.createdAt,
        coverLetter: schema.applications.coverLetter,
        details: schema.applications.details,
      })
      .from(schema.applications)
      .leftJoin(schema.users, eq(schema.applications.applicantId, schema.users.id))
      .where(inArray(schema.applications.auditionId, auditionIds))
      .orderBy(desc(schema.applications.createdAt));

    const map: Record<string, any[]> = {};
    for (const row of rows) {
      const { auditionId, ...applicantData } = row;
      if (!map[auditionId]) {
        map[auditionId] = [];
      }
      map[auditionId].push(applicantData);
    }
    return map;
  }
}

