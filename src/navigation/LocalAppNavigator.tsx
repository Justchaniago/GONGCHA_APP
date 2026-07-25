import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { resolveSessionRoute } from '../application/session/sessionRules';
import { useMember } from '../context/MemberContext';
import CustomTabBar from '../components/CustomTabBar';
import HomeScreen from '../screens/HomeScreen';
import QrPlaceholderScreen from '../screens/QrPlaceholderScreen';
import LocationPermissionScreen from '../screens/LocationPermissionScreen';
import LocalDashboardScreen from '../screens/LocalDashboardScreen';
import LocalLoyaltyActivityScreen from '../screens/LocalLoyaltyActivityScreen';
import LocalMembershipStatusScreen from '../screens/LocalMembershipStatusScreen';
import LocalProfileScreen from '../screens/LocalProfileScreen';
import LocalMenuScreen from '../screens/LocalMenuScreen';
import LocalRewardsScreen from '../screens/LocalRewardsScreen';
import LocalPromotionsScreen from '../screens/LocalPromotionsScreen';
import NotificationPermissionScreen from '../screens/NotificationPermissionScreen';
import ProfileCompletionScreen from '../screens/ProfileCompletionScreen';
import UpdatePasswordScreen from '../screens/UpdatePasswordScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import LocalStoreLocatorScreen from '../screens/LocalStoreLocatorScreen';
import LocalNotificationsScreen from '../screens/LocalNotificationsScreen';
import { hasCompletedGuestOnboarding } from '../utils/guestOnboarding';

export type LocalStackParamList = {
  MainTabs: undefined;
  LocationPermission: undefined;
  NotificationPermission: undefined;
  Welcome: undefined;
  ProfileCompletion: undefined;
  LocalDashboard: undefined;
  LocalLoyaltyActivity: undefined;
  LocalMembershipStatus: undefined;
  LocalProfile: undefined;
  LocalRewards: undefined;
  LocalMenu: undefined;
  LocalStoreLocator: undefined;
  LocalNotifications: undefined;
  LocalPromotions: undefined;
  UpdatePassword: { oobCode?: string; mode?: 'reset' | 'change' };
};

const Stack = createNativeStackNavigator<LocalStackParamList>();
const Tab = createBottomTabNavigator();

function LocalTabNavigator() {
  return (
    <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Menu" component={LocalMenuScreen} />
      <Tab.Screen name="QR" component={QrPlaceholderScreen} />
      <Tab.Screen name="Rewards" component={LocalRewardsScreen} />
      <Tab.Screen name="Profile" component={LocalProfileScreen} />
    </Tab.Navigator>
  );
}

export default function LocalAppNavigator() {
  const { isAuthenticated, sessionPhase } = useMember();
  const route = resolveSessionRoute(sessionPhase);
  const [onboardingReady, setOnboardingReady] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  useEffect(() => {
    let active = true;
    void hasCompletedGuestOnboarding()
      .then((complete) => {
        if (active) setOnboardingComplete(complete);
      })
      .finally(() => {
        if (active) setOnboardingReady(true);
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  if (route === 'spinner' || !onboardingReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#FFF8F0',
        }}
      >
        <ActivityIndicator size="large" color="#C8102E" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {route === 'needs-profile' ? (
        <Stack.Screen
          name="ProfileCompletion"
          component={ProfileCompletionScreen}
        />
      ) : route === 'ready' ? (
        <>
          <Stack.Screen
            name="MainTabs"
            component={LocalTabNavigator}
          />
          <Stack.Screen
            name="LocalDashboard"
            component={LocalDashboardScreen}
          />

          <Stack.Screen
            name="LocalLoyaltyActivity"
            component={LocalLoyaltyActivityScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="LocalMembershipStatus"
            component={LocalMembershipStatusScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="LocalProfile"
            component={LocalProfileScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="LocalRewards"
            component={LocalRewardsScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="LocalMenu"
            component={LocalMenuScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="LocalStoreLocator"
            component={LocalStoreLocatorScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="LocalPromotions"
            component={LocalPromotionsScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="LocalNotifications"
            component={LocalNotificationsScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
        </>
      ) : (
        <>
          {!onboardingComplete && (
            <Stack.Screen
              name="LocationPermission"
              component={LocationPermissionScreen}
            />
          )}
          {!onboardingComplete && (
            <Stack.Screen
              name="NotificationPermission"
              component={NotificationPermissionScreen}
            />
          )}
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen
            name="UpdatePassword"
            component={UpdatePasswordScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
