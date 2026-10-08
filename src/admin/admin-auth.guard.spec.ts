import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminRepository } from './admin.repository';
import { AdminAuthGuard } from './admin-auth.guard';

describe('AdminAuthGuard', () => {
  const adminId = '550e8400-e29b-41d4-a716-446655440000';

  function createContext(authorization?: string): ExecutionContext {
    const request = { headers: { authorization } };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  }

  it('rejects requests without a bearer token', async () => {
    const jwtService = { verifyAsync: jest.fn() };
    const repository = { findAdminById: jest.fn() };
    const guard = new AdminAuthGuard(
      jwtService as unknown as JwtService,
      repository as unknown as AdminRepository,
    );

    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('rejects regular user tokens even when their JWT is valid', async () => {
    const jwtService = {
      verifyAsync: jest
        .fn()
        .mockResolvedValue({ sub: adminId, role: 'artist' }),
    };
    const repository = { findAdminById: jest.fn() };
    const guard = new AdminAuthGuard(
      jwtService as unknown as JwtService,
      repository as unknown as AdminRepository,
    );

    await expect(
      guard.canActivate(createContext('Bearer valid-user-token')),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.findAdminById).not.toHaveBeenCalled();
  });

  it('requires the token to belong to a currently active admin account', async () => {
    const jwtService = {
      verifyAsync: jest.fn().mockResolvedValue({
        sub: adminId,
        adminRole: 'admin',
        isAdmin: true,
      }),
    };
    const repository = {
      findAdminById: jest.fn().mockResolvedValue({
        id: adminId,
        role: 'admin',
        isActive: false,
      }),
    };
    const guard = new AdminAuthGuard(
      jwtService as unknown as JwtService,
      repository as unknown as AdminRepository,
    );

    await expect(
      guard.canActivate(createContext('Bearer valid-admin-token')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows an active admin whose role matches the signed token', async () => {
    const jwtService = {
      verifyAsync: jest.fn().mockResolvedValue({
        sub: adminId,
        adminRole: 'admin',
        isAdmin: true,
      }),
    };
    const repository = {
      findAdminById: jest.fn().mockResolvedValue({
        id: adminId,
        role: 'admin',
        isActive: true,
      }),
    };
    const guard = new AdminAuthGuard(
      jwtService as unknown as JwtService,
      repository as unknown as AdminRepository,
    );

    await expect(
      guard.canActivate(createContext('Bearer valid-admin-token')),
    ).resolves.toBe(true);
  });
});
