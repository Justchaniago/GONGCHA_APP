import '../global.css';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { ThemeProvider } from '../src/context/ThemeContext';
import { MemberProvider, useMember } from '../src/context/MemberContext';
import * as SplashScreen from 'expo-splash-screen';
import { useCustomFonts } from '../src/hooks/useCustomFonts';

SplashScreen.preventAutoHideAsync();

function InitialLayout() {
  const { isAuthenticated, loading } = useMember();
  const segments = useSegments();
  const router = useRouter();
  const { fontsLoaded } = useCustomFonts();

  useEffect(() => {
    if (!fontsLoaded || loading) return;

    // Cek apakah user berada di folder (auth) atau welcome screen
    const inAuthGroup = segments[0] === 'src/screens/LoginScreen' || segments[0] === 'src/screens/WelcomeScreen';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/src/screens/WelcomeScreen');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/src/screens/HomeScreen');
    }

    SplashScreen.hideAsync();
  }, [isAuthenticated, loading, fontsLoaded, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="src/screens/WelcomeScreen" />
      <Stack.Screen name="src/screens/LoginScreen" />
      <Stack.Screen name="src/screens/HomeScreen" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <MemberProvider>
        <InitialLayout />
      </MemberProvider>
    </ThemeProvider>
  );
}