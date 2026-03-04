import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, ActivityIndicator } from 'react-native';

// Import Context
import { useMember } from '../context/MemberContext';
import CustomTabBar from '../components/CustomTabBar';

// Import Screens
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import MenuScreen from '../screens/MenuScreen';
import QrPlaceholderScreen from '../screens/QrPlaceholderScreen';
import RewardsScreen from '../screens/RewardsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import StoreLocatorScreen from '../screens/StoreLocatorScreen';
import UpdatePasswordScreen from '../screens/UpdatePasswordScreen';
import ProfileCompletionScreen from '../screens/ProfileCompletionScreen';

export type RootStackParamList = {
  Welcome: undefined;
  Login: { initialStep?: 'phone' | 'otp' };
  MainApp: undefined;
  ProfileCompletion: undefined;
  StoreLocator: undefined;
  EditProfile: undefined;
  UpdatePassword: { oobCode?: string; mode?: 'reset' | 'change' };
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
      <Tab.Screen name="Menu" component={MenuScreen} />
      <Tab.Screen name="QR" component={QrPlaceholderScreen} />
      <Tab.Screen name="Rewards" component={RewardsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, loading, member } = useMember();

  // Jika sedang mengecek sesi ke server Firebase, tahan dengan loading
  if (loading) {
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
      {isAuthenticated ? (
        // Check Profile Completion
        !member?.profileComplete ? (
             // SATPAM: Stop right here! You shall not pass until profile is complete.
             // This prevents MainApp (and HomeScreen) from mounting and triggering the "force exit" crash
             <Stack.Screen name="ProfileCompletion" component={ProfileCompletionScreen} />
        ) : (
          // Authenticated AND Profile Complete -> Welcome home
          <>
            <Stack.Screen name="MainApp" component={MainTabNavigator} />
            <Stack.Screen name="StoreLocator" component={StoreLocatorScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="UpdatePassword" component={UpdatePasswordScreen} options={{ animation: 'slide_from_right' }} />
            {/* Keeping ProfileCompletion accessible in case we need to revisit, though logically we shouldn't */}
            <Stack.Screen name="ProfileCompletion" component={ProfileCompletionScreen} /> 
          </>
        )
      ) : (
        // Kalau belum login, hanya bisa akses area luar
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="UpdatePassword" component={UpdatePasswordScreen} options={{ animation: 'slide_from_bottom' }} />
        </>
      )}
    </Stack.Navigator>
  );
}