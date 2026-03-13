import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  updateDoc,
  writeBatch,
  onSnapshot,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { firestoreDb } from '../config/firebase';
import { NotificationItem } from '../types/types';

const mapDoc = (docSnap: any): NotificationItem => {
  const d = docSnap.data();
  return {
    id: docSnap.id,
    title: d.title ?? '',
    body: d.body ?? '',
    type: d.type ?? 'system',
    isRead: d.isRead ?? false,
    createdAt: d.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    imageURL: d.imageURL,
    data: d.data,
  };
};

export const NotificationService = {

  subscribeToUserNotifications(
    callback: (notifications: NotificationItem[]) => void
  ): () => void {
    const auth = getAuth();
    const userId = auth.currentUser?.uid;

    if (!userId) {
      callback([]);
      return () => {};
    }

    // FIREBASE RULES FIX: Tembak ke Sub-Collection users/{userId}/notifications
    const q = query(
      collection(firestoreDb, 'users', userId, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(mapDoc));
    }, (error) => {
      console.error('[NotificationService] Listener error:', error);
    });
  },

  async markAsRead(notificationId: string): Promise<void> {
    const userId = getAuth().currentUser?.uid;
    if (!userId) return;

    // Sesuai rules: Hanya boleh merubah isRead menjadi true
    await updateDoc(doc(firestoreDb, 'users', userId, 'notifications', notificationId), { 
      isRead: true 
    });
  },

  async markAllAsRead(userId: string): Promise<void> {
    const q = query(
      collection(firestoreDb, 'users', userId, 'notifications'),
      where('isRead', '==', false)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return;
    
    const batch = writeBatch(firestoreDb);
    snapshot.docs.forEach((d) => batch.update(d.ref, { isRead: true }));
    await batch.commit();
  },
};