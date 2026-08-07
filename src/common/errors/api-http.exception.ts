import { HttpException, HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from './api-error-code';

export type ApiErrorBody = {
  code: ApiErrorCode;
  message: string;
  details?: Record<string, unknown>;
};

export function throwApiError(
  status: HttpStatus,
  code: ApiErrorCode,
  message: string,
  details?: Record<string, unknown>,
): never {
  const body: ApiErrorBody = { code, message };
  if (details) body.details = details;
  throw new HttpException(body, status);
}

export function throwApiForbidden(code: ApiErrorCode, message: string, details?: Record<string, unknown>): never {
  return throwApiError(HttpStatus.FORBIDDEN, code, message, details);
}

export function throwApiNotFound(code: ApiErrorCode, message: string, details?: Record<string, unknown>): never {
  return throwApiError(HttpStatus.NOT_FOUND, code, message, details);
}

export function throwApiConflict(code: ApiErrorCode, message: string, details?: Record<string, unknown>): never {
  return throwApiError(HttpStatus.CONFLICT, code, message, details);
}

export function throwApiBadRequest(code: ApiErrorCode, message: string, details?: Record<string, unknown>): never {
  return throwApiError(HttpStatus.BAD_REQUEST, code, message, details);
}
