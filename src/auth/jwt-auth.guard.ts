import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);
    
    if (!token) {
      throw new UnauthorizedException('Authentication token is missing.');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      if (typeof payload.sub !== 'string' || !this.isUuid(payload.sub)) {
        throw new UnauthorizedException('Invalid authentication token subject.');
      }
      // We assign the payload to the request object here
      // so that we can access it in our route handlers via decorators
      // Payload is a name tag only. Quota and paid checks always re-read the database.
      request['user'] = payload;
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired authentication token.');
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }
}
