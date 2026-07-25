// src/application/notifications/NotificationsViewModel.ts

export interface NotificationDisplayItem {
  id: string;
  title: string;
  message: string;
  timeAgoText: string;
  isRead: boolean;
  category: 'promo' | 'loyalty' | 'system';
  actionUrl?: string;
}

export interface NotificationsViewModel {
  unreadCount: number;
  unreadCountLabel: string;
  items: NotificationDisplayItem[];
}

function toMs(createdAt: any): number {
  if (!createdAt) return 0;
  if (
    typeof createdAt === 'object' &&
    createdAt !== null &&
    'toDate' in createdAt &&
    typeof createdAt.toDate === 'function'
  ) {
    return createdAt.toDate().getTime();
  }
  return new Date(createdAt).getTime();
}

function formatTimeAgo(ms: number, nowMs: number): string {
  if (!ms) return '—';
  const diff = (nowMs - ms) / 1000;
  if (diff < 0) return 'Baru saja';
  if (diff < 60) return 'Baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}h lalu`;
  return new Date(ms).toLocaleDateString('id-ID');
}

const LEGACY_CATEGORY_MAP: Record<string, 'promo' | 'loyalty' | 'system'> = {
  voucher_injected: 'promo',
  broadcast: 'promo',
  tx_verified: 'loyalty',
  tx_rejected: 'loyalty',
  points_pending: 'loyalty',
  targeted: 'system',
  system: 'system',
};

export function buildLegacyNotificationsViewModel(
  rawNotifications: any[],
  nowMs = Date.now(),
): NotificationsViewModel {
  const items: NotificationDisplayItem[] = (rawNotifications ?? []).map((raw) => {
    const ms = toMs(raw.createdAt);
    const rawType = raw.type ?? 'system';
    const category = LEGACY_CATEGORY_MAP[rawType] ?? 'system';

    return {
      id: raw.id ?? '',
      title: raw.title ?? '',
      message: raw.body ?? raw.message ?? raw.text ?? '',
      timeAgoText: formatTimeAgo(ms, nowMs),
      isRead: !!(raw.isRead ?? raw.read),
      category,
      actionUrl: raw.actionUrl ?? raw.data?.deepLink ?? undefined,
    };
  });

  const unreadCount = items.filter((item) => !item.isRead).length;

  return {
    unreadCount,
    unreadCountLabel: `${unreadCount} baru`,
    items,
  };
}

export function buildLocalNotificationsViewModel(
  rawNotifications: any[],
  nowMs = Date.now(),
): NotificationsViewModel {
  const items: NotificationDisplayItem[] = (rawNotifications ?? []).map((raw) => {
    const ms = toMs(raw.createdAt ?? raw.time ?? raw.date);
    
    // Parse category and normalize
    let category: 'promo' | 'loyalty' | 'system' = 'system';
    const rawCategory = (raw.category ?? raw.type ?? '').toLowerCase();
    if (
      rawCategory === 'promo' ||
      rawCategory === 'promotion' ||
      rawCategory === 'broadcast'
    ) {
      category = 'promo';
    } else if (
      rawCategory === 'loyalty' ||
      rawCategory === 'leaves' ||
      rawCategory === 'points' ||
      rawCategory === 'tx_verified' ||
      rawCategory === 'tx_rejected' ||
      rawCategory === 'points_pending'
    ) {
      category = 'loyalty';
    } else if (
      rawCategory === 'system' ||
      rawCategory === 'targeted'
    ) {
      category = 'system';
    }

    return {
      id: raw.id ?? '',
      title: raw.title ?? '',
      message: raw.message ?? raw.body ?? raw.text ?? '',
      timeAgoText: formatTimeAgo(ms, nowMs),
      isRead: !!(raw.isRead ?? raw.read),
      category,
      actionUrl: raw.actionUrl ?? raw.data?.deepLink ?? raw.deepLink ?? undefined,
    };
  });

  const unreadCount = items.filter((item) => !item.isRead).length;

  return {
    unreadCount,
    unreadCountLabel: `${unreadCount} baru`,
    items,
  };
}
