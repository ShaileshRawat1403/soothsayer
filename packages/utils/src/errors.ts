// Custom error classes

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

// 400 Bad Request
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, true, details);
  }
}

// 401 Unauthorized
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401, true);
  }
}

// 403 Forbidden
export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 'AUTHORIZATION_ERROR', 403, true);
  }
}

// 404 Not Found
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 'NOT_FOUND', 404, true, { resource, identifier });
  }
}

// 409 Conflict
export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFLICT', 409, true, details);
  }
}

// 422 Unprocessable Entity
export class BusinessRuleError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'BUSINESS_RULE_VIOLATION', 422, true, details);
  }
}

// 429 Too Many Requests
export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(retryAfter: number = 60) {
    super('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', 429, true, { retryAfter });
    this.retryAfter = retryAfter;
  }
}

// 500 Internal Server Error
export class InternalError extends AppError {
  constructor(message = 'An unexpected error occurred') {
    super(message, 'INTERNAL_ERROR', 500, false);
  }
}

// 503 Service Unavailable
export class ServiceUnavailableError extends AppError {
  constructor(service: string, retryAfter?: number) {
    super(`Service '${service}' is temporarily unavailable`, 'SERVICE_UNAVAILABLE', 503, true, {
      service,
      retryAfter,
    });
  }
}

// Timeout Error
export class TimeoutError extends AppError {
  constructor(operation: string, timeoutMs: number) {
    super(`Operation '${operation}' timed out after ${timeoutMs}ms`, 'TIMEOUT', 504, true, {
      operation,
      timeoutMs,
    });
  }
}

// Policy Violation Error
export class PolicyViolationError extends AppError {
  public readonly policyId?: string;
  public readonly ruleId?: string;

  constructor(
    message: string,
    policyId?: string,
    ruleId?: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'POLICY_VIOLATION', 403, true, { ...details, policyId, ruleId });
    this.policyId = policyId;
    this.ruleId = ruleId;
  }
}

// Approval Required Error
export class ApprovalRequiredError extends AppError {
  public readonly approvalId: string;

  constructor(approvalId: string, message = 'Approval required to proceed') {
    super(message, 'APPROVAL_REQUIRED', 403, true, { approvalId });
    this.approvalId = approvalId;
  }
}

// External Service Error
export class ExternalServiceError extends AppError {
  public readonly serviceName: string;
  public readonly originalError?: Error;

  constructor(serviceName: string, message: string, originalError?: Error) {
    super(message, 'EXTERNAL_SERVICE_ERROR', 502, true, {
      serviceName,
      originalMessage: originalError?.message,
    });
    this.serviceName = serviceName;
    this.originalError = originalError;
  }
}

// Error type guard
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

// Check if error is operational (safe to expose to client)
export function isOperationalError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isOperational;
  }
  return false;
}

// Wrap unknown error
export function wrapError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }
  
  if (error instanceof Error) {
    return new InternalError(error.message);
  }
  
  return new InternalError('Unknown error occurred');
}
