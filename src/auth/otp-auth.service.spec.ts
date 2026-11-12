import { HttpException } from '@nestjs/common';
import { OtpAuthService } from './otp-auth.service';

describe('OtpAuthService', () => {
  let service: OtpAuthService;
  let users: Record<string, jest.Mock>;
  let jwt: { signAsync: jest.Mock; verifyAsync: jest.Mock };
  let msg91: {
    sendOtp: jest.Mock;
    retryOtp: jest.Mock;
    verifyOtp: jest.Mock;
  };
  let guard: {
    checkSend: jest.Mock;
    lockStatus: jest.Mock;
    recordFailure: jest.Mock;
    clearFailures: jest.Mock;
  };
  let configValues: Record<string, string>;
  let response: { setHeader: jest.Mock };

  beforeEach(() => {
    users = {
      findByOtpPhone: jest.fn(),
      findByUsername: jest.fn(),
      findByEmail: jest.fn(),
      generateTrkCode: jest.fn().mockResolvedValue('TRK260001'),
      create: jest.fn().mockImplementation(async (values) => ({
        id: 'new-user-id',
        ...values,
      })),
      update: jest.fn().mockImplementation(async (_id, values) => ({
        id: 'existing-user-id',
        email: 'user@example.com',
        username: 'existing',
        fullName: 'Existing User',
        phone: '919876543210',
        role: 'artist',
        ...values,
      })),
    };
    jwt = {
      signAsync: jest
        .fn()
        .mockImplementation(async (payload) =>
          payload.purpose === 'otp_signup'
            ? 'signup-token'
            : payload.type === 'refresh'
              ? 'refresh-token'
              : 'access-token',
        ),
      verifyAsync: jest.fn().mockResolvedValue({
        phone: '919876543210',
        purpose: 'otp_signup',
      }),
    };
    msg91 = {
      sendOtp: jest.fn().mockResolvedValue({ ok: true }),
      retryOtp: jest.fn().mockResolvedValue({ ok: true }),
      verifyOtp: jest.fn().mockResolvedValue({ ok: true }),
    };
    guard = {
      checkSend: jest.fn().mockReturnValue({ allowed: true }),
      lockStatus: jest.fn().mockReturnValue({ locked: false }),
      recordFailure: jest.fn(),
      clearFailures: jest.fn(),
    };
    configValues = {
      NODE_ENV: 'test',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
    };
    response = { setHeader: jest.fn() };
    service = new OtpAuthService(
      users as any,
      jwt as any,
      msg91 as any,
      guard as any,
      { get: (name: string) => configValues[name] } as any,
    );
  });

  async function expectHttpError(promise: Promise<unknown>, status: number) {
    try {
      await promise;
      throw new Error('Expected request to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(status);
    }
  }

  it('sends an OTP through MSG91', async () => {
    await expect(
      service.send('+91 98765 43210', '127.0.0.1', response as any),
    ).resolves.toEqual({ success: true, resend_after_seconds: 30 });
    expect(msg91.sendOtp).toHaveBeenCalledWith('919876543210');
  });

  it('returns a gateway error when MSG91 cannot send an OTP', async () => {
    msg91.sendOtp.mockResolvedValue({ ok: false });

    await expectHttpError(
      service.send('9876543210', '127.0.0.1', response as any),
      502,
    );
  });

  it('does not count MSG91 verification outages as incorrect OTP attempts', async () => {
    msg91.verifyOtp.mockResolvedValue({ ok: false, providerError: true });

    await expectHttpError(
      service.verify('9876543210', '123456', response as any),
      502,
    );
    expect(guard.recordFailure).not.toHaveBeenCalled();
  });

  it('applies rate limits and the Retry-After header', async () => {
    guard.checkSend.mockReturnValue({ allowed: false, retryAfter: 12 });

    await expectHttpError(
      service.send('9876543210', '127.0.0.1', response as any),
      429,
    );
    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', '12');
    expect(msg91.sendOtp).not.toHaveBeenCalled();
  });

  it('rejects invalid OTPs and reports a lock after five failures', async () => {
    msg91.verifyOtp.mockResolvedValue({ ok: false });
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expectHttpError(
        service.verify('9876543210', '123456', response as any),
        401,
      );
    }
    guard.lockStatus.mockReturnValue({ locked: true, retryAfter: 60 });

    await expectHttpError(
      service.verify('9876543210', '123456', response as any),
      423,
    );
    expect(guard.recordFailure).toHaveBeenCalledTimes(5);
    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', '60');
    expect(msg91.verifyOtp).toHaveBeenCalledTimes(5);
  });

  it('logs in an existing user and verifies their phone', async () => {
    users.findByOtpPhone.mockResolvedValue({
      id: 'existing-user-id',
      email: 'user@example.com',
      username: 'existing',
      fullName: 'Existing User',
      phone: '919876543210',
      role: 'artist',
      phoneVerifiedAt: null,
    });

    await expect(
      service.verify('9876543210', '123456', response as any),
    ).resolves.toMatchObject({
      token: 'access-token',
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      user: { id: 'existing-user-id', phone: '919876543210' },
    });
    expect(users.update).toHaveBeenCalledWith(
      'existing-user-id',
      expect.objectContaining({
        phone: '919876543210',
        phoneVerifiedAt: expect.any(Date),
      }),
    );
  });

  it('returns a signup token for a verified number without an account', async () => {
    users.findByOtpPhone.mockResolvedValue(null);

    await expect(
      service.verify('9876543210', '123456', response as any),
    ).resolves.toEqual({ needs_signup: true, signup_token: 'signup-token' });
  });

  it('creates a passwordless user after validating a signup token', async () => {
    const result = await service.signup({
      signup_token: 'signup-token',
      username: 'new_user',
      email: 'NEW@example.com',
      full_name: 'New User',
    });

    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'new_user',
        email: 'new@example.com',
        fullName: 'New User',
        role: 'artist',
        phone: '919876543210',
        password: null,
        phoneVerifiedAt: expect.any(Date),
      }),
    );
    expect(result).toMatchObject({
      token: 'access-token',
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    });
  });

  it('rejects a duplicate phone when linking to another user', async () => {
    users.findByOtpPhone.mockResolvedValue({
      id: 'other-user-id',
      phone: '919876543210',
    });

    await expectHttpError(
      service.sendLink(
        'current-user-id',
        '9876543210',
        '127.0.0.1',
        response as any,
      ),
      409,
    );
    expect(msg91.sendOtp).not.toHaveBeenCalled();
  });

  it('links a phone to the authenticated user after verification', async () => {
    users.findByOtpPhone.mockResolvedValue(null);

    await expect(
      service.verifyLink(
        'current-user-id',
        '9876543210',
        '123456',
        response as any,
      ),
    ).resolves.toEqual({ success: true });
    expect(users.update).toHaveBeenCalledWith(
      'current-user-id',
      expect.objectContaining({
        phone: '919876543210',
        phoneVerifiedAt: expect.any(Date),
      }),
    );
  });

  it('uses configured test phones without calling MSG91', async () => {
    configValues.OTP_TEST_PHONES = '919876543210:123456';
    service = new OtpAuthService(
      users as any,
      jwt as any,
      msg91 as any,
      guard as any,
      { get: (name: string) => configValues[name] } as any,
    );
    users.findByOtpPhone.mockResolvedValue(null);

    await expect(
      service.send('9876543210', '127.0.0.1', response as any),
    ).resolves.toMatchObject({ success: true });
    await expect(
      service.verify('9876543210', '123456', response as any),
    ).resolves.toMatchObject({ needs_signup: true });
    expect(msg91.sendOtp).not.toHaveBeenCalled();
    expect(msg91.verifyOtp).not.toHaveBeenCalled();
  });

  it('ignores test phones in production unless explicitly enabled', async () => {
    configValues.NODE_ENV = 'production';
    configValues.OTP_TEST_PHONES = '919876543210:123456';
    service = new OtpAuthService(
      users as any,
      jwt as any,
      msg91 as any,
      guard as any,
      { get: (name: string) => configValues[name] } as any,
    );

    await service.send('9876543210', '127.0.0.1', response as any);
    expect(msg91.sendOtp).toHaveBeenCalled();
  });
});
