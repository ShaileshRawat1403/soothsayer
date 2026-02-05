import { z } from 'zod';

// Common validation schemas

// Email validation
export const emailSchema = z.string().email('Invalid email address').toLowerCase().trim();

// Password validation
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// Slug validation
export const slugSchema = z
  .string()
  .min(2, 'Slug must be at least 2 characters')
  .max(50, 'Slug must be at most 50 characters')
  .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
  .refine((val) => !val.startsWith('-') && !val.endsWith('-'), {
    message: 'Slug cannot start or end with a hyphen',
  });

// Name validation
export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must be at most 100 characters')
  .trim();

// UUID validation
export const uuidSchema = z.string().uuid('Invalid UUID');

// Pagination validation
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Sort validation
export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Date range validation
export const dateRangeSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.startDate <= data.endDate;
    }
    return true;
  },
  { message: 'Start date must be before end date' }
);

// URL validation
export const urlSchema = z.string().url('Invalid URL');

// Path validation (prevent traversal)
export const safePathSchema = z
  .string()
  .refine(
    (path) => {
      // Check for path traversal attempts
      const normalized = path.replace(/\\/g, '/');
      return (
        !normalized.includes('..') &&
        !normalized.includes('//') &&
        !normalized.startsWith('/') &&
        !normalized.includes('\0')
      );
    },
    { message: 'Invalid path: potential path traversal detected' }
  );

// JSON validation
export const jsonSchema = z.string().refine(
  (val) => {
    try {
      JSON.parse(val);
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Invalid JSON' }
);

// Environment variable schema
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_NAME: z.string().default('the-soothsayer'),
  APP_URL: z.string().url().default('http://localhost:5173'),
  API_URL: z.string().url().default('http://localhost:3000'),
  API_PORT: z.coerce.number().default(3000),
  
  DATABASE_URL: z.string(),
  
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRATION: z.string().default('15m'),
  JWT_REFRESH_EXPIRATION: z.string().default('7d'),
  
  SESSION_SECRET: z.string().min(32),
  
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  
  STORAGE_TYPE: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_PATH: z.string().default('./uploads'),
  
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type EnvConfig = z.infer<typeof envSchema>;

// Zod validation helper
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

// Safe validation that returns result
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

// Extract validation errors as flat object
export function extractValidationErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }
  return errors;
}
