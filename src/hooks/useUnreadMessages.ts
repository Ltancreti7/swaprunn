import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';

const POLLING_INTERVAL = 10000;

export function useUnreadMessages(deliveryId: string, userId: string | undefined) {
  const [unreadCount, setUnreadCount] = useState(0);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!deliveryId || !userId) return;

    const loadUnreadCount = async () => {
      try {
        const messages = await api.messages.list(deliveryId);
        const unread = messages?.filter((m: { recipientId: string; read: boolean }) => 
          m.recipientId === userId && !m.read
        ).length || 0;
        setUnreadCount(unread);
      } catch (error) {
        console.error('Error loading unread count:', error);
      }
    };

    loadUnreadCount();

    pollingRef.current = setInterval(loadUnreadCount, POLLING_INTERVAL);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [deliveryId, userId]);

  return unreadCount;
}
