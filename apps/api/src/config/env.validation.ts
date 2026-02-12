import { z } from 'zod';

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
      return true;
    }
    if (['0', 'false', 'no', 'off', ''].includes(normalized)) {
      return false;
    }
  }
  return value;
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().default(3000),
  APP_URL: z.string().url().default('http://localhost:5173'),
  CORS_ORIGINS: z.string().optional(),
  
  // Database
  DATABASE_URL: z.string(),
  
  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_TLS: booleanFromEnv.default(false),
  WS_REDIS_ENABLED: booleanFromEnv.default(false),
  WS_REDIS_FORCE_IN_DEV: booleanFromEnv.default(false),
  
  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRATION: z.string().default('15m'),
  JWT_REFRESH_EXPIRATION: z.string().default('7d'),
  AUTH_BYPASS: booleanFromEnv.default(false),
  AUTH_BYPASS_EMAIL: z.string().email().default('admin@soothsayer.local'),
  AUTH_BYPASS_NAME: z.string().default('Admin User'),
  
  // Session
  SESSION_SECRET: z.string().min(32).optional(),
  
  // AI Providers
  OPENAI_BASE_URL: z.string().url().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GROQ_BASE_URL: z.string().url().optional(),
  GROQ_API_KEY: z.string().optional(),
  OLLAMA_BASE_URL: z.string().url().optional(),
  OLLAMA_KEEP_ALIVE: z.string().optional(),
  OLLAMA_NUM_PREDICT: z.coerce.number().positive().optional(),
  OLLAMA_NUM_CTX: z.coerce.number().positive().optional(),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().positive().optional(),
  AWS_REGION: z.string().optional(),
  BEDROCK_MODEL_ID: z.string().optional(),
  BEDROCK_MAX_TOKENS: z.coerce.number().positive().optional(),
  BEDROCK_MAX_RETRIES: z.coerce.number().min(0).max(10).optional(),
  BEDROCK_BASE_BACKOFF_MS: z.coerce.number().positive().optional(),
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
