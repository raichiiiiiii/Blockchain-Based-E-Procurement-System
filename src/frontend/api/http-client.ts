import { BackendApiError, isApiErrorEnvelope, isApiSuccessEnvelope } from './errors';
import type { ApiEnvelope } from '../types/api';

async function parseJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * Minimal fetch wrapper for backend API calls
 * 
 * NOTE: Protected actor context remains backend-governed.
 * Any future dev-only actor seam must be explicit and temporary.
 */
export async function requestJson<T>(
  input: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(input, init);
  
  const json = await parseJsonResponse(response);

  if (!response.ok) {
    if (isApiErrorEnvelope(json)) {
      throw new BackendApiError(
        json.error.code,
        json.error.message,
        json.error.details?.issues
      );
    }

    throw new BackendApiError(
      'HTTP_ERROR',
      `HTTP ${response.status}: ${response.statusText}`
    );
  }

  if (isApiErrorEnvelope(json)) {
    throw new BackendApiError(
      json.error.code,
      json.error.message,
      json.error.details?.issues
    );
  }

  if (isApiSuccessEnvelope<T>(json)) {
    return json.data;
  }

  throw new BackendApiError('INVALID_RESPONSE', 'Invalid backend response envelope');
}
