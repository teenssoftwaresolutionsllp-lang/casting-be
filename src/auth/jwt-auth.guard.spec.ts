import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';
import { TREEKO_JWT_ALGORITHM } from './jwt.config';

const USER_ID = '123e4567-e89b-42d3-a456-426614174000';

describe('JwtAuthGuard', () => {
  const secret = `test-only-${Date.now()}-${Math.random()}`;
  const jwtService = new JwtService({
    secret,
    signOptions: {
      algorithm: TREEKO_JWT_ALGORITHM,
      expiresIn: '7d',
    },
    verifyOptions: {
      algorithms: [TREEKO_JWT_ALGORITHM],
    },
  });
  const guard = new JwtAuthGuard(jwtService);

  function makeContext(token: string): {
    context: ExecutionContext;
    request: Request & { user?: Record<string, unknown> };
  } {
    const request = {
      headers: { authorization: `Bearer ${token}` },
    } as Request & { user?: Record<string, unknown> };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    return { context, request };
  }

  it('accepts a valid HS256 token and attaches its verified claims', async () => {
    const token = await jwtService.signAsync({
      sub: USER_ID,
      email: 'user@example.invalid',
      role: 'artist',
    });
    const { context, request } = makeContext(token);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual(
      expect.objectContaining({ sub: USER_ID, role: 'artist' }),
    );
  });

  it('rejects expired tokens', async () => {
    const token = await jwtService.signAsync(
      { sub: USER_ID },
      { expiresIn: -1 },
    );
    const { context } = makeContext(token);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a token signed with another key', async () => {
    const token = await new JwtService({ secret: `${secret}-other` }).signAsync(
      { sub: USER_ID },
      { expiresIn: '7d' },
    );
    const { context } = makeContext(token);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects tokens without an expiration claim', async () => {
    const token = await new JwtService({ secret }).signAsync({ sub: USER_ID });
    const { context } = makeContext(token);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects tokens without the TreeKo user UUID subject', async () => {
    const token = await jwtService.signAsync({ sub: 'not-a-uuid' });
    const { context } = makeContext(token);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects requests without a Bearer token', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization: 'Basic token' } }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
