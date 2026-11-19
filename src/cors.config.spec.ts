import { getCorsOptions, DEFAULT_DEVELOPMENT_ORIGINS } from './cors.config';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

describe('CORS Configuration Hardening (Phase 10H.1)', () => {
  type OriginCallback = (err: Error | null, allow?: boolean) => void;

  function testOrigin(options: CorsOptions, origin: string | undefined): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const originFn = options.origin as (origin: string | undefined, callback: OriginCallback) => void;
      originFn(origin, (err, allow) => {
        if (err) {
          reject(err);
        } else {
          resolve(!!allow);
        }
      });
    });
  }

  describe('Development Mode', () => {
    it('allows undefined origin (mobile apps, Dio, curl)', async () => {
      const options = getCorsOptions('development', '');
      const allowed = await testOrigin(options, undefined);
      expect(allowed).toBe(true);
    });

    it('allows default development origins', async () => {
      const options = getCorsOptions('development', '');
      for (const origin of DEFAULT_DEVELOPMENT_ORIGINS) {
        const allowed = await testOrigin(options, origin);
        expect(allowed).toBe(true);
      }
    });

    it('rejects unknown origins not in development allowlist', async () => {
      const options = getCorsOptions('development', '');
      await expect(testOrigin(options, 'https://malicious-site.example.com')).rejects.toThrow(
        /CORS blocked: Origin https:\/\/malicious-site.example.com is not allowed/,
      );
    });
  });

  describe('Production Mode', () => {
    it('throws error if wildcard (*) is specified in production', () => {
      expect(() => {
        getCorsOptions('production', 'https://app.treeko.com, *');
      }).toThrow('[CORS] Wildcard origin (*) is strictly prohibited in production.');
    });

    it('allows approved production origins', async () => {
      const options = getCorsOptions('production', 'https://app.treeko.com, https://admin.treeko.com');
      const allowed1 = await testOrigin(options, 'https://app.treeko.com');
      const allowed2 = await testOrigin(options, 'https://admin.treeko.com');
      expect(allowed1).toBe(true);
      expect(allowed2).toBe(true);
    });

    it('rejects unapproved origin in production', async () => {
      const options = getCorsOptions('production', 'https://app.treeko.com');
      await expect(testOrigin(options, 'https://evil.com')).rejects.toThrow(
        /CORS blocked: Origin https:\/\/evil.com is not allowed/,
      );
    });

    it('allows mobile client undefined origin in production', async () => {
      const options = getCorsOptions('production', 'https://app.treeko.com');
      const allowed = await testOrigin(options, undefined);
      expect(allowed).toBe(true);
    });

    it('exposes correct HTTP methods and headers for preflight', () => {
      const options = getCorsOptions('production', 'https://app.treeko.com');
      expect(options.methods).toContain('GET');
      expect(options.methods).toContain('POST');
      expect(options.methods).toContain('OPTIONS');
      expect(options.credentials).toBe(true);
      expect(options.maxAge).toBe(86400);
    });
  });
});
