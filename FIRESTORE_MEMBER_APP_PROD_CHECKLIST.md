# Firestore Member App Production Checklist

Dokumen ini merangkum kebutuhan Firestore rules dan indexes untuk member app setelah migrasi loyalty architecture:

- `users/{uid}`
  - `currentPoints`
  - `pendingPoints`
  - `lifetimePoints`
  - `tierXp`
  - `tier`
- `transactions/{txId}`
  - `uid`
  - `pointsEarned`
  - `status`
  - `type`
- `users/{uid}/notifications/{notifId}`

## Access Patterns Dipakai Member App

### 1. Member profile
Dipakai oleh [src/context/MemberContext.tsx](./src/context/MemberContext.tsx)

- Read: `users/{request.auth.uid}`
- Real-time listener: `onSnapshot(doc(firestoreDb, 'users', user.uid))`

Field penting:

- `currentPoints`
- `pendingPoints`
- `lifetimePoints`
- `tierXp`
- `tier`
- `vouchers`
- `xpHistory` fallback

### 2. Notifications
Dipakai oleh [src/services/NotificationService.ts](./src/services/NotificationService.ts)

- Read: `users/{uid}/notifications`
- Query:
  - `orderBy('createdAt', 'desc')`
  - `limit(20)`
- Update:
  - `isRead: true`

### 3. Transaction history
Dipakai oleh [src/services/TransactionService.ts](./src/services/TransactionService.ts)

Primary query:

- collection: `transactions`
- filters:
  - `where('uid', '==', request.auth.uid)`
  - `orderBy('createdAt', 'desc')`

Legacy fallback:

- `where('userId', '==', request.auth.uid)`
- `where('memberId', '==', request.auth.uid)`

## Firestore Rules Yang Dibutuhkan

Contoh rules minimum untuk member app:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    match /users/{userId} {
      allow read: if isSignedIn() && request.auth.uid == userId;

      // Customer app hanya boleh edit field profil terbatas.
      allow update: if isSignedIn()
        && request.auth.uid == userId
        && request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly(['phoneNumber', 'photoURL']);

      allow create, delete: if false;

      match /notifications/{notifId} {
        allow read: if isSignedIn() && request.auth.uid == userId;

        // Customer hanya boleh mark as read.
        allow update: if isSignedIn()
          && request.auth.uid == userId
          && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['isRead'])
          && request.resource.data.isRead == true;

        allow create, delete: if false;
      }
    }

    match /transactions/{txId} {
      // Member app hanya boleh baca transaksi miliknya sendiri.
      allow read: if isSignedIn() && (
        resource.data.uid == request.auth.uid ||
        resource.data.userId == request.auth.uid ||
        resource.data.memberId == request.auth.uid
      );

      // Semua write transaksi harus lewat cashier/admin/backend.
      allow create, update, delete: if false;
    }

    match /rewards_catalog/{rewardId} {
      allow read: if isSignedIn();
      allow write: if false;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Index Firestore Yang Dibutuhkan

### Wajib untuk member app history

Top-level `transactions`:

1. Composite index:
   - Collection: `transactions`
   - Fields:
     - `uid` ascending
     - `createdAt` descending

Ini dibutuhkan oleh query:

```ts
query(
  collection(firestoreDb, 'transactions'),
  where('uid', '==', userId),
  orderBy('createdAt', 'desc')
)
```

### Opsional untuk fallback data lama

Kalau fallback legacy ingin tetap aman dan cepat:

2. Composite index:
   - Collection: `transactions`
   - Fields:
     - `userId` ascending
     - `createdAt` descending

3. Composite index:
   - Collection: `transactions`
   - Fields:
     - `memberId` ascending
     - `createdAt` descending

Catatan:

- Member app saat ini punya fallback query legacy ke `userId` dan `memberId`.
- Kalau semua data baru sudah konsisten memakai `uid`, fallback ini nanti bisa dihapus.

### Notifications

Biasanya Firestore single-field index default sudah cukup untuk:

```ts
query(
  collection(firestoreDb, 'users', userId, 'notifications'),
  orderBy('createdAt', 'desc'),
  limit(20)
)
```

Dan untuk:

```ts
query(
  collection(firestoreDb, 'users', userId, 'notifications'),
  where('isRead', '==', false)
)
```

Kalau Firestore meminta index tambahan, ikuti link auto-generated dari error console.

## Data Contract Yang Dianggap Member App

### users/{uid}

Field utama:

- `currentPoints`: redeemable balance
- `pendingPoints`: visible but not redeemable
- `lifetimePoints`
- `tierXp`
- `tier`

Fallback legacy yang masih didukung:

- `points` -> fallback ke `currentPoints`
- `xp` -> fallback ke `tierXp` / `lifetimePoints`
- `xpHistory` -> fallback history jika query `transactions` belum tersedia/terindeks

### transactions/{txId}

Field minimum yang sebaiknya konsisten:

- `uid`
- `type`
- `status`
- `createdAt`
- `pointsEarned`

Field tambahan yang aman didukung UI:

- `transactionId`
- `receiptNumber`
- `storeName`
- `storeLocation`
- `memberId`
- `userId`

## Checklist Verifikasi Production

1. Login member dan pastikan `users/{uid}` bisa dibaca realtime.
2. Home menampilkan:
   - available points dari `currentPoints`
   - pending points dari `pendingPoints`
3. Rewards:
   - redeem hanya memakai `currentPoints`
   - pending points tidak dihitung spendable
4. Profile > Transaction History:
   - transaksi `PENDING` muncul sebagai pending validation / points on hold
   - transaksi `COMPLETED` muncul sebagai released
   - transaksi `REJECTED` tidak terlihat seperti menambah poin
5. Notifications:
   - user bisa read subcollection notifikasi miliknya sendiri
   - mark as read berhasil
6. Jika query history gagal, cek:
   - rules read untuk `transactions/{txId}`
   - composite index `uid + createdAt`

## Rekomendasi Cleanup Berikutnya

Kalau migrasi data sudah stabil:

1. Hapus fallback transaction query ke `userId` dan `memberId`.
2. Hapus ketergantungan UI pada `xpHistory`.
3. Konsolidasikan semua transaksi member hanya ke top-level `transactions`.
4. Tambahkan observability di backend:
   - log saat `pendingPoints` ditambah
   - log saat `pendingPoints -> currentPoints` dipindahkan
   - log saat transaksi ditolak
