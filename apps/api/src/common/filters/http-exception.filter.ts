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
    operatorDetail?: string;
    recoveryHint?: string;
    operatorAction?: string;
    retryable?: boolean;
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
    let operatorDetail: string | undefined;
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
      operatorDetail = exception.name !== 'Error' ? exception.name : undefined;
    }

    const { recoveryHint, operatorAction, retryable } = this.getRecoveryInfo(code, statusCode);

    // Log the error
    if (statusCode >= 500) {
      this.logger.error(
        `[${requestId}] ${request.method} ${path} - ${statusCode} - ${message} - ${operatorDetail || ''}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(`[${requestId}] ${request.method} ${path} - ${statusCode} - ${message}`);
    }

    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code,
        message: this.getUserSafeMessage(code, message),
        operatorDetail: operatorDetail || message,
        recoveryHint,
        operatorAction,
        retryable,
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
      504: 'GATEWAY_TIMEOUT',
    };
    return statusCodes[status] || 'UNKNOWN_ERROR';
  }

  private getRecoveryInfo(code: string, status: number): { recoveryHint: string; operatorAction: string; retryable: boolean } {
    if (code === 'UNAUTHORIZED') {
      return {
        recoveryHint: 'Your session has expired or the token is invalid.',
        operatorAction: 'Please sign in again to continue.',
        retryable: false,
      };
    }
    if (code === 'FORBIDDEN') {
      return {
        recoveryHint: 'Access to this resource is restricted by current policy.',
        operatorAction: 'Check your workspace permissions or policy rules.',
        retryable: false,
      };
    }
    if (code === 'NOT_FOUND') {
      return {
        recoveryHint: 'The requested resource does not exist or has been deleted.',
        operatorAction: 'Verify the ID and path before trying again.',
        retryable: false,
      };
    }
    if (code === 'BAD_GATEWAY' || code === 'SERVICE_UNAVAILABLE') {
      return {
        recoveryHint: 'Downstream authority (DAX) or AI provider is unreachable.',
        operatorAction: 'Check DAX engine logs or provider status pages.',
        retryable: true,
      };
    }
    if (code === 'GATEWAY_TIMEOUT') {
      return {
        recoveryHint: 'The downstream service took too long to respond.',
        operatorAction: 'Consider simplifying the request or checking engine load.',
        retryable: true,
      };
    }
    if (code === 'TOO_MANY_REQUESTS') {
      return {
        recoveryHint: 'System or provider rate limits have been exceeded.',
        operatorAction: 'Implement exponential backoff or check account quotas.',
        retryable: true,
      };
    }
    if (code === 'VALIDATION_ERROR') {
      return {
        recoveryHint: 'The data provided does not match the required schema.',
        operatorAction: 'Correct the input format and re-submit.',
        retryable: false,
      };
    }
    
    if (status >= 500) {
      return {
        recoveryHint: 'An internal control plane error occurred.',
        operatorAction: 'Provide the Correlation ID to system administrators.',
        retryable: false,
      };
    }

    return {
      recoveryHint: 'An unexpected error occurred during processing.',
      operatorAction: 'Verify the request and try again.',
      retryable: false,
    };
  }

  private getUserSafeMessage(code: string, originalMessage: string): string {
    if (code === 'INTERNAL_ERROR' || code === 'DATABASE_ERROR') {
      return 'An internal workstation error occurred. Our engineers have been notified.';
    }
    return originalMessage;
  }

  private generateRequestId(): string {
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
