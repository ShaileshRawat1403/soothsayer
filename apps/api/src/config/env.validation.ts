import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().default(3000),
  APP_URL: z.string().url().default('http://localhost:5173'),
  
  // Database
  DATABASE_URL: z.string(),
  
  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  
  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRATION: z.string().default('15m'),
  JWT_REFRESH_EXPIRATION: z.string().default('7d'),
  
  // Session
  SESSION_SECRET: z.string().min(32).optional(),
  
  // AI Providers
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  
  // Storage
  STORAGE_TYPE: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_PATH: z.string().default('./uploads'),
  
  // Rate limiting
  RATE_LIMIT_TTL: z.coerce.number().default(60),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  
  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);
  
  if (!result.success) {
    const errorMessages = result.error.errors
      .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
      .join('\n');
    
    throw new Error(`Environment validation failed:\n${errorMessages}`);
  }
  
  return result.data;
}
