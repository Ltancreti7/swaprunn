import { useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api';

const TIMEOUT_DURATION = 30 * 60 * 1000;
const WARNING_DURATION = 5 * 60 * 1000;

export function useSessionTimeout(onTimeout: () => void, onWarning?: () => void) {
  const abortRef = useRef<AbortController | null>(null);

  const resetTimer = useCallback(() => {
    localStorage.setItem('lastActivity', Date.now().toString());
  }, []);

  useEffect(() => {
    resetTimer();

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));

    const checkSession = async () => {
      const lastActivity = localStorage.getItem('lastActivity');
      if (!lastActivity) return;

      const timeSinceActivity = Date.now() - parseInt(lastActivity);

      if (timeSinceActivity >= TIMEOUT_DURATION) {
        abortRef.current?.abort();
        await api.auth.logout();
        onTimeout();
      } else if (onWarning && timeSinceActivity >= TIMEOUT_DURATION - WARNING_DURATION) {
        abortRef.current?.abort();
        abortRef.current = new AbortController();
        try {
          const user = await api.auth.me();
          if (user) onWarning();
        } catch {
          // aborted or network error — ignore
        }
      }
    };

    const interval = setInterval(checkSession, 60000);

    return () => {
      events.forEach(event => document.removeEventListener(event, resetTimer));
      clearInterval(interval);
      abortRef.current?.abort();
    };
  }, [resetTimer, onTimeout, onWarning]);
}
