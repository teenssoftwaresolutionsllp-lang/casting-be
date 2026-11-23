import { UserService } from './user.service';

describe('UserService', () => {
  it('exploreCreators returns the expected payload with batched metrics', async () => {
    const repository = {
      exploreTalent: jest.fn().mockResolvedValue([
        {
          id: 'user-1',
          fullName: 'Alice Jones',
          category: 'Actor',
          bio: 'Talent profile',
          profilePhoto: 'photo.jpg',
          stageName: 'Alice',
        },
      ]),
      getFollowersCountByUserIds: jest.fn().mockResolvedValue({ 'user-1': 1200 }),
      getFollowStatusMap: jest.fn().mockResolvedValue({ 'user-1': true }),
      getVideosCountByUserIds: jest.fn().mockResolvedValue({ 'user-1': 7 }),
    } as any;

    const notificationService = {
      createNotification: jest.fn(),
    } as any;
    const service = new UserService(repository, notificationService);

    const result = await service.exploreCreators('current-user', 'Actor');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'user-1',
      name: 'Alice Jones',
      category: 'Actor',
      following: true,
      videosCount: 7,
      followers: '1.2K',
      handle: '@alice',
    });
  });

  it('returns a public profile to anonymous visitors without private account fields', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue({
        id: 'target-user',
        fullName: 'Alice Jones',
        email: 'alice@example.com',
        mobile: '1234567890',
        password: 'hashed-password',
        address: 'Private address',
        postalCode: '12345',
        fcmToken: 'private-token',
        profilePhoto: 'photo.jpg',
        bio: 'Talent profile',
      }),
      getFollowersCount: jest.fn().mockResolvedValue(10),
      getFollowingCount: jest.fn().mockResolvedValue(4),
      getVideosCount: jest.fn().mockResolvedValue(2),
      isFollowing: jest.fn(),
    } as any;
    const service = new UserService(
      repository,
      { createNotification: jest.fn() } as any,
      { resolveUrl: jest.fn().mockResolvedValue('https://cdn.example.com/photo.jpg') } as any,
    );

    const result = await service.getPublicProfile(undefined, 'target-user');

    expect(result.following).toBe(false);
    expect(result.details).toMatchObject({
      id: 'target-user',
      fullName: 'Alice Jones',
      profilePhoto: 'https://cdn.example.com/photo.jpg',
      bio: 'Talent profile',
    });
    expect(result.details).not.toHaveProperty('email');
    expect(result.details).not.toHaveProperty('mobile');
    expect(result.details).not.toHaveProperty('password');
    expect(result.details).not.toHaveProperty('address');
    expect(result.details).not.toHaveProperty('fcmToken');
    expect(repository.isFollowing).not.toHaveBeenCalled();
  });

  it('does not query follow status when exploring anonymously', async () => {
    const repository = {
      exploreTalent: jest.fn().mockResolvedValue([
        { id: 'user-1', fullName: 'Alice Jones', profilePhoto: null },
      ]),
      getFollowersCountByUserIds: jest.fn().mockResolvedValue({}),
      getFollowStatusMap: jest.fn(),
      getVideosCountByUserIds: jest.fn().mockResolvedValue({}),
    } as any;
    const service = new UserService(repository, { createNotification: jest.fn() } as any);

    const result = await service.exploreCreators(undefined);

    expect(result[0].following).toBe(false);
    expect(repository.getFollowStatusMap).not.toHaveBeenCalled();
  });
});
