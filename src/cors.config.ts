import { INestApplication } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export const DEFAULT_DEVELOPMENT_ORIGINS: readonly string[] = Object.freeze([
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
  'http://10.0.2.2:3000',
  'http://10.0.2.2:5000',
]);

export function getCorsOptions(
  nodeEnv = process.env.NODE_ENV,
  rawAllowedOrigins = process.env.ALLOWED_ORIGINS || process.env.CORS_ALLOWED_ORIGINS,
): CorsOptions {
  const isProduction = nodeEnv === 'production';
  const configuredOrigins = (rawAllowedOrigins || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (isProduction && configuredOrigins.includes('*')) {
    throw new Error('[CORS] Wildcard origin (*) is strictly prohibited in production.');
  }

  const allowedOrigins: readonly string[] = configuredOrigins.length > 0
    ? configuredOrigins
    : (isProduction ? [] : DEFAULT_DEVELOPMENT_ORIGINS);

  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow non-browser requests (e.g. mobile native app, server-to-server) where Origin is undefined
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked: Origin ${origin} is not allowed.`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Length', 'X-Request-Id'],
    credentials: true,
    maxAge: 86400,
  };
}

export function configureCors(app: INestApplication): void {
  const options = getCorsOptions();
  app.enableCors(options);
}
