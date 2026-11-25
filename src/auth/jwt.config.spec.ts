import {
  createTreeKoJwtOptions,
  TREEKO_JWT_ALGORITHM,
  TREEKO_JWT_EXPIRATION,
} from './jwt.config';

describe('TreeKo JWT configuration', () => {
  it('requires an explicitly configured signing secret', () => {
    expect(() => createTreeKoJwtOptions(undefined)).toThrow(
      'JWT_SECRET must be explicitly configured before startup.',
    );
    expect(() => createTreeKoJwtOptions('   ')).toThrow(
      'JWT_SECRET must be explicitly configured before startup.',
    );
  });

  it('pins signing and verification to HS256 with the existing seven-day TTL', () => {
    const options = createTreeKoJwtOptions(' isolated-test-secret ');

    expect(options).toEqual({
      secret: 'isolated-test-secret',
      signOptions: {
        algorithm: TREEKO_JWT_ALGORITHM,
        expiresIn: TREEKO_JWT_EXPIRATION,
      },
      verifyOptions: {
        algorithms: [TREEKO_JWT_ALGORITHM],
      },
    });
  });
});
