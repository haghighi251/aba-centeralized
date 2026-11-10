import { ApiResponse } from '../types/apiResponse';

export function createResponse<T>(
  success: boolean,
  error: string | null = null,
  data: T | null = null,
): ApiResponse<T> {
  return {
    success,
    error,
    data,
  };
}
