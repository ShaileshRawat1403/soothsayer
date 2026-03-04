import { validateEnv } from './env.validation';

const baseEnv = {
  NODE_ENV: 'development',
  API_PORT: 3000,
  APP_URL: 'http://localhost:5173',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/soothsayer',
  JWT_SECRET: '12345678901234567890123456789012',
};

describe('validateEnv', () => {
  it('rejects AUTH_BYPASS in production', () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        NODE_ENV: 'production',
        AUTH_BYPASS: 'true',
      })
    ).toThrow('AUTH_BYPASS is not allowed in production');
  });

  it('allows AUTH_BYPASS outside production', () => {
    const env = validateEnv({
      ...baseEnv,
      NODE_ENV: 'development',
      AUTH_BYPASS: 'true',
    });

    expect(env.AUTH_BYPASS).toBe(true);
    expect(env.NODE_ENV).toBe('development');
  });
});
