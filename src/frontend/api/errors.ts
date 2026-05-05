import type { ApiErrorEnvelope, ApiSuccessEnvelope } from '../types/api';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export class BackendApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly issues?: unknown[]
  ) {
    super(message);
    this.name = 'BackendApiError';
  }
}

export function isApiErrorEnvelope(value: unknown): value is ApiErrorEnvelope {
  if (!isRecord(value) || !isRecord(value.error)) {
    return false;
  }

  return (
    typeof value.error.code === 'string' &&
    typeof value.error.message === 'string'
  );
}

export function isApiSuccessEnvelope<T>(
  value: unknown
): value is ApiSuccessEnvelope<T> {
  return isRecord(value) && 'data' in value;
}

export function normalizeApiError(error: unknown): BackendApiError {
  if (error instanceof BackendApiError) {
    return error;
  }

  if (error instanceof Error) {
    return new BackendApiError('UNKNOWN_ERROR', error.message);
  }

  return new BackendApiError('UNKNOWN_ERROR', 'An unknown error occurred');
}
