import { isAxiosError, isCancel } from 'axios';

export type ApiErrorKind = 'http' | 'network' | 'timeout' | 'canceled';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly code?: string;
  readonly title?: string;
  readonly detail?: string;
  readonly errors?: Api.FieldError[];
  readonly retryAfterSeconds?: number;
  /** Raw problem+json body; extra properties such as `quote` live here. */
  readonly problem?: Api.ProblemDetail & Record<string, unknown>;

  constructor(init: {
    kind: ApiErrorKind;
    message: string;
    problem?: Api.ProblemDetail & Record<string, unknown>;
    status?: number;
  }) {
    super(init.message);
    Object.setPrototypeOf(this, ApiError.prototype);
    this.name = 'ApiError';
    this.kind = init.kind;
    this.status = init.status ?? init.problem?.status;
    this.problem = init.problem;
    this.code = init.problem?.code;
    this.title = init.problem?.title;
    this.detail = init.problem?.detail;
    this.errors = init.problem?.errors;
    this.retryAfterSeconds = init.problem?.retryAfterSeconds;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Normalizes anything thrown by axios into an ApiError. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (isCancel(error)) return new ApiError({ kind: 'canceled', message: 'Request canceled' });
  if (isAxiosError(error)) {
    if (error.response) {
      const data: unknown = error.response.data;
      const problem =
        typeof data === 'object' && data !== null
          ? ({ status: error.response.status, ...data } as Api.ProblemDetail &
              Record<string, unknown>)
          : undefined;
      return new ApiError({
        kind: 'http',
        status: error.response.status,
        problem,
        message: problem?.detail ?? problem?.title ?? error.message,
      });
    }
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError({ kind: 'timeout', message: 'Request timed out' });
    }
    return new ApiError({ kind: 'network', message: 'Network error' });
  }
  return new ApiError({
    kind: 'network',
    message: error instanceof Error ? error.message : 'Unknown error',
  });
}
