import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService password login', () => {
  it('preserves the existing token-and-user password login response', async () => {
    const repository = {
      findByMobile: jest.fn().mockResolvedValue({
        id: 'existing-user',
        email: 'user@example.com',
        username: 'existing',
        fullName: 'Existing User',
        mobile: '919876543210',
        password: await bcrypt.hash('valid-password', 4),
        role: 'artist',
        profilePhoto: null,
        trkCode: 'TRK260001',
      }),
    };
    const jwt = { signAsync: jest.fn().mockResolvedValue('existing-token') };
    const service = new AuthService(repository as any, jwt as any, {} as any);

    await expect(
      service.login({
        identifier: '919876543210',
        password: 'valid-password',
      }),
    ).resolves.toMatchObject({
      token: 'existing-token',
      user: { id: 'existing-user', username: 'existing' },
    });
  });

  it('rejects OTP-only accounts that have no password hash', async () => {
    const repository = {
      findByMobile: jest.fn().mockResolvedValue({
        id: 'phone-user',
        password: null,
      }),
    };
    const service = new AuthService(repository as any, {} as any, {} as any);

    await expect(
      service.login({ identifier: '919876543210', password: 'anything' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
