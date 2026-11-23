import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];

    if (!request.headers.authorization) {
      return true;
    }

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authentication token.');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      if (typeof payload.sub !== 'string' || !this.isUuid(payload.sub)) {
        throw new UnauthorizedException('Invalid authentication token subject.');
      }
      request['user'] = payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired authentication token.');
    }

    return true;
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}
