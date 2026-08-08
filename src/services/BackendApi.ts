import { firebaseAuth } from '../config/firebase';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ||
  'https://us-central1-gongcha-backend-neo.cloudfunctions.net';

export interface VoucherRedeemResponse {
  success: boolean;
  voucher: {
    id: string;
    rewardId: string;
    title: string;
    code: string;
    expiresAt: string;
    isUsed: boolean;
    redeemedAt: string;
  };
  newBalance: number;
  newTier: string;
}

export interface TransactionListResponse {
  transactions: Array<{
    id: string;
    uid: string;
    type: 'earn' | 'redeem';
    pointsEarned?: number;
    status: 'PENDING' | 'COMPLETED' | 'VERIFIED' | 'REJECTED';
    createdAt: string;
    storeId?: string;
    reference?: string;
    [key: string]: any;
  }>;
  hasMore: boolean;
  count: number;
}

export const BackendApi = {
  async redeemVoucher(rewardId: string): Promise<VoucherRedeemResponse> {
    const user = firebaseAuth.currentUser;
    if (!user) throw new Error('Not authenticated');

    const token = await user.getIdToken();
    const res = await fetch(`${BACKEND_URL}/api/vouchers/redeem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ rewardId }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Redemption failed');
    }

    return res.json();
  },

  async getTransactions(
    status?: 'pending' | 'verified' | 'rejected',
    limit?: number
  ): Promise<TransactionListResponse> {
    const user = firebaseAuth.currentUser;
    if (!user) throw new Error('Not authenticated');

    const token = await user.getIdToken();
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (limit) params.append('limit', String(limit));

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${BACKEND_URL}/api/members/me/transactions${query}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to fetch transactions');
    }

    return res.json();
  },
};
