import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { ApplicationRepository } from './application.repository';
import { AuditionRepository } from '../auditions/audition.repository';
import { ApplyDto } from './dto/apply.dto';
import { UpdateApplicationStatusDto } from './dto/update-status.dto';

@Injectable()
export class ApplicationService {
  constructor(
    private readonly applicationRepository: ApplicationRepository,
    @Inject(forwardRef(() => AuditionRepository))
    private readonly auditionRepository: AuditionRepository,
  ) {}

  async apply(auditionId: string, applicantId: string, dto: ApplyDto) {
    const audition = await this.auditionRepository.findById(auditionId);
    if (!audition) {
      throw new NotFoundException(`Audition with ID ${auditionId} not found.`);
    }

    if (audition.creatorId === applicantId) {
      throw new BadRequestException('You cannot apply to your own audition.');
    }

    const existingApp = await this.applicationRepository.findByAuditionAndApplicant(auditionId, applicantId);
    if (existingApp) {
      throw new BadRequestException('You have already applied for this audition.');
    }

    return this.applicationRepository.create({
      auditionId,
      applicantId,
      coverLetter: dto.coverLetter,
    });
  }

  async findMyApplications(applicantId: string) {
    return this.applicationRepository.findMyApplications(applicantId);
  }

  async withdraw(id: string, applicantId: string) {
    const app = await this.applicationRepository.findById(id);
    if (!app) {
      throw new NotFoundException(`Application with ID ${id} not found.`);
    }
    if (app.applicantId !== applicantId) {
      throw new ForbiddenException('You can only withdraw your own applications.');
    }
    await this.applicationRepository.delete(id);
    return { success: true };
  }

  async updateStatus(id: string, updaterId: string, dto: UpdateApplicationStatusDto) {
    const app = await this.applicationRepository.findById(id);
    if (!app) {
      throw new NotFoundException(`Application with ID ${id} not found.`);
    }
    
    // Only the creator of the audition can update the application status
    if (app.auditionCreatorId !== updaterId) {
      throw new ForbiddenException('Only the audition publisher can update the status.');
    }

    return this.applicationRepository.updateStatus(id, dto.status, dto.details);
  }
}
