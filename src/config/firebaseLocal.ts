import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  getAuth,
  initializeAuth,
  type Auth,
} from 'firebase/auth';
import * as FirebaseAuth from 'firebase/auth';

import { runtimeConfig } from './runtime';

const projectId =
  runtimeConfig.mode === 'local_emulator'
    ? runtimeConfig.projectId
    : 'demo-gongcha-local';


const APP_NAME = 'gongcha-local-emulator';
const existingApp = getApps().find((app) => app.name === APP_NAME);
const app =
  existingApp ??
  initializeApp(
    {
      apiKey: 'demo-api-key',
      authDomain: `${projectId}.firebaseapp.com`,
      projectId: projectId,
      appId: 'demo-app-id',
    },
    APP_NAME,
  );

const getReactNativePersistence = (FirebaseAuth as any)
  .getReactNativePersistence as
  | ((storage: typeof AsyncStorage) => unknown)
  | undefined;

let auth: Auth;
if (existingApp) {
  auth = getAuth(getApp(APP_NAME));
} else if (Platform.OS !== 'web' && getReactNativePersistence) {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage) as any,
  });
} else {
  auth = getAuth(app);
}

type EmulatorConnectionState = {
  __gongchaAuthEmulatorUrl?: string;
};
const connectionState = globalThis as typeof globalThis &
  EmulatorConnectionState;
if (runtimeConfig.mode === 'local_emulator') {
  const emulatorUrl = runtimeConfig.authEmulatorUrl;
  if (
    connectionState.__gongchaAuthEmulatorUrl &&
    connectionState.__gongchaAuthEmulatorUrl !== emulatorUrl
  ) {
    throw new Error('auth_emulator_host_changed_without_restart');
  }
  if (!connectionState.__gongchaAuthEmulatorUrl) {
    connectAuthEmulator(auth, emulatorUrl);
    connectionState.__gongchaAuthEmulatorUrl = emulatorUrl;
  }
}

export const firebaseLocalAuth = auth;
