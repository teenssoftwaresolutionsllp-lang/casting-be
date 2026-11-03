import { BadRequestException } from '@nestjs/common';
import { ApplicationService } from './application.service';

describe('ApplicationService notifications', () => {
  let service: ApplicationService;
  let applicationRepository: {
    findByAuditionAndApplicant: jest.Mock;
    create: jest.Mock;
    findById: jest.Mock;
    updateStatus: jest.Mock;
  };
  let auditionRepository: { findById: jest.Mock };
  let notificationService: {
    personalizeNotificationText: jest.Mock;
    sendPushForPersistedNotification: jest.Mock;
  };

  beforeEach(() => {
    applicationRepository = {
      findByAuditionAndApplicant: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'application-id' }),
      findById: jest.fn().mockResolvedValue({
        id: 'application-id',
        auditionId: 'audition-id',
        applicantId: 'applicant-id',
        auditionCreatorId: 'publisher-id',
        auditionTitle: 'Feature Film',
        status: 'PENDING',
      }),
      updateStatus: jest.fn().mockResolvedValue({ id: 'application-id' }),
    };
    auditionRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'audition-id',
        creatorId: 'publisher-id',
        title: 'Feature Film',
      }),
    };
    notificationService = {
      personalizeNotificationText: jest
        .fn()
        .mockImplementation((text: string) => Promise.resolve(text)),
      sendPushForPersistedNotification: jest.fn().mockResolvedValue(undefined),
    };
    service = new ApplicationService(
      applicationRepository as any,
      auditionRepository as any,
      notificationService as any,
    );
  });

  it('notifies the publisher when a new application is submitted', async () => {
    await expect(
      service.apply('audition-id', 'applicant-id', {
        coverLetter: 'My experience',
      }),
    ).resolves.toEqual({ id: 'application-id' });

    const notification = {
      userId: 'publisher-id',
      actorId: 'applicant-id',
      type: 'AUDITION_APPLIED',
      title: 'New application received',
      text: 'Someone applied for "Feature Film".',
      entityType: 'AUDITION',
      entityId: 'audition-id',
    };
    expect(applicationRepository.create).toHaveBeenCalledWith(
      {
        auditionId: 'audition-id',
        applicantId: 'applicant-id',
        coverLetter: 'My experience',
      },
      notification,
    );
    expect(
      notificationService.personalizeNotificationText,
    ).toHaveBeenCalledWith(
      'Someone applied for "Feature Film".',
      'applicant-id',
    );
    expect(
      notificationService.sendPushForPersistedNotification,
    ).toHaveBeenCalledWith(
      'publisher-id',
      'New application received',
      'Someone applied for "Feature Film".',
      notification,
    );
  });

  it('does not create an application or notification for the audition publisher', async () => {
    await expect(
      service.apply('audition-id', 'publisher-id', {
        coverLetter: 'My experience',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(applicationRepository.create).not.toHaveBeenCalled();
  });

  it('does not create a second notification for a duplicate application', async () => {
    applicationRepository.findByAuditionAndApplicant.mockResolvedValue({
      id: 'existing-application',
    });

    await expect(
      service.apply('audition-id', 'applicant-id', {
        coverLetter: 'My experience',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(applicationRepository.create).not.toHaveBeenCalled();
  });

  it('does not accept applications for closed auditions', async () => {
    auditionRepository.findById.mockResolvedValue({
      id: 'audition-id',
      creatorId: 'publisher-id',
      title: 'Feature Film',
      status: 'CLOSED',
    });

    await expect(
      service.apply('audition-id', 'applicant-id', {
        coverLetter: 'My experience',
      }),
    ).rejects.toThrow(
      'This audition is closed and is no longer accepting applications.',
    );

    expect(applicationRepository.create).not.toHaveBeenCalled();
  });

  it.each([
    [
      'SHORTLISTED',
      'APPLICATION_SHORTLISTED',
      'Application shortlisted 🎉',
      'Your application for "Feature Film" has been shortlisted.',
    ],
    [
      'ACCEPTED',
      'APPLICATION_ACCEPTED',
      'Application accepted! 🏆',
      'Congratulations! Your application for "Feature Film" has been accepted.',
    ],
    [
      'REJECTED',
      'APPLICATION_REJECTED',
      'Application update',
      'Your application for "Feature Film" was not selected this time.',
    ],
  ])(
    'notifies the applicant when the status changes to %s',
    async (status, type, title, message) => {
      await service.updateStatus('application-id', 'publisher-id', {
        status,
        details: 'Please prepare for the next step.',
      });

      expect(applicationRepository.updateStatus).toHaveBeenCalledWith(
        'application-id',
        status,
        'Please prepare for the next step.',
        {
          userId: 'applicant-id',
          actorId: 'publisher-id',
          type,
          title,
          text: `${message} Details: Please prepare for the next step.`,
          entityType: 'APPLICATION',
          entityId: 'application-id',
        },
      );
      expect(
        notificationService.sendPushForPersistedNotification,
      ).toHaveBeenCalledWith(
        'applicant-id',
        title,
        `${message} Details: Please prepare for the next step.`,
        expect.objectContaining({ type }),
      );
    },
  );

  it('notifies the applicant when the status changes to another valid status', async () => {
    applicationRepository.findById.mockResolvedValue({
      id: 'application-id',
      auditionId: 'audition-id',
      applicantId: 'applicant-id',
      auditionCreatorId: 'publisher-id',
      auditionTitle: 'Feature Film',
      status: 'SHORTLISTED',
    });

    await service.updateStatus('application-id', 'publisher-id', {
      status: 'PENDING',
      details: 'We are still reviewing your application.',
    });

    expect(applicationRepository.updateStatus).toHaveBeenCalledWith(
      'application-id',
      'PENDING',
      'We are still reviewing your application.',
      {
        userId: 'applicant-id',
        actorId: 'publisher-id',
        type: 'APPLICATION_STATUS_UPDATED',
        title: 'Application status updated',
        text: 'Your application status for "Feature Film" has been updated to PENDING. Details: We are still reviewing your application.',
        entityType: 'APPLICATION',
        entityId: 'application-id',
      },
    );
  });

  it('does not create another notification when the status is unchanged', async () => {
    applicationRepository.findById.mockResolvedValue({
      id: 'application-id',
      auditionId: 'audition-id',
      applicantId: 'applicant-id',
      auditionCreatorId: 'publisher-id',
      auditionTitle: 'Feature Film',
      status: 'SHORTLISTED',
    });

    await service.updateStatus('application-id', 'publisher-id', {
      status: 'SHORTLISTED',
      details: 'Please prepare for the next step.',
    });

    expect(applicationRepository.updateStatus).toHaveBeenCalledWith(
      'application-id',
      'SHORTLISTED',
      'Please prepare for the next step.',
      undefined,
    );
    expect(
      notificationService.sendPushForPersistedNotification,
    ).not.toHaveBeenCalled();
  });
});
