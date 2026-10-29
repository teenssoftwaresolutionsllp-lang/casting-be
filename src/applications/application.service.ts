import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ApplicationRepository } from './application.repository';
import { AuditionRepository } from '../auditions/audition.repository';
import { NotificationService } from '../notifications/notification.service';
import { ApplyDto } from './dto/apply.dto';
import { UpdateApplicationStatusDto } from './dto/update-status.dto';

@Injectable()
export class ApplicationService {
  constructor(
    private readonly applicationRepository: ApplicationRepository,
    @Inject(forwardRef(() => AuditionRepository))
    private readonly auditionRepository: AuditionRepository,
    private readonly notificationService: NotificationService,
  ) {}

  async apply(auditionId: string, applicantId: string, dto: ApplyDto) {
    const audition = await this.auditionRepository.findById(auditionId);
    if (!audition) {
      throw new NotFoundException(`Audition with ID ${auditionId} not found.`);
    }

    if (audition.creatorId === applicantId) {
      throw new BadRequestException('You cannot apply to your own audition.');
    }

    const existingApp = await this.applicationRepository.findByAuditionAndApplicant(
      auditionId,
      applicantId,
    );
    if (existingApp) {
      throw new BadRequestException('You have already applied for this audition.');
    }

    const created = await this.applicationRepository.create({
      auditionId,
      applicantId,
      coverLetter: dto.coverLetter,
    });

    // Notify the casting director (audition owner)
    this.notificationService
      .createNotification(
        audition.creatorId,
        'New application received',
        `Someone applied for "${audition.title}".`,
        {
          actorId: applicantId,
          type: 'AUDITION_APPLIED',
          entityType: 'AUDITION',
          entityId: auditionId,
        },
      )
      .catch(() => undefined);

    return created;
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

    const updated = await this.applicationRepository.updateStatus(id, dto.status, dto.details);

    // Map status → notification type and human-readable message
    const { notifTitle, notifText, notifType } = this.resolveStatusNotification(
      dto.status,
      app.auditionTitle ?? 'your audition',
    );

    this.notificationService
      .createNotification(app.applicantId, notifTitle, notifText, {
        actorId: updaterId,
        type: notifType,
        entityType: 'APPLICATION',
        entityId: id,
      })
      .catch(() => undefined);

    return updated;
  }

  async getAuditionApplicants(auditionId: string, requesterId: string) {
    const audition = await this.auditionRepository.findById(auditionId);
    if (!audition) {
      throw new NotFoundException(`Audition with ID ${auditionId} not found.`);
    }

    // Only the audition creator (organizer) can view applicants
    if (audition.creatorId !== requesterId) {
      throw new ForbiddenException('Only the audition organizer can view applicants.');
    }

    const applicants = await this.applicationRepository.findByAuditionId(auditionId);

    return {
      auditionId: audition.id,
      auditionTitle: audition.title,
      auditionCategory: audition.category,
      auditionRole: audition.role,
      totalApplicants: applicants.length,
      applicants,
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private resolveStatusNotification(status: string, auditionTitle: string) {
    switch (status.toUpperCase()) {
      case 'SHORTLISTED':
        return {
          notifTitle: 'Application shortlisted 🎉',
          notifText: `Your application for "${auditionTitle}" has been shortlisted.`,
          notifType: 'APPLICATION_SHORTLISTED' as const,
        };
      case 'ACCEPTED':
        return {
          notifTitle: 'Application accepted! 🏆',
          notifText: `Congratulations! Your application for "${auditionTitle}" has been accepted.`,
          notifType: 'APPLICATION_ACCEPTED' as const,
        };
      case 'REJECTED':
        return {
          notifTitle: 'Application update',
          notifText: `Your application for "${auditionTitle}" was not selected this time.`,
          notifType: 'APPLICATION_REJECTED' as const,
        };
      default:
        return {
          notifTitle: 'Application status updated',
          notifText: `Your application status for "${auditionTitle}" has been updated to ${status}.`,
          notifType: 'APPLICATION_STATUS_UPDATED' as const,
        };
    }
  }
}
