import {
  collection,
  deleteDoc,
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
import { onAuthStateChanged } from 'firebase/auth';
import { firestoreDb, firebaseAuth } from '../config/firebase';
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
    let firestoreUnsub: (() => void) | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const startFirestore = (userId: string) => {
      if (cancelled) return;

      firestoreUnsub?.();
      firestoreUnsub = null;

      const q = query(
        collection(firestoreDb, 'users', userId, 'notifications'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      const listen = () => {
        if (cancelled) return;
        firestoreUnsub = onSnapshot(q, (snapshot) => {
          if (!cancelled) callback(snapshot.docs.map(mapDoc));
        }, (error) => {
          if (cancelled) return;
          callback([]);
          if ((error as any)?.code !== 'permission-denied') {
            retryTimer = setTimeout(listen, 4000);
          }
        });
      };

      listen();
    };

    // Wait for auth to restore from AsyncStorage before subscribing
    const authUnsub = onAuthStateChanged(firebaseAuth, (user) => {
      if (cancelled) return;
      if (user) {
        startFirestore(user.uid);
      } else {
        firestoreUnsub?.();
        firestoreUnsub = null;
        callback([]);
      }
    });

    return () => {
      cancelled = true;
      authUnsub();
      firestoreUnsub?.();
      if (retryTimer) clearTimeout(retryTimer);
    };
  },

  async markAsRead(notificationId: string): Promise<void> {
    const userId = firebaseAuth.currentUser?.uid;
    if (!userId) return;

    // Sesuai rules: Hanya boleh merubah isRead menjadi true
    await updateDoc(doc(firestoreDb, 'users', userId, 'notifications', notificationId), { 
      isRead: true 
    });
  },

  async deleteNotification(notificationId: string): Promise<boolean> {
    const userId = firebaseAuth.currentUser?.uid;
    if (!userId) return false;
    try {
      await deleteDoc(doc(firestoreDb, 'users', userId, 'notifications', notificationId));
      return true;
    } catch {
      return false;
    }
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
