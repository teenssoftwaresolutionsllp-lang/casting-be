import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AdminRepository } from './admin.repository';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly adminRepository: AdminRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Authentication token is missing.');
    }

    let payload: Record<string, unknown>;
    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException(
        'Invalid or expired authentication token.',
      );
    }

    if (
      payload.isAdmin !== true ||
      typeof payload.sub !== 'string' ||
      (payload.adminRole !== 'admin' && payload.adminRole !== 'super_admin')
    ) {
      throw new ForbiddenException('Admin access only.');
    }

    const admin = await this.adminRepository.findAdminById(payload.sub);
    if (!admin || !admin.isActive || admin.role !== payload.adminRole) {
      throw new ForbiddenException('Admin access is not authorized.');
    }

    request['adminUser'] = payload;
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
