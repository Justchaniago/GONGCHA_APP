# Firebase Cloud Functions - GongCha App

Cloud Functions untuk automated cleanup dan data management.

## 📋 Functions List

### 1. **cleanupUnverifiedUsers** (Scheduled)
- **Trigger**: Setiap hari jam 2 pagi (Asia/Jakarta timezone)
- **Purpose**: Auto-delete Firebase Auth users yang:
  - Belum verify email setelah 7 hari
  - Tidak memiliki Firestore document
- **Benefit**: Menghindari bloat di Firebase Auth dari abandoned signups

### 2. **syncDeleteUserData** (Auth Trigger)
- **Trigger**: Saat user dihapus dari Firebase Auth (manual via Console)
- **Purpose**: Otomatis delete Firestore document yang terkait
- **Benefit**: Menjaga konsistensi data antara Auth dan Firestore

### 3. **manualCleanup** (HTTP Callable)
- **Trigger**: Manual call via HTTP
- **Purpose**: Testing/manual cleanup dengan custom parameters
- **Usage**: Untuk trigger cleanup secara manual saat diperlukan

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js 18 atau lebih tinggi
- Firebase CLI (`npm install -g firebase-tools`)
- Firebase project sudah diinisialisasi

### Install Dependencies

```bash
cd functions
npm install
```

### Build TypeScript

```bash
npm run build
```

---

## 🧪 Testing Locally

### Start Firebase Emulators

```bash
npm run serve
```

Functions akan berjalan di: `http://localhost:5001/[project-id]/[region]/[function-name]`

### Test manualCleanup via curl

```bash
# Test dengan daysOld = 7 (default)
curl -X POST http://localhost:5001/[project-id]/[region]/manualCleanup \
  -H "Content-Type: application/json" \
  -d '{"data": {"daysOld": 7}}'

# Test dengan daysOld custom (e.g., 1 day untuk testing)
curl -X POST http://localhost:5001/[project-id]/[region]/manualCleanup \
  -H "Content-Type: application/json" \
  -d '{"data": {"daysOld": 1}}'
```

---

## 🌐 Deployment

### Deploy All Functions

```bash
firebase deploy --only functions
```

### Deploy Specific Function

```bash
# Deploy hanya cleanupUnverifiedUsers
firebase deploy --only functions:cleanupUnverifiedUsers

# Deploy hanya syncDeleteUserData
firebase deploy --only functions:syncDeleteUserData

# Deploy hanya manualCleanup
firebase deploy --only functions:manualCleanup
```

---

## 📊 Monitoring & Logs

### View Logs in Real-time

```bash
npm run logs
```

### View Specific Function Logs

```bash
firebase functions:log --only cleanupUnverifiedUsers
```

### Via Firebase Console
1. Buka [Firebase Console](https://console.firebase.google.com)
2. Pilih project
3. Functions → Logs
4. Filter by function name

---

## ⚙️ Configuration

### Timezone & Schedule (cleanupUnverifiedUsers)

Edit `src/index.ts`:

```typescript
.pubsub.schedule('0 2 * * *') // Cron format: menit jam hari bulan hari-dalam-minggu
.timeZone('Asia/Jakarta')
```

**Contoh Cron Schedule:**
- `0 2 * * *` - Setiap hari jam 2 pagi
- `0 */6 * * *` - Setiap 6 jam
- `0 0 * * 0` - Setiap minggu hari Minggu jam 12 malam

### Cleanup Age Threshold

Edit `src/index.ts`:

```typescript
const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000; // Ubah 7 ke angka lain
```

### Memory & Timeout

```typescript
.runWith({ 
  timeoutSeconds: 540,  // Max 540 detik (9 menit)
  memory: '1GB'         // '256MB', '512MB', '1GB', '2GB'
})
```

---

## 🔐 Security Considerations

### 1. Authentication untuk manualCleanup

Uncomment bagian ini di `src/index.ts`:

```typescript
if (!context.auth) {
  throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
}
```

### 2. Admin Role Check (Optional)

```typescript
const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
if (userDoc.get('role') !== 'admin') {
  throw new functions.https.HttpsError('permission-denied', 'Admin only');
}
```

---

## 📈 Cost Optimization

### Free Tier Limits (Blaze Plan)
- **Invocations**: 2 million/month
- **Compute Time**: 400,000 GB-seconds/month
- **Outbound Data**: 5 GB/month

### Optimization Tips
1. **Schedule wisely**: Jangan terlalu sering (setiap hari sudah cukup)
2. **Batch processing**: Process max 1000 users per run
3. **Timeout setting**: Set sesuai kebutuhan, jangan terlalu besar
4. **Memory allocation**: Gunakan yang paling kecil yang masih bisa handle workload

---

## 🐛 Troubleshooting

### Error: "Permission denied"
- Pastikan Firebase project di Blaze plan (pay-as-you-go)
- Check IAM roles di Firebase Console

### Error: "Module not found"
- Run `npm install` di folder `functions/`
- Check `functions/package.json` dependencies

### Function tidak terpicu
- Check logs: `firebase functions:log`
- Verify schedule syntax di cron format
- Test dengan `manualCleanup` terlebih dahulu

### Testing dengan dummy data
1. Create test account dengan email dummy
2. Check di Firebase Console → Authentication
3. Wait atau ubah threshold ke 1 hari untuk testing
4. Trigger `manualCleanup` dengan `daysOld: 1`
5. Verify user terhapus di Authentication

---

## 📝 Implementation Details

### Delayed Document Creation Flow

**Before (Old)**:
```
Signup → Create Auth + Firestore doc → Send verification → signOut
Problem: Orphaned Firestore docs jika user tidak verify
```

**After (New)**:
```
Signup → Create Auth → Send verification → signOut (NO Firestore doc)
Login → Check verified → Create Firestore doc (FIRST TIME)
```

**Benefit**:
- ✅ Tidak ada orphaned Firestore documents
- ✅ Firestore doc hanya untuk verified users
- ✅ Cleanup hanya butuh delete Auth user (Firestore kosong)

### Data Consistency

- **Auth User**: Created immediately on signup
- **Firestore Doc**: Created on FIRST login after email verification
- **Cleanup Target**: Auth users tanpa Firestore doc + unverified + > 7 days

---

## 📞 Support

Jika ada issue atau pertanyaan:
1. Check logs via Firebase Console
2. Review function code di `src/index.ts`
3. Test locally dengan emulators
4. Check Firebase quotas & billing

---

## ✅ Checklist Deployment

- [ ] Install dependencies: `cd functions && npm install`
- [ ] Build TypeScript: `npm run build`
- [ ] Test locally: `npm run serve`
- [ ] Test manualCleanup via curl/Postman
- [ ] Verify Firebase project di Blaze plan
- [ ] Deploy: `firebase deploy --only functions`
- [ ] Monitor logs setelah deploy
- [ ] Test di production dengan dummy account
- [ ] Setup monitoring/alerts (optional)
