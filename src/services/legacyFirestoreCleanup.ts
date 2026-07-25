import {
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { firestoreDb } from '../config/firebase';
import type { RewardItem, TransactionRecord } from '../types/types';

/**
 * @deprecated Legacy direct Firestore listener for rewards catalog vouchers.
 * Direct Firestore queries are deprecated and have been replaced by backend repository/adapter seams.
 * Use FastAPI-backed services instead.
 */
export function onVouchersChangeLegacy(
  callback: (vouchers: RewardItem[]) => void
): () => void {
  console.warn('[DEPRECATED] onVouchersChangeLegacy called. Direct Firestore listeners are deprecated.');
  const catalogRef = collection(firestoreDb, 'rewards_catalog');

  return onSnapshot(
    catalogRef,
    (snapshot) => {
      const items = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          pointsCost: data.pointsCost ?? data.pointsrequired ?? 0,
          image: data.image ?? data.imageURL ?? '',
        } as RewardItem;
      });

      const filtered = items.filter(
        (item: any) => item.isActive !== false && (item.stock ?? 1) > 0
      );
      callback(filtered);
    },
    (error) => {
      console.error('[LegacyFirestoreCleanup] Catalog snapshot listener error:', error);
    }
  );
}

/**
 * @deprecated Legacy direct Firestore listener for user transactions.
 * Direct Firestore queries are deprecated and have been replaced by backend repository/adapter seams.
 * Use FastAPI-backed services instead.
 */
export function subscribeToUserTransactionsLegacy(
  userId: string,
  callback: (transactions: any[]) => void
): () => void {
  console.warn('[DEPRECATED] subscribeToUserTransactionsLegacy called. Direct Firestore listeners are deprecated.');
  const transactionsRef = collection(firestoreDb, 'transactions');
  const q = query(transactionsRef, where('userId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(items);
    },
    (error) => {
      console.error('[LegacyFirestoreCleanup] Transactions snapshot listener error:', error);
    }
  );
}

/**
 * @deprecated Legacy direct Firestore listener for pending transaction summary.
 * Direct Firestore queries are deprecated and have been replaced by backend repository/adapter seams.
 * Use FastAPI-backed services instead.
 */
export function subscribeToPendingTransactionSummaryLegacy(
  userId: string,
  callback: (summary: any) => void
): () => void {
  console.warn('[DEPRECATED] subscribeToPendingTransactionSummaryLegacy called. Direct Firestore listeners are deprecated.');
  const transactionsRef = collection(firestoreDb, 'transactions');
  const q = query(transactionsRef, where('userId', '==', userId), where('status', '==', 'pending'));

  return onSnapshot(
    q,
    (snapshot) => {
      const pendingPoints = snapshot.docs.reduce((total, doc) => {
        const data = doc.data();
        const points = typeof data.pointsEarned === 'number' ? data.pointsEarned : 0;
        return total + points;
      }, 0);

      callback({
        loaded: true,
        pendingCount: snapshot.docs.length,
        pendingPoints,
      });
    },
    (error) => {
      console.error('[LegacyFirestoreCleanup] Pending transaction summary snapshot listener error:', error);
    }
  );
}
