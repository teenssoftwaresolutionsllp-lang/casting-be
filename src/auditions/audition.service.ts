import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
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
      location: dto.location,
      pay: dto.pay,
      deadline: dto.deadline,
      lang: dto.lang,
      desc: dto.desc,
    });
  }

  async findAll(userId: string, category?: string) {
    const list = await this.auditionRepository.findAll(category);
    
    // Annotate whether the current user has applied to this audition and who created it
    return Promise.all(
      list.map(async (a) => {
        const app = await this.applicationRepository.findByAuditionAndApplicant(a.id, userId);
        return {
          ...a,
          createdByMe: a.creatorId === userId,
          applied: !!app,
          applicationStatus: app ? app.status : null,
        };
      }),
    );
  }

  async findMyPosted(creatorId: string) {
    const list = await this.auditionRepository.findMyPosted(creatorId);
    return Promise.all(
      list.map(async (a) => {
        const applicants = await this.auditionRepository.getApplicantsForAudition(a.id);
        return {
          ...a,
          createdByMe: true,
          applicants,
        };
      }),
    );
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
}
