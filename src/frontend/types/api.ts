export type BackendErrorCode =
  | 'VALIDATION_ERROR'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | string;

export type ApiSuccessEnvelope<T> = {
  data: T;
};

export type ApiErrorIssue = unknown;

export type ApiErrorEnvelope = {
  error: {
    code: BackendErrorCode;
    message: string;
    details?: {
      issues?: ApiErrorIssue[];
    };
  };
};

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;
