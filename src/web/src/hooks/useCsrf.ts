import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';

export const useCsrf = () => {
  const [csrfToken, setCsrfToken] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchToken = useCallback(async () => {
    try {
      const data = await api.get<{ token: string }>('/csrf');
      setCsrfToken(data.token);
    } catch (err) {
      setCsrfToken('');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchToken();
  }, [fetchToken]);

  return { csrfToken, loading };
};
