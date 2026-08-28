import type { ApiErrorBody } from '../../types/api';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static fromResponse(status: number, payload: unknown): ApiError {
    if (isApiErrorBody(payload)) {
      return new ApiError(status, payload.error.code, payload.error.message, payload.error.details);
    }

    return new ApiError(status, 'HTTP_ERROR', `Request failed with status ${status}`);
  }
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ApiErrorBody>;
  return candidate.success === false
    && typeof candidate.error?.code === 'string'
    && typeof candidate.error.message === 'string';
}
