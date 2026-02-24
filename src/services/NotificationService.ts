// src/services/NotificationService.ts
// Types defined inline to avoid module resolution issues

import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  updateDoc,
  writeBatch,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { firestoreDb } from '../config/firebase';

// ─── Types (defined here to avoid import issues) ────────────

export type NotificationType = 'gift' | 'points' | 'promo' | 'order' | 'system';

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  read: boolean;      // UI uses item.read
  time: string;       // ISO string — used by formatNotifTime()
  imageURL?: string;
  data?: {
    rewardId?: string;
    promoCode?: string;
    orderId?: string;
    pointsEarned?: number;
    deepLink?: string;
  };
}

// ─── Helper ─────────────────────────────────────────────────

const mapDoc = (docSnap: any): NotificationItem => {
  const d = docSnap.data();
  return {
    id: docSnap.id,
    userId: d.userId ?? '',
    title: d.title ?? '',
    body: d.body ?? '',
    type: d.type ?? 'system',
    read: d.isRead ?? d.read ?? false,
    time: d.createdAt instanceof Timestamp
      ? d.createdAt.toDate().toISOString()
      : typeof d.createdAt === 'string'
        ? d.createdAt
        : new Date().toISOString(),
    imageURL: d.imageURL,
    data: d.data,
  };
};

// ============================================================
export const NotificationService = {

  // Used by HomeScreen.tsx
  subscribeToUserNotifications(
    callback: (notifications: NotificationItem[]) => void
  ): () => void {
    const auth = getAuth();
    const userId = auth.currentUser?.uid;

    if (!userId) {
      console.warn('[NotificationService] No user logged in');
      callback([]);
      return () => {};
    }

    return NotificationService.onNotificationsChange(userId, callback);
  },

  async getNotifications(userId: string, limitCount = 20): Promise<NotificationItem[]> {
    console.log(`[NotificationService] Fetching for ${userId}`);
    const q = query(
      collection(firestoreDb, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map(mapDoc);
    console.log(`[NotificationService] Found ${items.length} notifications`);
    return items;
  },

  onNotificationsChange(
    userId: string,
    callback: (notifications: NotificationItem[]) => void,
    limitCount = 20
  ): () => void {
    const q = query(
      collection(firestoreDb, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(mapDoc));
    }, (error) => {
      console.error('[NotificationService] Listener error:', error);
    });
  },

  onUnreadCountChange(userId: string, callback: (count: number) => void): () => void {
    const q = query(
      collection(firestoreDb, 'notifications'),
      where('userId', '==', userId),
      where('isRead', '==', false)
    );
    return onSnapshot(q, (snapshot) => callback(snapshot.size));
  },

  async getUnreadCount(userId: string): Promise<number> {
    const q = query(
      collection(firestoreDb, 'notifications'),
      where('userId', '==', userId),
      where('isRead', '==', false)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  },

  async markAsRead(notificationId: string): Promise<void> {
    await updateDoc(doc(firestoreDb, 'notifications', notificationId), { isRead: true });
  },

  async markAllAsRead(userId: string): Promise<void> {
    const q = query(
      collection(firestoreDb, 'notifications'),
      where('userId', '==', userId),
      where('isRead', '==', false)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return;
    const batch = writeBatch(firestoreDb);
    snapshot.docs.forEach((d) => batch.update(d.ref, { isRead: true }));
    await batch.commit();
  },

  async createNotification(params: {
    userId: string;
    title: string;
    body: string;
    type: NotificationType;
    imageURL?: string;
    data?: NotificationItem['data'];
  }): Promise<string> {
    const ref = await addDoc(collection(firestoreDb, 'notifications'), {
      ...params,
      isRead: false,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  },

  // ─── FCM skeleton — uncomment when ready ──────────────────

  async saveFCMToken(userId: string, token: string, platform: 'ios' | 'android'): Promise<void> {
    // TODO: uncomment when FCM is set up
    // await updateDoc(doc(firestoreDb, 'users', userId), {
    //   fcmToken: token,
    //   fcmTokenUpdatedAt: serverTimestamp(),
    //   fcmPlatform: platform,
    // });
    console.warn('[NotificationService] saveFCMToken — FCM not set up yet');
  },

  async removeFCMToken(userId: string): Promise<void> {
    // TODO: uncomment when FCM is set up
    // await updateDoc(doc(firestoreDb, 'users', userId), {
    //   fcmToken: null,
    //   fcmTokenUpdatedAt: serverTimestamp(),
    // });
    console.warn('[NotificationService] removeFCMToken — FCM not set up yet');
  },
};