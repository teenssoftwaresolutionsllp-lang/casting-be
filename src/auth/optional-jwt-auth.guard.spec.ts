import { UnauthorizedException } from '@nestjs/common';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';

describe('OptionalJwtAuthGuard', () => {
  const contextFor = (request: Record<string, any>) =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
    }) as any;

  it('allows requests without an authorization header', async () => {
    const jwtService = { verifyAsync: jest.fn() };
    const guard = new OptionalJwtAuthGuard(jwtService as any);
    const request = { headers: {} };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('attaches the user when a valid bearer token is supplied', async () => {
    const jwtService = {
      verifyAsync: jest.fn().mockResolvedValue({
        sub: '00000000-0000-4000-8000-000000000001',
      }),
    };
    const guard = new OptionalJwtAuthGuard(jwtService as any);
    const request = {
      headers: { authorization: 'Bearer valid-token' },
    };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request['user']).toEqual({
      sub: '00000000-0000-4000-8000-000000000001',
    });
  });

  it('rejects invalid bearer tokens instead of treating them as anonymous', async () => {
    const jwtService = {
      verifyAsync: jest.fn().mockRejectedValue(new Error('invalid token')),
    };
    const guard = new OptionalJwtAuthGuard(jwtService as any);
    const request = {
      headers: { authorization: 'Bearer invalid-token' },
    };

    await expect(guard.canActivate(contextFor(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
