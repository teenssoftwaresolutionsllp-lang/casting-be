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
      transaction: jest.fn(async (callback) => callback(transaction)),
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
});
