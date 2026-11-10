import { useCsrf } from '@/shared/contexts/CsrfContext';

/**
 * Returns the application-wide CSRF token that was fetched on first page load.
 * Token shape matches the previous per-component fetch to keep callers unchanged.
 */
export const useCsrfToken = () => {
  const { token, loading, error } = useCsrf();
  return { token, loading, error };
};
