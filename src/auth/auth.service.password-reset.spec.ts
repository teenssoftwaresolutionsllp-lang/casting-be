import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as crypto from 'crypto';
jest.mock('./firebase.service', () => ({ FirebaseService: class {} }));
import { AuthService } from './auth.service';

const originalFetch = global.fetch;
const originalEnvironment = {
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  BACKEND_URL: process.env.BACKEND_URL,
  FRONTEND_URL: process.env.FRONTEND_URL,
  NODE_ENV: process.env.NODE_ENV,
  PASSWORD_RESET_DEV_MODE: process.env.PASSWORD_RESET_DEV_MODE,
};

describe('AuthService - Password Reset', () => {
  let authService: AuthService;
  let mockUserRepo: any;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    process.env.RESEND_API_KEY = 'test-resend-key';
    process.env.RESEND_FROM_EMAIL = 'Casting <no-reply@example.com>';
    process.env.BACKEND_URL = 'https://casting-api.example.com/';
    process.env.FRONTEND_URL = 'https://casting.example.com/';
    process.env.NODE_ENV = 'test';
    process.env.PASSWORD_RESET_DEV_MODE = 'false';

    mockUserRepo = {
      findByEmail: jest.fn(),
      setPasswordResetToken: jest.fn(),
      clearPasswordResetToken: jest.fn(),
      resetPasswordWithToken: jest.fn(),
    };
    authService = new AuthService(
      mockUserRepo,
      { signAsync: jest.fn() } as any,
      {} as any,
    );
    fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    global.fetch = fetchMock as any;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    for (const [name, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  });

  it('sends a single-use reset link and stores only its hash', async () => {
    mockUserRepo.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
    });

    const result = await authService.forgotPassword({
      email: 'user@example.com',
    });

    expect(result.message).toContain('If an account exists');
    expect(mockUserRepo.setPasswordResetToken).toHaveBeenCalledWith(
      'user-1',
      expect.stringMatching(/^[a-f0-9]{64}$/),
      expect.any(Date),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    const resetUrl = new URL(body.text.match(/https:\/\/[^\s]+/)![0]);
    const token = resetUrl.searchParams.get('token');
    if (token === null) {
      throw new Error('Reset email did not contain a token.');
    }
    expect(resetUrl.origin + resetUrl.pathname).toBe(
      'https://casting-api.example.com/auth/reset-password',
    );
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(mockUserRepo.setPasswordResetToken.mock.calls[0][1]).toBe(
      crypto.createHash('sha256').update(token).digest('hex'),
    );
    expect(body.to).toEqual(['user@example.com']);
  });

  it('requires a backend URL rather than linking to the frontend app', async () => {
    delete process.env.BACKEND_URL;
    mockUserRepo.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
    });

    await expect(
      authService.forgotPassword({ email: 'user@example.com' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(mockUserRepo.findByEmail).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns the same response for an unknown email without sending mail', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null);

    const result = await authService.forgotPassword({
      email: 'unknown@example.com',
    });

    expect(result.message).toContain('If an account exists');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns a reset token for Swagger testing in development mode', async () => {
    process.env.NODE_ENV = 'development';
    process.env.PASSWORD_RESET_DEV_MODE = 'true';
    mockUserRepo.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
    });

    const result = await authService.forgotPassword({
      email: 'user@example.com',
    });

    const resetToken = result.resetToken;
    if (typeof resetToken !== 'string') {
      throw new Error('Development reset response did not contain a token.');
    }
    expect(resetToken).toMatch(/^[a-f0-9]{64}$/);
    expect(mockUserRepo.setPasswordResetToken).toHaveBeenCalledWith(
      'user-1',
      crypto.createHash('sha256').update(resetToken).digest('hex'),
      expect.any(Date),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not expose reset tokens when running in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.PASSWORD_RESET_DEV_MODE = 'true';
    mockUserRepo.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
    });

    const result = await authService.forgotPassword({
      email: 'user@example.com',
    });

    expect(result).not.toHaveProperty('resetToken');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not expose reset tokens when NODE_ENV is unset', async () => {
    delete process.env.NODE_ENV;
    process.env.PASSWORD_RESET_DEV_MODE = 'true';
    mockUserRepo.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
    });

    const result = await authService.forgotPassword({
      email: 'user@example.com',
    });

    expect(result).not.toHaveProperty('resetToken');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('clears the token and reports an email delivery failure', async () => {
    mockUserRepo.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
    });
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    await expect(
      authService.forgotPassword({ email: 'user@example.com' }),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(mockUserRepo.clearPasswordResetToken).toHaveBeenCalledWith(
      'user-1',
      expect.stringMatching(/^[a-f0-9]{64}$/),
    );
  });

  it('hashes the new password and consumes a valid reset token', async () => {
    mockUserRepo.resetPasswordWithToken.mockResolvedValue(true);
    const token = 'a'.repeat(64);

    const result = await authService.resetPassword({
      token,
      password: 'NewPassword123!',
    });

    expect(result.message).toBe('Password successfully reset.');
    expect(mockUserRepo.resetPasswordWithToken).toHaveBeenCalledWith(
      crypto.createHash('sha256').update(token).digest('hex'),
      expect.not.stringMatching(/^NewPassword123!$/),
    );
  });

  it('rejects invalid or expired reset tokens', async () => {
    mockUserRepo.resetPasswordWithToken.mockResolvedValue(false);

    await expect(
      authService.resetPassword({
        token: 'a'.repeat(64),
        password: 'NewPassword123!',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
