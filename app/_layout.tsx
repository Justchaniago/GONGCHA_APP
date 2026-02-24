import '../global.css';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { ThemeProvider } from '../src/context/ThemeContext';
import { MemberProvider, useMember } from '../src/context/MemberContext';
import * as SplashScreen from 'expo-splash-screen';
import { useCustomFonts } from '../src/hooks/useCustomFonts';

// Tahan Splash Screen sampai font dan auth siap
SplashScreen.preventAutoHideAsync();

function InitialLayout() {
  const { isAuthenticated, loading } = useMember();
  const segments = useSegments();
  const router = useRouter();
  const { fontsLoaded } = useCustomFonts();

  useEffect(() => {
    // 1. Cek apakah font sudah siap
    if (!fontsLoaded || loading) return;

    // 2. Tentukan apakah user sedang di area Auth (Welcome/Login)
    const inAuthGroup = segments[0] === '(auth)' || segments.length === 0;

    if (!isAuthenticated && !inAuthGroup) {
      // Jika tidak login dan mencoba akses halaman dalam -> Tendang ke Welcome
      router.replace('/src/screens/WelcomeScreen');
    } else if (isAuthenticated && inAuthGroup) {
      // Jika sudah login dan masih di halaman login -> Masukkan ke Home
      router.replace('/src/screens/HomeScreen');
    }

    // Sembunyikan Splash Screen setelah navigasi siap
    SplashScreen.hideAsync();
  }, [isAuthenticated, loading, fontsLoaded, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Definisi rute utama secara struktural */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="src/screens/WelcomeScreen" options={{ animation: 'fade' }} />
      <Stack.Screen name="src/screens/LoginScreen" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="src/screens/HomeScreen" options={{ animation: 'fade' }} />
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