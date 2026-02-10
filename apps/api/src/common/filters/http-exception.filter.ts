import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaClientKnownRequestError, PrismaClientValidationError } from '@prisma/client/runtime/library';

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    stack?: string;
  };
  meta: {
    requestId: string;
    timestamp: string;
    path: string;
  };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = (request.headers['x-correlation-id'] as string) || this.generateRequestId();
    const timestamp = new Date().toISOString();
    const path = request.url;

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: Record<string, unknown> | undefined;

    // Handle different exception types
    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = (responseObj.message as string) || message;
        code = (responseObj.error as string) || this.getCodeFromStatus(statusCode);
        
        if (Array.isArray(responseObj.message)) {
          details = { validationErrors: responseObj.message };
          message = 'Validation failed';
        }
      }
      
      code = this.getCodeFromStatus(statusCode);
    } else if (exception instanceof PrismaClientKnownRequestError) {
      const prismaError = this.handlePrismaError(exception);
      statusCode = prismaError.statusCode;
      code = prismaError.code;
      message = prismaError.message;
    } else if (exception instanceof PrismaClientValidationError) {
      statusCode = HttpStatus.BAD_REQUEST;
      code = 'VALIDATION_ERROR';
      message = 'Invalid data provided';
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Log the error
    if (statusCode >= 500) {
      this.logger.error(
        `[${requestId}] ${request.method} ${path} - ${statusCode} - ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(`[${requestId}] ${request.method} ${path} - ${statusCode} - ${message}`);
    }

    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code,
        message,
        details,
      },
      meta: {
        requestId,
        timestamp,
        path,
      },
    };

    // Include stack trace in development
    if (process.env.NODE_ENV === 'development' && exception instanceof Error) {
      errorResponse.error.stack = exception.stack;
    }

    response.status(statusCode).json(errorResponse);
  }

  private handlePrismaError(error: PrismaClientKnownRequestError): {
    statusCode: number;
    code: string;
    message: string;
  } {
    switch (error.code) {
      case 'P2002':
        return {
          statusCode: HttpStatus.CONFLICT,
          code: 'DUPLICATE_ENTRY',
          message: `A record with this ${(error.meta?.target as string[])?.join(', ') || 'value'} already exists`,
        };
      case 'P2003':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'FOREIGN_KEY_CONSTRAINT',
          message: 'Referenced record does not exist',
        };
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          code: 'NOT_FOUND',
          message: 'Record not found',
        };
      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          code: 'DATABASE_ERROR',
          message: 'A database error occurred',
        };
    }
  }

  private getCodeFromStatus(status: number): string {
    const statusCodes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
    };
    return statusCodes[status] || 'UNKNOWN_ERROR';
  }

  private generateRequestId(): string {
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
