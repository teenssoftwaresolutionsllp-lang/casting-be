import { OtpGuardService } from './otp-guard.service';

describe('OtpGuardService', () => {
  let guard: OtpGuardService;

  beforeEach(() => {
    jest.useFakeTimers();
    guard = new OtpGuardService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('locks a phone after five failed OTP attempts', () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      guard.recordFailure('919876543210');
    }

    expect(guard.lockStatus('919876543210')).toEqual({
      locked: true,
      retryAfter: 900,
    });
  });

  it('limits sends by phone and IP and honors the cooldown', () => {
    expect(guard.checkSend('919876543210', '127.0.0.1')).toEqual({
      allowed: true,
    });
    expect(guard.checkSend('919876543210', '127.0.0.1')).toEqual({
      allowed: false,
      retryAfter: 30,
    });
  });

  it('clears failure history after successful verification', () => {
    guard.recordFailure('919876543210');
    guard.clearFailures('919876543210');

    expect(guard.lockStatus('919876543210')).toEqual({ locked: false });
  });
});
