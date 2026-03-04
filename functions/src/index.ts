import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

/**
 * ═════════════════════════════════════════════════════════════════════════
 * CLEANUP UNVERIFIED USERS
 * ═════════════════════════════════════════════════════════════════════════
 * Scheduled function yang berjalan setiap hari jam 2 pagi (UTC)
 * untuk menghapus Firebase Auth users yang:
 * - Belum verify email setelah 7 hari
 * - Tidak memiliki Firestore document (karena delayed creation)
 */
export const cleanupUnverifiedUsers = functions
  .runWith({ timeoutSeconds: 540, memory: '1GB' })
  .pubsub.schedule('0 2 * * *') // Setiap hari jam 2 pagi UTC
  .timeZone('Asia/Jakarta')
  .onRun(async (context) => {
    try {
      const now = Date.now();
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000; // 7 hari dalam ms
      
      let deletedCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Iterate semua users (max 1000 per batch)
      const listResult = await admin.auth().listUsers(1000);
      
      for (const user of listResult.users) {
        try {
          // Skip jika user sudah verify email
          if (user.emailVerified) continue;
          
          // Skip jika bukan email signup (phone-based users)
          const isPhoneAuth = user.email?.endsWith('@gongcha-id.app');
          if (isPhoneAuth) continue;
          
          // Check umur account
          const creationTime = new Date(user.metadata.creationTime).getTime();
          
          // Skip jika account masih di bawah 7 hari
          if (creationTime > sevenDaysAgo) continue;
          
          // Check apakah ada Firestore doc (seharusnya tidak ada karena delayed creation)
          const userDoc = await admin.firestore().collection('users').doc(user.uid).get();
          
          // Skip jika somehow ada Firestore doc (safety check)
          if (userDoc.exists) {
            console.log(`Skipping user ${user.uid} - has Firestore doc despite not verified`);
            continue;
          }
          
          // Delete user dari Firebase Auth
          await admin.auth().deleteUser(user.uid);
          deletedCount++;
          
          console.log(`Deleted unverified user: ${user.uid} (${user.email}), created: ${user.metadata.creationTime}`);
          
        } catch (error: any) {
          errorCount++;
          const errorMsg = `Error deleting user ${user.uid}: ${error.message}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }
      
      // Log summary
      const summary = {
        timestamp: new Date().toISOString(),
        totalScanned: listResult.users.length,
        deleted: deletedCount,
        errors: errorCount,
        errorDetails: errors.length > 0 ? errors : undefined,
      };
      
      console.log('Cleanup summary:', JSON.stringify(summary, null, 2));
      
      return summary;
      
    } catch (error: any) {
      console.error('Fatal error in cleanupUnverifiedUsers:', error);
      throw error;
    }
  });

/**
 * ═════════════════════════════════════════════════════════════════════════
 * SYNC DELETE USER DATA
 * ═════════════════════════════════════════════════════════════════════════
 * Function yang otomatis terpicu saat user dihapus dari Firebase Auth
 * (via Firebase Console atau manual deletion)
 * untuk menghapus Firestore document yang terkait
 * 
 * NOTE: Function ini TIDAK terpicu saat user delete via cleanupUnverifiedUsers
 * karena unverified users tidak punya Firestore doc (delayed creation).
 * Function ini untuk cleanup manual deletion via Firebase Console.
 */
export const syncDeleteUserData = functions.auth.user().onDelete(async (user) => {
  try {
    const uid = user.uid;
    
    // Check apakah ada Firestore doc
    const userDocRef = admin.firestore().collection('users').doc(uid);
    const userDoc = await userDocRef.get();
    
    if (!userDoc.exists) {
      console.log(`No Firestore doc found for deleted user ${uid}, skipping cleanup`);
      return null;
    }
    
    // Delete Firestore document
    await userDocRef.delete();
    
    console.log(`Successfully deleted Firestore doc for user ${uid} (${user.email})`);
    
    return null;
    
  } catch (error: any) {
    console.error(`Error deleting Firestore doc for user ${user.uid}:`, error);
    throw error;
  }
});

/**
 * ═════════════════════════════════════════════════════════════════════════
 * MANUAL CLEANUP TRIGGER (HTTP Callable)
 * ═════════════════════════════════════════════════════════════════════════
 * Testing function untuk trigger cleanup secara manual
 * Bisa dipanggil via Firebase Console atau postman
 * 
 * Usage:
 * curl -X POST https://[region]-[project-id].cloudfunctions.net/manualCleanup \
 *   -H "Content-Type: application/json" \
 *   -d '{"daysOld": 7}'
 */
export const manualCleanup = functions.https.onCall(async (data, context) => {
  // Optional: Add authentication check
  // if (!context.auth) {
  //   throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  // }
  
  const daysOld = data.daysOld ?? 7;
  const now = Date.now();
  const cutoffTime = now - daysOld * 24 * 60 * 60 * 1000;
  
  let deletedCount = 0;
  const deletedUsers: Array<{ uid: string; email: string; createdAt: string }> = [];
  
  const listResult = await admin.auth().listUsers(1000);
  
  for (const user of listResult.users) {
    if (user.emailVerified) continue;
    
    const isPhoneAuth = user.email?.endsWith('@gongcha-id.app');
    if (isPhoneAuth) continue;
    
    const creationTime = new Date(user.metadata.creationTime).getTime();
    if (creationTime > cutoffTime) continue;
    
    const userDoc = await admin.firestore().collection('users').doc(user.uid).get();
    if (userDoc.exists) continue;
    
    await admin.auth().deleteUser(user.uid);
    deletedCount++;
    
    deletedUsers.push({
      uid: user.uid,
      email: user.email || '',
      createdAt: user.metadata.creationTime,
    });
  }
  
  return {
    success: true,
    deletedCount,
    deletedUsers,
    cutoffDate: new Date(cutoffTime).toISOString(),
  };
});
