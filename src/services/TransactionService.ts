import {
  collection,
  onSnapshot,
  query,
  where,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
} from 'firebase/firestore';
import { firestoreDb } from '../config/firebase';
import type { TransactionRecord, XpHistoryEntry } from '../types/types';
import { BackendApi } from './BackendApi';

export type MemberTransactionStatus = 'pending' | 'verified' | 'rejected';
type TransactionUserField = 'uid' | 'userId' | 'memberId';
type TransactionSnapshotMap = Partial<Record<TransactionUserField, QuerySnapshot>>;

export interface MemberTransactionHistoryItem {
  id: string;
  transactionId: string;
  createdAtIso: string;
  status: MemberTransactionStatus;
  type: 'earn' | 'redeem';
  pointsAmount: number;
  title: string;
  subtitle: string;
  storeLabel: string;
  referenceLabel: string;
  isPending: boolean;
  totalAmount?: number;
  voucherTitle?: string;
  voucherCode?: string;
}

export interface PendingTransactionSummary {
  loaded: boolean;
  pendingPoints: number;
  pendingCount: number;
}

const formatStoreLabel = (rawValue: unknown): string => {
  const value = String(rawValue ?? '').trim();
  if (!value) return '';

  const withoutPrefix = value
    .replace(/^store[_\-\s]*/i, '')
    .replace(/^gc[_\-\s]*/i, '')
    .trim();

  const normalizedSeparators = withoutPrefix.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalizedSeparators) return '';

  return normalizedSeparators
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const toIsoString = (value: any): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value?.toDate === 'function') return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return '';
};

const normalizeStatus = (status: unknown): MemberTransactionStatus => {
  const value = String(status ?? '').toUpperCase();
  if (value === 'PENDING') return 'pending';
  if (value === 'COMPLETED' || value === 'VERIFIED') return 'verified';
  return 'rejected';
};

const USER_ID_FIELDS: TransactionUserField[] = ['uid', 'userId', 'memberId'];
const buildUserQuery = (userId: string, field: TransactionUserField) =>
  query(collection(firestoreDb, 'transactions'), where(field, '==', userId));

const mergeSnapshots = (snapshots: TransactionSnapshotMap) => {
  const docsById = new Map<string, QueryDocumentSnapshot>();

  USER_ID_FIELDS.forEach((field) => {
    snapshots[field]?.docs.forEach((docSnap) => {
      docsById.set(docSnap.id, docSnap);
    });
  });

  return Array.from(docsById.values());
};

const sortHistoryItems = (items: MemberTransactionHistoryItem[]) =>
  [...items].sort((a, b) => {
    const first = a.createdAtIso ? new Date(a.createdAtIso).getTime() : 0;
    const second = b.createdAtIso ? new Date(b.createdAtIso).getTime() : 0;
    return second - first;
  });

const normalizeTransactionDoc = (docSnap: QueryDocumentSnapshot): MemberTransactionHistoryItem => {
  const data = docSnap.data() as TransactionRecord & Record<string, any>;
  const normalizedStatus = normalizeStatus(data.status);
  const type = data.type === 'redeem' ? 'redeem' : 'earn';
  const pointsRaw =
    typeof data.pointsEarned === 'number'
      ? data.pointsEarned
      : typeof data.potentialPoints === 'number'
        ? data.potentialPoints
        : 0;
  const pointsAmount =
    normalizedStatus === 'rejected'
      ? 0
      : type === 'redeem'
        ? -Math.abs(pointsRaw)
        : Math.abs(pointsRaw);
  const createdAtIso = toIsoString(data.verifiedAt) || toIsoString(data.createdAt);
  const transactionId = data.transactionId ?? data.receiptNumber ?? docSnap.id;
  const storeLabel = formatStoreLabel(data.storeName ?? data.storeLocation);
  const referenceLabel = String(transactionId ?? '').trim();
  const title =
    type === 'redeem'
      ? data.voucherTitle ?? 'Reward redemption'
      : normalizedStatus === 'pending'
        ? 'Points pending validation'
        : normalizedStatus === 'verified'
          ? 'Points released'
          : 'Points not added';
  const subtitleParts = [
    storeLabel,
    referenceLabel,
  ].filter(Boolean);

  return {
    id: docSnap.id,
    transactionId,
    createdAtIso,
    status: normalizedStatus,
    type,
    pointsAmount,
    title,
    subtitle: subtitleParts.join(' • '),
    storeLabel,
    referenceLabel,
    isPending: normalizedStatus === 'pending',
    totalAmount: typeof data.totalAmount === 'number' ? data.totalAmount : undefined,
    voucherTitle: typeof data.voucherTitle === 'string' ? data.voucherTitle : undefined,
    voucherCode: typeof data.voucherCode === 'string' ? data.voucherCode : undefined,
  };
};

