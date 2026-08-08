import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, ActivityIndicator } from 'react-native';

// Import Context
import { useMember } from '../context/MemberContext';
import CustomTabBar from '../components/CustomTabBar';
import { resolveSessionRoute } from '../application/session/sessionRules';

// Import Screens
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import LocationPermissionScreen from '../screens/LocationPermissionScreen';
import NotificationPermissionScreen from '../screens/NotificationPermissionScreen';
import HomeScreen from '../screens/HomeScreen';
import MenuScreen from '../screens/MenuScreen';
import QrPlaceholderScreen from '../screens/QrPlaceholderScreen';
import RewardsScreen from '../screens/RewardsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import StoreLocatorScreen from '../screens/StoreLocatorScreen';
import UpdatePasswordScreen from '../screens/UpdatePasswordScreen';
import ProfileCompletionScreen from '../screens/ProfileCompletionScreen';
import MembershipStatusScreen from '../screens/MembershipStatusScreen';
import HelpCenterScreen from '../screens/HelpCenterScreen';
import { hasCompletedGuestOnboarding } from '../utils/guestOnboarding';
import { USE_FASTAPI_BACKEND } from '../config/flags';
import LocalDashboardScreen from '../screens/LocalDashboardScreen';
import LocalMenuScreen from '../screens/LocalMenuScreen';
import LocalRewardsScreen from '../screens/LocalRewardsScreen';
import LocalProfileScreen from '../screens/LocalProfileScreen';
import LocalStoreLocatorScreen from '../screens/LocalStoreLocatorScreen';
import LocalMembershipStatusScreen from '../screens/LocalMembershipStatusScreen';
import LocalLoyaltyActivityScreen from '../screens/LocalLoyaltyActivityScreen';
import PromoDetailScreen from '../screens/PromoDetailScreen';

export type RootStackParamList = {
  LocationPermission: undefined;
  NotificationPermission: undefined;
  Welcome: undefined;
  Login: { initialStep?: 'phone' | 'otp' };
  MainApp: undefined;
  ProfileCompletion: undefined;
  StoreLocator: undefined;
  EditProfile: undefined;
  UpdatePassword: { oobCode?: string; mode?: 'reset' | 'change' };
  MembershipStatus: undefined;
  HelpCenter: undefined;
  LocalDashboard: undefined;
  LocalLoyaltyActivity: undefined;
  PromoDetail: { imageUrl?: string; imageSource?: any; title: string; subtitle?: string };
};

export type RootTabParamList = {
  Home: undefined; Menu: undefined; QR: undefined; Rewards: undefined; Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

function MainTabNavigator() {
  return (
    <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Menu" component={USE_FASTAPI_BACKEND ? LocalMenuScreen : MenuScreen} />
      <Tab.Screen name="QR" component={QrPlaceholderScreen} />
      <Tab.Screen name="Rewards" component={USE_FASTAPI_BACKEND ? LocalRewardsScreen : RewardsScreen} />
      <Tab.Screen name="Profile" component={USE_FASTAPI_BACKEND ? LocalProfileScreen : ProfileScreen} />
    </Tab.Navigator>
  );
}


export default function AppNavigator() {
  const { isAuthenticated, sessionPhase } = useMember();
  const sessionRoute = resolveSessionRoute(sessionPhase);
  const [guestOnboardingReady, setGuestOnboardingReady] = useState(false);
  const [guestOnboardingComplete, setGuestOnboardingComplete] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadGuestOnboarding() {
      try {
        const completed = await hasCompletedGuestOnboarding();
        if (isMounted) {
          setGuestOnboardingComplete(completed);
        }
      } finally {
        if (isMounted) {
          setGuestOnboardingReady(true);
        }
      }
    }

    loadGuestOnboarding();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  // Jika sedang mengecek sesi ke server Firebase, tahan dengan loading
  if (sessionRoute === 'spinner' || !guestOnboardingReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF8F0' }}>
        <ActivityIndicator size="large" color="#C8102E" />
      </View>
    );
  }

  // Debugging log specific to navigation decision
  // console.log('[AppNavigator] State:', { isAuthenticated, profileComplete: member?.profileComplete });

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {sessionRoute === 'needs-profile' ? (
             // SATPAM: Stop right here! You shall not pass until profile is complete.
             // This prevents MainApp (and HomeScreen) from mounting and triggering the "force exit" crash
             <Stack.Screen name="ProfileCompletion" component={ProfileCompletionScreen} />
      ) : sessionRoute === 'ready' ? (
          // Authenticated AND Profile Complete -> Welcome home
          <>
            <Stack.Screen name="MainApp" component={MainTabNavigator} />
            <Stack.Screen name="StoreLocator" component={USE_FASTAPI_BACKEND ? LocalStoreLocatorScreen : StoreLocatorScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="UpdatePassword" component={UpdatePasswordScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="MembershipStatus" component={USE_FASTAPI_BACKEND ? LocalMembershipStatusScreen : MembershipStatusScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="HelpCenter" component={HelpCenterScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="LocalDashboard" component={LocalDashboardScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="LocalLoyaltyActivity" component={LocalLoyaltyActivityScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="PromoDetail" component={PromoDetailScreen} options={{ animation: 'slide_from_right' }} />
          </>

      ) : (
        // Kalau belum login, hanya bisa akses area luar
        <>
          {!guestOnboardingComplete && <Stack.Screen name="LocationPermission" component={LocationPermissionScreen} />}
          {!guestOnboardingComplete && <Stack.Screen name="NotificationPermission" component={NotificationPermissionScreen} />}
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="UpdatePassword" component={UpdatePasswordScreen} options={{ animation: 'slide_from_bottom' }} />
        </>
      )}
    </Stack.Navigator>
  );
}
