# Member App — API Integration Guide (Stage 3)

**Status:** Ready for implementation  
**Date:** 2026-05-03

---

## Overview

Replace 2 direct Firestore operations with backend API calls.

| Operation | Current | Target | Priority |
|-----------|---------|--------|----------|
| Voucher redemption | `UserService.redeemVoucher()` → direct updateDoc | `POST /api/vouchers/redeem` | 🔴 HIGH |
| Transaction history | `TransactionService` → direct query | `GET /api/members/me/transactions` | 🟡 MEDIUM |

---

## 1. Voucher Redemption Flow

### Current Implementation
**File:** `src/services/UserService.ts:33-55`

```typescript
async redeemVoucher(reward: any) {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('User not found');

  const newVoucher: UserVoucher = {
    id: `v_${Date.now()}`,
    rewardId: reward.id,
    title: reward.title,
    code: `GC-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    isUsed: false,
  };

  const userRef = doc(firestoreDb, 'users', user.uid);
  await updateDoc(userRef, {
    vouchers: arrayUnion(newVoucher)
  });
  
  return newVoucher;
}
```

### New Implementation

1. **Create API client** (`src/services/BackendApi.ts`):

```typescript
import { firebaseAuth } from '../config/firebase';

const BACKEND_URL = 'https://us-central1-gongcha-app-4691f.cloudfunctions.net';

export const BackendApi = {
  async redeemVoucher(rewardId: string) {
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

    return res.json(); // {success, voucher, newBalance, newTier}
  },

  async getTransactions(status?: string, limit?: number) {
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

    return res.json(); // {transactions[], hasMore, count}
  },
};
```

2. **Update UserService.ts:50**:

```typescript
import { BackendApi } from './BackendApi';

async redeemVoucher(reward: any) {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('User not found');

  // Call backend API (atomic operation)
  const response = await BackendApi.redeemVoucher(reward.id);
  
  // Backend returns created voucher + new balance
  return response.voucher;
}
```

### Call Sites
- `src/screens/RewardsScreen.tsx` — reward redemption button

---

## 2. Transaction History

### Current Implementation
**File:** `src/services/TransactionService.ts:71, 195, 249`

Uses multiple `onSnapshot()` queries on `transactions` collection:
```typescript
const buildUserQuery = (userId: string, field: TransactionUserField) =>
  query(collection(firestoreDb, 'transactions'), where(field, '==', userId));
```

### New Implementation

1. **Add to BackendApi.ts** (above):

```typescript
async getTransactions(status?: string, limit?: number) {
  // ... (see code above)
}
```

2. **Update TransactionService.ts**:

Replace direct `onSnapshot()` calls with API:

```typescript
import { BackendApi } from './BackendApi';

export const TransactionService = {
  subscribeToPendingTransactionSummary(
    userId: string,
    callback: (summary: PendingTransactionSummary) => void
  ): () => void {
    // Fetch pending transactions via API
    const fetchPending = async () => {
      try {
        const response = await BackendApi.getTransactions('pending', 100);
        const pendingPoints = response.transactions.reduce(
          (sum: number, tx: any) => sum + (tx.pointsEarned || 0),
          0
        );
        callback({
          loaded: true,
          pendingCount: response.count,
          pendingPoints,
        });
      } catch (error) {
        console.error('Error fetching pending:', error);
        callback({ loaded: true, pendingCount: 0, pendingPoints: 0 });
      }
    };

    // Initial fetch
    fetchPending();

    // Poll every 10 seconds (or use webhook in future)
    const interval = setInterval(fetchPending, 10000);

    // Cleanup
    return () => clearInterval(interval);
  },

  subscribeToMemberTransactionHistory(
    userId: string,
    callback: (items: MemberTransactionHistoryItem[]) => void
  ): () => void {
    const fetchHistory = async () => {
      try {
        const response = await BackendApi.getTransactions(undefined, 50);
        const items = response.transactions.map(normalizeTransactionDoc);
        callback(sortHistoryItems(items));
      } catch (error) {
        console.error('Error fetching history:', error);
        callback([]);
      }
    };

    // Initial fetch
    fetchHistory();

    // Poll every 15 seconds
    const interval = setInterval(fetchHistory, 15000);

    return () => clearInterval(interval);
  },
};
```

### Call Sites
- `src/context/MemberContext.tsx:162` — pending transaction summary
- `src/screens/HomeScreen.tsx` — transaction history display

---

## 3. Environment Setup

Add backend URL to `.env.local`:

```
EXPO_PUBLIC_BACKEND_URL=https://us-central1-gongcha-app-4691f.cloudfunctions.net
```

Update BackendApi.ts:

```typescript
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://us-central1-gongcha-app-4691f.cloudfunctions.net';
```

---

## 4. Testing Checklist

### Unit Tests
- [ ] BackendApi.redeemVoucher() with valid reward
- [ ] BackendApi.redeemVoucher() with insufficient points
- [ ] BackendApi.getTransactions() with filters
- [ ] Token verification in endpoint

### Integration Tests
- [ ] Member redeems reward → points deducted
- [ ] Voucher appears in user.vouchers
- [ ] Transaction history shows pending transaction
- [ ] Member can't redeem with insufficient points (402 response)

### UI Tests
- [ ] Rewards screen → redeem button works
- [ ] Points update after redemption (via MemberContext)
- [ ] Transaction history loads + displays

---

## 5. Rollout Plan

**Phase 1: Voucher Redemption**
1. Create BackendApi.ts
2. Update UserService.redeemVoucher()
3. Test in dev (manual + automated)
4. Deploy Member App v1.1

**Phase 2: Transaction History**
1. Update TransactionService
2. Switch MemberContext to use API
3. Test polling behavior
4. Deploy Member App v1.2

**Fallback:** If API down, graceful error + retry logic

---

## Endpoint Reference

### POST /api/vouchers/redeem
```
Headers:
  Authorization: Bearer {idToken}
  Content-Type: application/json

Body:
  {
    "rewardId": "reward_123"
  }

Response (200):
  {
    "success": true,
    "voucher": {
      "id": "v_1714754400000",
      "rewardId": "reward_123",
      "title": "Free Drink",
      "code": "GC-ABC12",
      "expiresAt": "2026-06-02T17:40:00.000Z",
      "isUsed": false,
      "redeemedAt": "2026-05-03T17:40:00.000Z"
    },
    "newBalance": 850,
    "newTier": "Gold"
  }

Error (402):
  {
    "error": "Insufficient points",
    "currentPoints": 100,
    "required": 500
  }

Error (404):
  {
    "error": "Reward not found"
  }
```

### GET /api/members/me/transactions?status=pending&limit=50
```
Headers:
  Authorization: Bearer {idToken}

Query:
  status=pending|verified|rejected (optional)
  limit=1-100 (default 50)

Response (200):
  {
    "transactions": [
      {
        "id": "tx_123",
        "uid": "user_abc",
        "type": "earn",
        "pointsEarned": 100,
        "status": "PENDING",
        "createdAt": "2026-05-03T10:00:00.000Z",
        "storeId": "store_1",
        "reference": "Receipt-12345"
      }
    ],
    "hasMore": false,
    "count": 5
  }

Error (401):
  {
    "error": "Unauthorized"
  }
```

---

## Notes

- Token refreshed automatically via `getIdToken()`
- Polling intervals: pending (10s), history (15s) — tune based on UX needs
- Error messages passed to user via Alert/Toast
- No offline support yet (future: add local cache + sync)

