import React, { useEffect, useState } from 'react';

import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import { MemberProvider } from '../context/MemberContext';
import useCustomFonts from '../hooks/useCustomFonts';
import LocalAppNavigator from '../navigation/LocalAppNavigator';

import CustomAnimatedSplashScreen from '../components/CustomAnimatedSplashScreen';

void SplashScreen.preventAutoHideAsync();

export default function LocalEmulatorApp() {
  const fontsLoaded = useCustomFonts();
  const [showSplash, setShowSplash] = useState(true);

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
        {showSplash && (
          <CustomAnimatedSplashScreen onFinish={() => setShowSplash(false)} />
        )}
      </MemberProvider>
    </SafeAreaProvider>
  );
}

