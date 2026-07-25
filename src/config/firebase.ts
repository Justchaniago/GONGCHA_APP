import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import * as FirebaseAuth from 'firebase/auth';
import { getAnalytics, type Analytics } from 'firebase/analytics';

const { initializeAuth, getAuth } = FirebaseAuth;
const getReactNativePersistence = (FirebaseAuth as any).getReactNativePersistence as
  | ((storage: typeof AsyncStorage) => any)
  | undefined;

// Config Project Gong Cha (Sesuai yang kamu kirim)
const firebaseConfig = {
  apiKey: 'AIzaSyCpCLkG0gjvcHMghrgbUcw6N0Cbr79UlBo',
  authDomain: 'gongcha-backend.firebaseapp.com',
  projectId: 'gongcha-backend',
  storageBucket: 'gongcha-backend.firebasestorage.app',
  messagingSenderId: '79343384792',
  appId: '1:79343384792:web:9ff7405f35686988eb7fad',
  measurementId: 'G-1S597BNPD1',
};

// 1. Init App (Singleton Pattern)
const defaultApp = getApps().find((a) => a.name === '[DEFAULT]');
export const firebaseApp = defaultApp ?? initializeApp(firebaseConfig);


// 2. Init Auth dengan Persistence (Agar tidak auto-logout)
let auth;
if (Platform.OS !== 'web') {
  try {
    auth = getReactNativePersistence
      ? initializeAuth(firebaseApp, {
          persistence: getReactNativePersistence(AsyncStorage),
        })
      : getAuth(firebaseApp);
  } catch (e) {
    auth = getAuth(firebaseApp);
  }
} else {
  auth = getAuth(firebaseApp);
}
export const firebaseAuth = auth;

// 3. Init Service Lain
export const firestoreDb = getFirestore(firebaseApp);
export const firebaseStorage = getStorage(firebaseApp);

// 4. Analytics
export const firebaseAnalytics: Analytics | null = Platform.OS === 'web' ? getAnalytics(firebaseApp) : null;