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

    const service = new UserService(repository);

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
});
