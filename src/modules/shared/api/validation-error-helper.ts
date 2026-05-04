import type { FastifyError } from 'fastify';

export interface ValidationErrorEnvelope {
  error: {
    code: 'VALIDATION_ERROR';
    message: string;
    details: {
      issues: unknown[];
    };
    requestId?: string;
  };
}

/**
 * Creates a standardized validation error response envelope
 */
export function createValidationError(messageOrIssues?: string | unknown[], issues?: unknown[], requestId?: string | null): ValidationErrorEnvelope {
  // Handle different calling patterns for backward compatibility
  let message: string;
  let actualIssues: unknown[];
  
  if (typeof messageOrIssues === 'string') {
    // Called as createValidationError(message, issues?, requestId?)
    message = messageOrIssues;
    actualIssues = Array.isArray(issues) ? issues : [];
  } else {
    // Called as createValidationError(issues?, requestId?) or createValidationError()
    message = 'Request validation failed';
    actualIssues = Array.isArray(messageOrIssues) ? messageOrIssues : [];
  }

  const envelope: ValidationErrorEnvelope = {
    error: {
      code: 'VALIDATION_ERROR',
      message,
      details: {
        issues: actualIssues
      }
    }
  };

  // Only include requestId if it's provided and not null/undefined
  if (requestId !== undefined && requestId !== null) {
    envelope.error.requestId = requestId;
  }

  return envelope;
}

/**
 * Maps Fastify validation errors to our standardized validation error envelope
 */
export function mapFastifyValidationError(error: FastifyError, requestId?: string | null): ValidationErrorEnvelope {
  // Extract validation issues from Fastify error if available
  const issues = error.validation ? [...error.validation] : [];
  return createValidationError('Request validation failed', issues, requestId);
}

/**
 * Creates a standardized validation error for application-level validation failures
 */
export function createApplicationValidationError(message: string, issues?: unknown[], requestId?: string | null): ValidationErrorEnvelope {
  return createValidationError(message, issues, requestId);
}
