import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, body, headers } = request;
    const userAgent = headers['user-agent'] || '';
    const requestId = (headers['x-correlation-id'] as string) || 'unknown';

    const startTime = Date.now();

    // Log request
    this.logger.log(
      `[${requestId}] ${method} ${url} - Started`,
      this.sanitizeBody(body),
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;

          this.logger.log(
            `[${requestId}] ${method} ${url} - ${statusCode} - ${duration}ms`,
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;

          this.logger.error(
            `[${requestId}] ${method} ${url} - ${statusCode} - ${duration}ms - ${error.message}`,
          );
        },
      }),
    );
  }

  private sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
    if (!body || typeof body !== 'object') return body;

    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'refreshToken'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
