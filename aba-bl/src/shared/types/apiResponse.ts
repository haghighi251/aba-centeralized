export interface ApiResponse<T> {
  success: boolean;
  error: string | null;
  data: T | null;
}
