import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import * as FirebaseAuth from 'firebase/auth';
import { getAnalytics, type Analytics } from 'firebase/analytics';

const { initializeAuth, getAuth } = FirebaseAuth;
const getReactNativePersistence = (FirebaseAuth as any).getReactNativePersistence as
  | ((storage: typeof AsyncStorage) => any)
  | undefined;

// Config Project Gong Cha
const firebaseConfig = {
  apiKey: 'AIzaSyCvEEadV2j1dx1pzK4yeZDBS4dRPEoM2Uo',
  authDomain: 'gongcha-backend-neo.firebaseapp.com',
  projectId: 'gongcha-backend-neo',
  storageBucket: 'gongcha-backend-neo.firebasestorage.app',
  messagingSenderId: '353793177534',
  appId: '1:353793177534:web:798ddd7c16acf221e1ebef',
  measurementId: 'G-HBYY1WDWN8',
};

// 1. Init App (Singleton)
const defaultApp = getApps().find((a) => a.name === '[DEFAULT]');
export const firebaseApp = defaultApp ?? initializeApp(firebaseConfig);

// 2. Auth + Persistence
let auth;
if (Platform.OS !== 'web') {
  try {
    auth = getReactNativePersistence
      ? initializeAuth(firebaseApp, {
          persistence: getReactNativePersistence(AsyncStorage),
        })
      : getAuth(firebaseApp);
  } catch {
    auth = getAuth(firebaseApp);
  }
} else {
  auth = getAuth(firebaseApp);
}
export const firebaseAuth = auth;

// 3. Storage only (Firestore disabled — no (default) database)
export const firebaseStorage = getStorage(firebaseApp);

// 4. Analytics (web only)
export const firebaseAnalytics: Analytics | null = Platform.OS === 'web' ? getAnalytics(firebaseApp) : null;