import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { AuditionRepository } from './audition.repository';
import { ApplicationRepository } from '../applications/application.repository';
import { CreateAuditionDto } from './dto/create-audition.dto';

@Injectable()
export class AuditionService {
  constructor(
    private readonly auditionRepository: AuditionRepository,
    // inject application repository to check if user has already applied
    @Inject(forwardRef(() => ApplicationRepository))
    private readonly applicationRepository: ApplicationRepository,
  ) {}

  async createAudition(creatorId: string, dto: CreateAuditionDto) {
    return this.auditionRepository.create({
      creatorId,
      title: dto.title,
      category: dto.category,
      role: dto.role,
      roleAgeMin: dto.roleAgeMin,
      roleAgeMax: dto.roleAgeMax,
      roleGender: dto.roleGender,
      location: dto.location,
      pay: dto.pay,
      deadline: dto.deadline,
      lang: dto.lang,
      desc: dto.desc,
    });
  }

  async findAll(userId: string, category?: string) {
    const list = await this.auditionRepository.findAllWithUserApplication(userId, category);

    return list.map((a) => ({
      id: a.id,
      creatorId: a.creatorId,
      title: a.title,
      category: a.category,
      role: a.role,
      roleAgeMin: a.roleAgeMin,
      roleAgeMax: a.roleAgeMax,
      roleGender: a.roleGender,
      location: a.location,
      pay: a.pay,
      deadline: a.deadline,
      lang: a.lang,
      desc: a.desc,
      createdAt: a.createdAt,
      contactName: a.contactName,
      createdByMe: a.creatorId === userId,
      applied: !!a.applicationId,
      applicationStatus: a.applicationStatus || null,
    }));
  }

  async findMyPosted(creatorId: string) {
    const list = await this.auditionRepository.findMyPosted(creatorId);
    if (!list.length) {
      return [];
    }

    const auditionIds = list.map((a) => a.id);
    const applicantsMap = await this.auditionRepository.getApplicantsForAuditionIds(auditionIds);

    return list.map((a) => ({
      ...a,
      createdByMe: true,
      applicants: applicantsMap[a.id] || [],
    }));
  }

  async findOne(id: string, userId: string) {
    const audition = await this.auditionRepository.findById(id);
    if (!audition) {
      throw new NotFoundException(`Audition with ID ${id} not found.`);
    }

    const createdByMe = audition.creatorId === userId;
    const app = await this.applicationRepository.findByAuditionAndApplicant(id, userId);
    
    let applicants: any[] = [];
    if (createdByMe) {
      applicants = await this.auditionRepository.getApplicantsForAudition(id);
    }

    return {
      ...audition,
      createdByMe,
      applied: !!app,
      applicationStatus: app ? app.status : null,
      applicationDetails: app ? app.details : null,
      applicants, // empty array if not creator
    };
  }

  async deleteAudition(id: string, userId: string, isAdmin = false) {
    const audition = await this.auditionRepository.findById(id);
    if (!audition) {
      throw new NotFoundException(`Audition with ID ${id} not found.`);
    }
    if (audition.creatorId !== userId && !isAdmin) {
      throw new ForbiddenException('Only the audition creator or an admin can delete it.');
    }

    const deleted = await this.auditionRepository.deleteById(id);
    if (!deleted) {
      throw new NotFoundException(`Audition with ID ${id} not found.`);
    }
    return { deleted: true };
  }
}
