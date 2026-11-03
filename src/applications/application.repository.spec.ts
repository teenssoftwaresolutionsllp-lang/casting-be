import { ApplicationRepository } from './application.repository';

describe('ApplicationRepository notifications', () => {
  it('commits an audition application and its notification together', async () => {
    const application = { id: 'application-id' };
    const applicationInsert = {
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([application]),
    };
    const notificationInsert = {
      values: jest.fn().mockResolvedValue(undefined),
    };
    const transaction = {
      insert: jest
        .fn()
        .mockReturnValueOnce(applicationInsert)
        .mockReturnValueOnce(notificationInsert),
    };
    const db = {
      transaction: jest.fn(
        (callback: (tx: typeof transaction) => Promise<unknown>) =>
          Promise.resolve(callback(transaction)),
      ),
    };
    const repository = new ApplicationRepository(db as any);
    const notification = {
      userId: 'publisher-id',
      actorId: 'applicant-id',
      type: 'AUDITION_APPLIED',
      title: 'New audition application',
      text: 'Someone applied for "Feature Film".',
      entityType: 'AUDITION',
      entityId: 'audition-id',
    };

    await expect(
      repository.create(
        {
          auditionId: 'audition-id',
          applicantId: 'applicant-id',
          coverLetter: 'My experience',
        },
        notification,
      ),
    ).resolves.toBe(application);

    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(transaction.insert).toHaveBeenCalledTimes(2);
    expect(notificationInsert.values).toHaveBeenCalledWith(notification);
  });

  it('commits an application status change and its notification together', async () => {
    const updatedApplication = { id: 'application-id', status: 'SHORTLISTED' };
    const updateQuery = {
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([updatedApplication]),
    };
    const notificationInsert = {
      values: jest.fn().mockResolvedValue(undefined),
    };
    const transaction = {
      update: jest.fn().mockReturnValue(updateQuery),
      insert: jest.fn().mockReturnValue(notificationInsert),
    };
    const db = {
      transaction: jest.fn(
        (callback: (tx: typeof transaction) => Promise<unknown>) =>
          Promise.resolve(callback(transaction)),
      ),
    };
    const repository = new ApplicationRepository(db as any);
    const notification = {
      userId: 'applicant-id',
      actorId: 'publisher-id',
      type: 'APPLICATION_SHORTLISTED',
      title: 'You have been shortlisted',
      text: 'Your application has been shortlisted.',
      entityType: 'APPLICATION',
      entityId: 'application-id',
    };

    await expect(
      repository.updateStatus(
        'application-id',
        'SHORTLISTED',
        'Prepare for callback',
        notification,
      ),
    ).resolves.toBe(updatedApplication);

    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(updateQuery.set).toHaveBeenCalledWith({
      status: 'SHORTLISTED',
      details: 'Prepare for callback',
    });
    expect(notificationInsert.values).toHaveBeenCalledWith(notification);
  });
});
