// src/types/notification.types.ts

export type NotificationType = 'gift' | 'points' | 'promo' | 'order' | 'system';

// Matches what HomeScreen.tsx expects (item.read, item.type, item.title, item.body, item.time)
export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  read: boolean;       // HomeScreen uses item.read (not isRead)
  time: string;        // HomeScreen uses formatNotifTime(item.time) — ISO string
  imageURL?: string;
  data?: NotificationPayload;
}

export interface NotificationPayload {
  rewardId?: string;
  promoCode?: string;
  orderId?: string;
  pointsEarned?: number;
  deepLink?: string;
}

// FCM — skeleton, activate when FCM ready
export interface FCMTokenDoc {
  userId: string;
  token: string;
  platform: 'ios' | 'android';
  updatedAt: Date;
}