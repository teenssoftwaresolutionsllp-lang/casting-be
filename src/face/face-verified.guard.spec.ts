import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { FaceVerifiedGuard } from './face-verified.guard';
import {
  FACE_VERIFICATION_PURPOSE,
  RequireFaceVerification,
} from './require-face-verification.decorator';

describe('FaceVerifiedGuard', () => {
  const handler = jest.fn();
  let guard: FaceVerifiedGuard;
  let jwtService: { verifyAsync: jest.Mock };
  let request: { user: { sub: string }; header: jest.Mock };
  let context: ExecutionContext;

  beforeEach(() => {
    Reflect.defineMetadata(
      FACE_VERIFICATION_PURPOSE,
      'manage-account',
      handler,
    );
    jwtService = {
      verifyAsync: jest.fn().mockResolvedValue({
        sub: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        fv: true,
        purpose: 'manage-account',
      }),
    };
    request = {
      user: { sub: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' },
      header: jest.fn().mockReturnValue('face-token'),
    };
    context = {
      getHandler: () => handler,
      getClass: () => class TestController {},
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    guard = new FaceVerifiedGuard(
      new Reflector(),
      jwtService as unknown as JwtService,
    );
  });

  it('accepts a valid face token for the required purpose and same user', async () => {
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('rejects a face token with a different purpose or user', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'another-user',
      fv: true,
      purpose: 'manage-account',
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects missing or invalid face tokens', async () => {
    request.header.mockReturnValue(undefined);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    request.header.mockReturnValue('expired');
    jwtService.verifyAsync.mockRejectedValue(new Error('expired'));
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('exports a purpose metadata decorator for protected routes', () => {
    class ProtectedController {
      @RequireFaceVerification('manage-account')
      protectedAction(this: void) {}
    }

    expect(
      Reflect.getMetadata(
        FACE_VERIFICATION_PURPOSE,
        ProtectedController.prototype.protectedAction,
      ),
    ).toBe('manage-account');
  });
});
