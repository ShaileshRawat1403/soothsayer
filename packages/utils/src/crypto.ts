// Cryptographic utilities - works in both Node.js and browser environments

// Generate a random string
export function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}

// Generate a UUID v4
export function generateUUID(): string {
  return crypto.randomUUID();
}

// Generate a secure token
export function generateToken(prefix?: string): string {
  const token = generateRandomString(32);
  return prefix ? `${prefix}_${token}` : token;
}

// Generate an API key
export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const prefix = generateRandomString(8);
  const secret = generateRandomString(32);
  const key = `sk_${prefix}_${secret}`;
  
  // In real implementation, hash should be done server-side with proper algorithms
  const hash = `hash_${prefix}_${generateRandomString(16)}`;
  
  return { key, prefix: `sk_${prefix}`, hash };
}

// Hash a string (SHA-256) - for non-password use cases
export async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Compare two strings in constant time
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Encode to base64
export function encodeBase64(str: string): string {
  if (typeof btoa !== 'undefined') {
    return btoa(str);
  }
  return Buffer.from(str).toString('base64');
}

// Decode from base64
export function decodeBase64(str: string): string {
  if (typeof atob !== 'undefined') {
    return atob(str);
  }
  return Buffer.from(str, 'base64').toString();
}

// Encode to URL-safe base64
export function encodeBase64Url(str: string): string {
  return encodeBase64(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Decode from URL-safe base64
export function decodeBase64Url(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = str.length % 4;
  if (padding) {
    base64 += '='.repeat(4 - padding);
  }
  return decodeBase64(base64);
}

// Generate a short ID (useful for URLs)
export function generateShortId(length = 8): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
  let result = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}

// Generate a correlation ID for request tracing
export function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36);
  const random = generateRandomString(8);
  return `${timestamp}-${random}`;
}

// Redact sensitive fields from an object
export function redactSensitiveFields<T extends Record<string, unknown>>(
  obj: T,
  sensitiveKeys: string[] = ['password', 'token', 'secret', 'key', 'apiKey', 'authorization']
): T {
  const result = { ...obj };
  
  for (const key of Object.keys(result)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
      result[key as keyof T] = '[REDACTED]' as T[keyof T];
    } else if (typeof result[key] === 'object' && result[key] !== null) {
      result[key as keyof T] = redactSensitiveFields(
        result[key] as Record<string, unknown>,
        sensitiveKeys
      ) as T[keyof T];
    }
  }
  
  return result;
}
