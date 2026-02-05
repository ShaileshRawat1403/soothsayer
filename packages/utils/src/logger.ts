// Structured logging utilities

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
  child(context: LogContext): Logger;
}

// Log level priority
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Create a simple logger implementation
export function createLogger(options: {
  level?: LogLevel;
  context?: LogContext;
  pretty?: boolean;
}): Logger {
  const { level = 'info', context: baseContext = {}, pretty = false } = options;
  const minLevel = LOG_LEVELS[level];

  function shouldLog(logLevel: LogLevel): boolean {
    return LOG_LEVELS[logLevel] >= minLevel;
  }

  function formatLog(entry: LogEntry): string {
    if (pretty) {
      const timestamp = new Date(entry.timestamp).toISOString();
      const levelStr = entry.level.toUpperCase().padEnd(5);
      let output = `[${timestamp}] ${levelStr} ${entry.message}`;
      
      if (entry.context && Object.keys(entry.context).length > 0) {
        output += `\n  Context: ${JSON.stringify(entry.context, null, 2)}`;
      }
      
      if (entry.error) {
        output += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
        if (entry.error.stack) {
          output += `\n  Stack: ${entry.error.stack}`;
        }
      }
      
      return output;
    }
    
    return JSON.stringify(entry);
  }

  function log(logLevel: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (!shouldLog(logLevel)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: logLevel,
      message,
      context: { ...baseContext, ...context },
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    const output = formatLog(entry);
    
    switch (logLevel) {
      case 'debug':
      case 'info':
        console.log(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
        console.error(output);
        break;
    }
  }

  return {
    debug(message: string, context?: LogContext) {
      log('debug', message, context);
    },
    info(message: string, context?: LogContext) {
      log('info', message, context);
    },
    warn(message: string, context?: LogContext) {
      log('warn', message, context);
    },
    error(message: string, error?: Error, context?: LogContext) {
      log('error', message, context, error);
    },
    child(childContext: LogContext): Logger {
      return createLogger({
        level,
        context: { ...baseContext, ...childContext },
        pretty,
      });
    },
  };
}

// Default logger instance
let defaultLogger: Logger | null = null;

export function getDefaultLogger(): Logger {
  if (!defaultLogger) {
    defaultLogger = createLogger({
      level: (process.env.LOG_LEVEL as LogLevel) || 'info',
      pretty: process.env.NODE_ENV !== 'production',
    });
  }
  return defaultLogger;
}

export function setDefaultLogger(logger: Logger): void {
  defaultLogger = logger;
}

// Convenience functions using default logger
export const logger = {
  debug(message: string, context?: LogContext) {
    getDefaultLogger().debug(message, context);
  },
  info(message: string, context?: LogContext) {
    getDefaultLogger().info(message, context);
  },
  warn(message: string, context?: LogContext) {
    getDefaultLogger().warn(message, context);
  },
  error(message: string, error?: Error, context?: LogContext) {
    getDefaultLogger().error(message, error, context);
  },
};

// Request logging helper
export function logRequest(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  context?: LogContext
): void {
  const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
  const message = `${method} ${path} ${statusCode} ${durationMs}ms`;
  
  getDefaultLogger()[level](message, {
    ...context,
    http: {
      method,
      path,
      statusCode,
      durationMs,
    },
  });
}
