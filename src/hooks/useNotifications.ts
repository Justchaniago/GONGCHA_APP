import { useState, useEffect, useCallback } from 'react';
import { NotificationService } from '../services/NotificationService';
import { NotificationItem } from '../types/types';

export const useNotifications = (userId: string | null) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = NotificationService.subscribeToUserNotifications((data) => {
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.isRead).length);
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);

  const markAsRead = useCallback(async (id: string) => {
    try { await NotificationService.markAsRead(id); }
    catch (err) { console.error('Failed to mark as read', err); }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    try { await NotificationService.markAllAsRead(userId); }
    catch (err) { console.error('Failed to mark all as read', err); }
  }, [userId]);

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead };
};