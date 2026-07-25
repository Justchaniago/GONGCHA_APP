import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { resolveSessionRoute } from '../application/session/sessionRules';
import { useMember } from '../context/MemberContext';
import LocationPermissionScreen from '../screens/LocationPermissionScreen';
import LocalDashboardScreen from '../screens/LocalDashboardScreen';
import LocalLoyaltyActivityScreen from '../screens/LocalLoyaltyActivityScreen';
import LocalMembershipStatusScreen from '../screens/LocalMembershipStatusScreen';
import LocalProfileScreen from '../screens/LocalProfileScreen';
import LocalRewardsScreen from '../screens/LocalRewardsScreen';
import NotificationPermissionScreen from '../screens/NotificationPermissionScreen';
import ProfileCompletionScreen from '../screens/ProfileCompletionScreen';
import UpdatePasswordScreen from '../screens/UpdatePasswordScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import { hasCompletedGuestOnboarding } from '../utils/guestOnboarding';

export type LocalStackParamList = {
  LocationPermission: undefined;
  NotificationPermission: undefined;
  Welcome: undefined;
  ProfileCompletion: undefined;
  LocalDashboard: undefined;
  LocalLoyaltyActivity: undefined;
  LocalMembershipStatus: undefined;
  LocalProfile: undefined;
  LocalRewards: undefined;
  UpdatePassword: { oobCode?: string; mode?: 'reset' | 'change' };
};

const Stack = createNativeStackNavigator<LocalStackParamList>();

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
