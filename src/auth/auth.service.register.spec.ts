import { AuthService } from './auth.service';

describe('AuthService registration', () => {
  it('creates an account without an email address', async () => {
    const userRepository = {
      findByUsername: jest.fn().mockResolvedValue(null),
      findByMobile: jest.fn().mockResolvedValue(null),
      findByEmail: jest.fn(),
      generateTrkCode: jest.fn().mockResolvedValue('TRK260001'),
      create: jest.fn().mockImplementation(async (user) => ({
        id: 'new-user',
        ...user,
      })),
    };
    const jwtService = { signAsync: jest.fn().mockResolvedValue('token') };
    const service = new AuthService(
      userRepository as any,
      jwtService as any,
      {} as any,
    );

    await expect(
      service.register({
        username: 'jane_doe',
        password: 'Password123!',
        role: 'artist',
        mobile: '9876543210',
        age: 28,
        gender: 'Female',
      }),
    ).resolves.toMatchObject({
      token: 'token',
      user: { id: 'new-user', email: null },
    });

    expect(userRepository.findByEmail).not.toHaveBeenCalled();
    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: null }),
    );
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ email: '' }),
    );
  });
});
