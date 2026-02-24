// src/hooks/useNotifications.ts

import { useState, useEffect, useCallback } from 'react';
import { NotificationService, NotificationItem } from '../services/NotificationService';

interface UseNotificationsReturn {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useNotifications = (userId: string | null): UseNotificationsReturn => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = NotificationService.onNotificationsChange(userId, (data) => {
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read).length);
      setLoading(false);
      setError(null);
    });
    return () => unsub();
  }, [userId]);

  const markAsRead = useCallback(async (id: string) => {
    try { await NotificationService.markAsRead(id); }
    catch (err) { setError('Failed to mark as read'); }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    try { await NotificationService.markAllAsRead(userId); }
    catch (err) { setError('Failed to mark all as read'); }
  }, [userId]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await NotificationService.getNotifications(userId);
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read).length);
    } catch (err) {
      setError('Failed to refresh');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return { notifications, unreadCount, loading, error, markAsRead, markAllAsRead, refresh };
};