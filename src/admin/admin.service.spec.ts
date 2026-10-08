import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { AdminRepository } from './admin.repository';
import { AdminService } from './admin.service';

describe('AdminService user management', () => {
  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const user = {
    id: userId,
    fullName: 'Jane Doe',
    username: 'jane_doe',
    email: 'jane@example.com',
    role: 'artist',
    mobile: '+123456789',
    trkCode: 'TRK123',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    gender: null,
    dob: null,
    occupation: null,
    bio: null,
    website: null,
    instagram: null,
    facebookUrl: null,
    youtube: null,
    address: null,
    postalCode: null,
    languages: null,
    emailVerified: false,
    createdAt: new Date('2026-01-10T12:00:00.000Z'),
    updatedAt: new Date('2026-01-10T12:00:00.000Z'),
    password: 'must-not-be-returned',
    passwordResetTokenHash: 'must-not-be-returned',
  };

  function createService() {
    const storedUser = { ...user };
    const repository = {
      getUserById: jest.fn().mockResolvedValue(storedUser),
      hasDuplicateUserValue: jest.fn().mockResolvedValue(false),
      updateUser: jest.fn((_id: string, values: Record<string, unknown>) => {
        Object.assign(storedUser, values);
        return storedUser;
      }),
      deleteUser: jest.fn().mockResolvedValue(true),
      getVideosCount: jest.fn().mockResolvedValue(0),
      getAuditionsCount: jest.fn().mockResolvedValue(0),
      getApplicationsCount: jest.fn().mockResolvedValue(0),
      getStoriesCount: jest.fn().mockResolvedValue(0),
      getFollowersCount: jest.fn().mockResolvedValue(0),
      getFollowingCount: jest.fn().mockResolvedValue(0),
    };
    const service = new AdminService(
      repository as unknown as AdminRepository,
      {} as unknown as JwtService,
      {} as unknown as ActivityLogService,
    );
    return { service, repository };
  }

  it('updates only the submitted allowlisted fields and returns a sanitized profile', async () => {
    const { service, repository } = createService();

    const result = await service.updateUser(userId, {
      fullName: ' Jane Doe ',
      city: ' Pune ',
    });

    expect(repository.updateUser).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({ fullName: 'Jane Doe', city: 'Pune' }),
    );
    expect(result).toMatchObject({
      id: userId,
      fullName: 'Jane Doe',
      city: 'Pune',
      emailVerified: false,
      stats: {
        videosCount: 0,
        auditionsCount: 0,
        applicationsCount: 0,
        storiesCount: 0,
        followersCount: 0,
        followingCount: 0,
      },
    });
    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('passwordResetTokenHash');
  });

  it('rejects protected or unknown fields instead of silently ignoring them', async () => {
    const { service, repository } = createService();

    await expect(
      service.updateUser(userId, { password: 'changed' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.updateUser).not.toHaveBeenCalled();
  });

  it('rejects unsupported roles and malformed email addresses', async () => {
    const { service, repository } = createService();

    await expect(
      service.updateUser(userId, { role: 'admin' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.updateUser(userId, { email: 'not-an-email' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.updateUser).not.toHaveBeenCalled();
  });

  it('deletes existing users and returns the deleted ID', async () => {
    const { service, repository } = createService();

    await expect(service.deleteUser(userId)).resolves.toEqual({
      message: 'User deleted',
      userId,
    });
    expect(repository.deleteUser).toHaveBeenCalledWith(userId);
  });

  it('maps a blocked database deletion to a conflict response', async () => {
    const { service, repository } = createService();
    repository.deleteUser.mockRejectedValue({ code: '23503' });

    await expect(service.deleteUser(userId)).rejects.toMatchObject({
      status: 409,
      message:
        'User cannot be deleted because related records prevent deletion.',
    });
  });
});
