export interface FetchOptions<TBody = unknown> {
  url: string;
  method?: string;
  body?: TBody;
  csrfToken?: string;
  headers?: Record<string, string>;
  retry?: number;
  signal?: AbortSignal;
}
