import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { FACE_VERIFICATION_PURPOSE } from './require-face-verification.decorator';

interface FaceTokenPayload {
  sub?: unknown;
  fv?: unknown;
  purpose?: unknown;
}

@Injectable()
export class FaceVerifiedGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const purpose = this.reflector.getAllAndOverride<string>(
      FACE_VERIFICATION_PURPOSE,
      [context.getHandler(), context.getClass()],
    );
    if (!purpose) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: { sub?: string } }>();
    const token = request.header('X-Face-Token');
    if (!token) {
      throw new UnauthorizedException({ code: 'FACE_VERIFICATION_REQUIRED' });
    }

    let payload: FaceTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<FaceTokenPayload>(token);
    } catch {
      throw new UnauthorizedException({ code: 'FACE_VERIFICATION_REQUIRED' });
    }

    if (
      payload.fv !== true ||
      payload.sub !== request.user?.sub ||
      payload.purpose !== purpose
    ) {
      throw new UnauthorizedException({ code: 'FACE_VERIFICATION_REQUIRED' });
    }
    return true;
  }
}
