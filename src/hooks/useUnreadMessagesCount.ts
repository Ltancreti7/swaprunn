import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';

const POLLING_INTERVAL = 15000;

export function useUnreadMessagesCount(userId: string | undefined) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const loadUnreadCount = async () => {
      try {
        const result = await api.messages.unreadCount();
        setUnreadCount(result?.count || 0);
      } catch (error) {
        console.error('Error loading unread count:', error);
        setUnreadCount(0);
      } finally {
        setLoading(false);
      }
    };

    loadUnreadCount();

    pollingRef.current = setInterval(loadUnreadCount, POLLING_INTERVAL);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [userId]);

  return { unreadCount, loading };
}
