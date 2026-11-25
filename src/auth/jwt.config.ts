import { JwtModuleOptions } from '@nestjs/jwt';

export const TREEKO_JWT_ALGORITHM = 'HS256' as const;
export const TREEKO_JWT_EXPIRATION = '7d' as const;

export function createTreeKoJwtOptions(secret: string | undefined): JwtModuleOptions {
  const signingSecret = typeof secret === 'string' ? secret.trim() : '';
  if (!signingSecret) {
    throw new Error('JWT_SECRET must be explicitly configured before startup.');
  }

  return {
    secret: signingSecret,
    signOptions: {
      algorithm: TREEKO_JWT_ALGORITHM,
      expiresIn: TREEKO_JWT_EXPIRATION,
    },
    verifyOptions: {
      algorithms: [TREEKO_JWT_ALGORITHM],
    },
  };
}
