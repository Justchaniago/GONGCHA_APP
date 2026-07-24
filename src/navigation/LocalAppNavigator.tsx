import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { resolveSessionRoute } from '../application/session/sessionRules';
import { useMember } from '../context/MemberContext';
import LocationPermissionScreen from '../screens/LocationPermissionScreen';
import LoginScreen from '../screens/LoginScreen';
import NotificationPermissionScreen from '../screens/NotificationPermissionScreen';
import ProfileCompletionScreen from '../screens/ProfileCompletionScreen';
import UpdatePasswordScreen from '../screens/UpdatePasswordScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import { hasCompletedGuestOnboarding } from '../utils/guestOnboarding';

type LocalStackParamList = {
  LocationPermission: undefined;
  NotificationPermission: undefined;
  Welcome: undefined;
  Login: { initialStep?: 'phone' | 'otp' };
  ProfileCompletion: undefined;
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
      {route === 'needs-profile' || route === 'ready' ? (
        <Stack.Screen
          name="ProfileCompletion"
          component={ProfileCompletionScreen}
        />
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
          <Stack.Screen name="Login" component={LoginScreen} />
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