export const mapXpHistoryFallback = (history: XpHistoryEntry[]): MemberTransactionHistoryItem[] =>
  history
    .map<MemberTransactionHistoryItem>((item) => {
      const status = normalizeStatus(item.status);
      const type = item.type === 'redeem' ? 'redeem' : 'earn';
      const pointsAmount =
        status === 'rejected'
          ? 0
          : type === 'redeem'
            ? -Math.abs(item.amount)
            : Math.abs(item.amount);

      return {
        id: item.id,
        transactionId: item.transactionId ?? item.id,
        createdAtIso: item.date || toIsoString(item.createdAt),
        status,
        type,
        pointsAmount,
        title:
          type === 'redeem'
            ? item.context ?? 'Reward redemption'
            : status === 'pending'
              ? 'Points pending validation'
              : status === 'verified'
                ? 'Points released'
                : 'Points not added',
        subtitle: [item.location, item.transactionId].filter(Boolean).join(' • '),
        storeLabel: formatStoreLabel(item.location),
        referenceLabel: item.transactionId ?? '',
        isPending: status === 'pending',
      };
    })
    .sort((a, b) => {
      const first = a.createdAtIso ? new Date(a.createdAtIso).getTime() : 0;
      const second = b.createdAtIso ? new Date(b.createdAtIso).getTime() : 0;
      return second - first;
    });

export const TransactionService = {
  subscribeToUserTransactions(
    userId: string,
    callback: (transactions: MemberTransactionHistoryItem[]) => void,
  ): () => void {
    let isActive = true;

    const fetchHistory = async () => {
      try {
        const response = await BackendApi.getTransactions(undefined, 50);

        const items: MemberTransactionHistoryItem[] = response.transactions.map((tx) => {
          const createdAtIso = toIsoString(tx.createdAt);
          const status = normalizeStatus(tx.status);
          const type: 'earn' | 'redeem' = tx.type === 'redeem' ? 'redeem' : 'earn';
          const pointsRaw = typeof tx.pointsEarned === 'number' ? tx.pointsEarned : 0;
          const pointsAmount =
            status === 'rejected' ? 0 : type === 'redeem' ? -Math.abs(pointsRaw) : Math.abs(pointsRaw);

          return {
            id: tx.id,
            transactionId: tx.reference ?? tx.id,
            createdAtIso,
            status,
            type,
            pointsAmount,
            title:
              type === 'redeem'
                ? 'Voucher redeemed'
                : status === 'pending'
                  ? 'Points pending validation'
                  : status === 'verified'
                    ? 'Points released'
                    : 'Points not added',
            subtitle: [tx.storeId, tx.reference].filter(Boolean).join(' • '),
            storeLabel: formatStoreLabel(tx.storeId),
            referenceLabel: String(tx.reference ?? '').trim(),
            isPending: status === 'pending',
            totalAmount: typeof (tx as any).totalAmount === 'number' ? (tx as any).totalAmount : undefined,
            voucherTitle: typeof (tx as any).voucherTitle === 'string' ? (tx as any).voucherTitle : undefined,
            voucherCode: typeof (tx as any).voucherCode === 'string' ? (tx as any).voucherCode : undefined,
          };
        });

        if (isActive) {
          callback(sortHistoryItems(items));
        }
      } catch (error) {
        console.error('Error fetching transaction history:', error);
        if (isActive) {
          callback([]);
        }
      }
    };

    // Initial fetch
    fetchHistory();

    // Poll every 30 seconds
    const interval = setInterval(fetchHistory, 30000);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  },

  subscribeToPendingTransactionSummary(
    userId: string,
    callback: (summary: PendingTransactionSummary) => void,
  ): () => void {
    let isActive = true;

    const fetchPending = async () => {
      try {
        const response = await BackendApi.getTransactions('pending', 100);

        const pendingPoints = response.transactions.reduce((total, tx) => {
          const pointsEarned = typeof tx.pointsEarned === 'number' ? tx.pointsEarned : 0;
          return total + Math.max(0, pointsEarned);
        }, 0);

        if (isActive) {
          callback({
            loaded: true,
            pendingCount: response.count,
            pendingPoints,
          });
        }
      } catch (error) {
        console.error('Error fetching pending transactions:', error);
        if (isActive) {
          callback({ loaded: true, pendingCount: 0, pendingPoints: 0 });
        }
      }
    };

    // Initial fetch
    fetchPending();

    // Poll every 30 seconds
    const interval = setInterval(fetchPending, 30000);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  },
};
