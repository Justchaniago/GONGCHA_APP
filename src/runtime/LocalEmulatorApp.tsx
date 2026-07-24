import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import { MemberProvider } from '../context/MemberContext';
import useCustomFonts from '../hooks/useCustomFonts';
import LocalAppNavigator from '../navigation/LocalAppNavigator';

void SplashScreen.preventAutoHideAsync();

export default function LocalEmulatorApp() {
  const fontsLoaded = useCustomFonts();

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <MemberProvider>
        <NavigationContainer>
          <LocalAppNavigator />
        </NavigationContainer>
      </MemberProvider>
    </SafeAreaProvider>
  );
}
