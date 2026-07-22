import React, { useEffect, useState } from 'react';
import { LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import './global.css';

import AppNavigator from './src/navigation/AppNavigator';
import { MemberProvider } from './src/context/MemberContext';
import { configureGoogleSignIn } from './src/services/GoogleSignInService';

configureGoogleSignIn();
import { SecurityProvider } from './src/context/SecurityContext';
import MemberCardModal from './src/components/MemberCardModal';
import PromoAdModal from './src/components/PromoAdModal';

// 🔥 PERBAIKAN IMPORT: Hapus kurung kurawal karena ini export default
import useCustomFonts from './src/hooks/useCustomFonts';
import { preloadAppAssets } from './src/utils/preloadAppAssets';

// Abaikan warning yang tidak kritis di layar
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Require cycle:',
]);

SplashScreen.preventAutoHideAsync();

export default function App() {
  // 🔥 PERBAIKAN PANGGILAN: Hook ini mengembalikan boolean langsung, bukan object
  const fontsLoaded = useCustomFonts();
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  useEffect(() => {
    async function loadAssets() {
      try {
        await preloadAppAssets();
      } catch (e) {
        console.warn('Gagal memuat beberapa aset gambar:', e);
      } finally {
        setAssetsLoaded(true);
      }
    }
    loadAssets();
  }, []);

  useEffect(() => {
    // 🔥 PERBAIKAN PENGECEKAN: Cukup cek fontsLoaded dan assetsLoaded
    if (fontsLoaded && assetsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, assetsLoaded]);

  // Tahan layar kosong sampai semua siap (mencegah kedip)
  if (!fontsLoaded || !assetsLoaded) return null;

  return (
    <SafeAreaProvider>
      <MemberProvider>
        <SecurityProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
          <MemberCardModal />
          <PromoAdModal />
        </SecurityProvider>
      </MemberProvider>
    </SafeAreaProvider>
  );
}
