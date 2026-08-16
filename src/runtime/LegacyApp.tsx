import React, { useEffect, useState } from 'react';
import { LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import AppNavigator from '../navigation/AppNavigator';
import { MemberProvider } from '../context/MemberContext';
import { configureGoogleSignIn } from '../services/GoogleSignInService';
import { SecurityProvider } from '../context/SecurityContext';
import MemberCardModal from '../components/MemberCardModal';
import PromoAdModal from '../components/PromoAdModal';
import useCustomFonts from '../hooks/useCustomFonts';
import { preloadAppAssets } from '../utils/preloadAppAssets';

import CustomAnimatedSplashScreen from '../components/CustomAnimatedSplashScreen';
import '../i18n';
import { restoreLanguage } from '../hooks/useLanguage';

configureGoogleSignIn();
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Require cycle:',
]);
void SplashScreen.preventAutoHideAsync();

export default function LegacyApp() {
  const fontsLoaded = useCustomFonts();
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    void restoreLanguage();
  }, []);

  useEffect(() => {
    void preloadAppAssets()
      .catch((error) => {
        console.warn('Gagal memuat beberapa aset gambar:', error);
      })
      .finally(() => setAssetsLoaded(true));
  }, []);

  useEffect(() => {
    if (fontsLoaded && assetsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, assetsLoaded]);

  if (!fontsLoaded || !assetsLoaded) return null;

  return (
    <SafeAreaProvider>
      <MemberProvider>
        <SecurityProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
          {showSplash && (
            <CustomAnimatedSplashScreen onFinish={() => setShowSplash(false)} />
          )}
          <MemberCardModal />
          <PromoAdModal />
        </SecurityProvider>
      </MemberProvider>
    </SafeAreaProvider>
  );
}

