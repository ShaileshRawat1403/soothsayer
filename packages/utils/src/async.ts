// Async utility functions

// Sleep for a specified duration
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retry a function with exponential backoff
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
    retryOn?: (error: Error) => boolean;
    onRetry?: (error: Error, attempt: number) => void;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
    retryOn = () => true,
    onRetry,
  } = options;

  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxAttempts || !retryOn(lastError)) {
        throw lastError;
      }
      
      const delay = Math.min(baseDelayMs * Math.pow(backoffMultiplier, attempt - 1), maxDelayMs);
      
      if (onRetry) {
        onRetry(lastError, attempt);
      }
      
      await sleep(delay);
    }
  }
  
  throw lastError!;
}

// Execute with timeout
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError?: Error
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(timeoutError || new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

// Debounce a function
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delayMs);
  };
}

// Throttle a function
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limitMs: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limitMs);
    }
  };
}

// Run promises in parallel with concurrency limit
export async function parallelLimit<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;
  
  async function worker(): Promise<void> {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      results[index] = await fn(items[index], index);
    }
  }
  
  const workers = Array(Math.min(concurrency, items.length))
    .fill(null)
    .map(() => worker());
  
  await Promise.all(workers);
  return results;
}

// Run promises sequentially
export async function sequential<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i++) {
    results.push(await fn(items[i], i));
  }
  
  return results;
}

// Defer execution
export function defer<T>(): {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  
  return { promise, resolve, reject };
}

// Cache function results
export function memoize<T extends (...args: unknown[]) => unknown>(
  fn: T,
  options: {
    maxAge?: number;
    maxSize?: number;
    keyFn?: (...args: Parameters<T>) => string;
  } = {}
): T {
  const { maxAge, maxSize = 100, keyFn = (...args) => JSON.stringify(args) } = options;
  const cache = new Map<string, { value: ReturnType<T>; timestamp: number }>();
  
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyFn(...args);
    const cached = cache.get(key);
    
    if (cached) {
      if (!maxAge || Date.now() - cached.timestamp < maxAge) {
        return cached.value;
      }
      cache.delete(key);
    }
    
    const value = fn(...args) as ReturnType<T>;
    
    // Enforce size limit
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      if (firstKey) cache.delete(firstKey);
    }
    
    cache.set(key, { value, timestamp: Date.now() });
    return value;
  }) as T;
}

// Async queue
export class AsyncQueue<T> {
  private queue: (() => Promise<T>)[] = [];
  private running = 0;
  private readonly concurrency: number;
  
  constructor(concurrency = 1) {
    this.concurrency = concurrency;
  }
  
  async add(fn: () => Promise<T>): Promise<T> {
    const deferred = defer<T>();
    
    this.queue.push(async () => {
      try {
        const result = await fn();
        deferred.resolve(result);
        return result;
      } catch (error) {
        deferred.reject(error);
        throw error;
      }
    });
    
    this.process();
    return deferred.promise;
  }
  
  private async process(): Promise<void> {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const fn = this.queue.shift()!;
      this.running++;
      
      try {
        await fn();
      } finally {
        this.running--;
        this.process();
      }
    }
  }
  
  get pending(): number {
    return this.queue.length;
  }
  
  get active(): number {
    return this.running;
  }
}
