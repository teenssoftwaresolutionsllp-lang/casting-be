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

    if (audition.status === 'CLOSED') {
      throw new BadRequestException(
        'This audition is closed and is no longer accepting applications.',
      );
    }

    if (audition.creatorId === applicantId) {
      throw new BadRequestException('You cannot apply to your own audition.');
    }

    const existingApp =
      await this.applicationRepository.findByAuditionAndApplicant(
        auditionId,
        applicantId,
      );
    if (existingApp) {
      throw new BadRequestException(
        'You have already applied for this audition.',
      );
    }

    const notificationText =
      await this.notificationService.personalizeNotificationText(
        `Someone applied for "${audition.title}".`,
        applicantId,
      );
    const notification = {
      userId: audition.creatorId,
      actorId: applicantId,
      type: 'AUDITION_APPLIED',
      title: 'New application received',
      text: notificationText,
      entityType: 'AUDITION',
      entityId: auditionId,
    } as const;
    const created = await this.applicationRepository.create(
      {
        auditionId,
        applicantId,
        coverLetter: dto.coverLetter,
      },
      notification,
    );

    if (created) {
      void this.notificationService.sendPushForPersistedNotification(
        notification.userId,
        notification.title,
        notification.text,
        notification,
      );
    }

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
      throw new ForbiddenException(
        'You can only withdraw your own applications.',
      );
    }
    await this.applicationRepository.delete(id);
    return { success: true };
  }

  async updateStatus(
    id: string,
    updaterId: string,
    dto: UpdateApplicationStatusDto,
  ) {
    const app = await this.applicationRepository.findById(id);
    if (!app) {
      throw new NotFoundException(`Application with ID ${id} not found.`);
    }

    // Only the creator of the audition can update the application status
    if (app.auditionCreatorId !== updaterId) {
      throw new ForbiddenException(
        'Only the audition publisher can update the status.',
      );
    }

    const auditionTitle = app.auditionTitle ?? 'your audition';
    const statusNotifications = {
      SHORTLISTED: {
        type: 'APPLICATION_SHORTLISTED',
        title: 'Application shortlisted 🎉',
        message: `Your application for "${auditionTitle}" has been shortlisted.`,
      },
      ACCEPTED: {
        type: 'APPLICATION_ACCEPTED',
        title: 'Application accepted! 🏆',
        message: `Congratulations! Your application for "${auditionTitle}" has been accepted.`,
      },
      REJECTED: {
        type: 'APPLICATION_REJECTED',
        title: 'Application update',
        message: `Your application for "${auditionTitle}" was not selected this time.`,
      },
    } as const;
    const statusNotification =
      app.status === dto.status
        ? undefined
        : (statusNotifications[
            dto.status as keyof typeof statusNotifications
          ] ?? {
            type: 'APPLICATION_STATUS_UPDATED' as const,
            title: 'Application status updated',
            message: `Your application status for "${auditionTitle}" has been updated to ${dto.status}.`,
          });

    const notification = statusNotification
      ? {
          userId: app.applicantId,
          actorId: app.auditionCreatorId,
          type: statusNotification.type,
          title: statusNotification.title,
          text: `${statusNotification.message} Details: ${dto.details}`,
          entityType: 'APPLICATION' as const,
          entityId: id,
        }
      : undefined;
    const updated = await this.applicationRepository.updateStatus(
      id,
      dto.status,
      dto.details,
      notification,
    );

    if (updated && notification) {
      void this.notificationService.sendPushForPersistedNotification(
        notification.userId,
        notification.title,
        notification.text,
        notification,
      );
    }

    return updated;
  }

  async getAuditionApplicants(auditionId: string, requesterId: string) {
    const audition = await this.auditionRepository.findById(auditionId);
    if (!audition) {
      throw new NotFoundException(`Audition with ID ${auditionId} not found.`);
    }

    // Only the audition creator (organizer) can view applicants
    if (audition.creatorId !== requesterId) {
      throw new ForbiddenException(
        'Only the audition organizer can view applicants.',
      );
    }

    const applicants =
      await this.applicationRepository.findByAuditionId(auditionId);

    return {
      auditionId: audition.id,
      auditionTitle: audition.title,
      auditionCategory: audition.category,
      auditionRole: audition.role,
      auditionStatus: audition.status,
      totalApplicants: applicants.length,
      applicants,
    };
  }
}
