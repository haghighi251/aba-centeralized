'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface CsrfContextValue {
  token: string | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

const CsrfContext = createContext<CsrfContextValue>({
  token: null,
  loading: true,
  error: null,
  refresh: () => {},
});

export function CsrfProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchToken = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/csrf-token`,
        { credentials: 'include', signal: controller.signal },
      );
      if (!response.ok) throw new Error('Failed to fetch CSRF token');
      const data = await response.json();
      setToken(data.data);
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchToken();
    return () => abortRef.current?.abort();
  }, [fetchToken]);

  return (
    <CsrfContext.Provider value={{ token, loading, error, refresh: fetchToken }}>
      {children}
    </CsrfContext.Provider>
  );
}

export const useCsrf = () => useContext(CsrfContext);
