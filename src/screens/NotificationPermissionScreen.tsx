import React, { useState } from 'react';
import { Alert } from 'react-native';
import { Bell } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import PermissionPrimerScreen from '../components/PermissionPrimerScreen';
import { markGuestOnboardingCompleted } from '../utils/guestOnboarding';

type RootStackParamList = {
  NotificationPermission: undefined;
  Welcome: undefined;
};

export default function NotificationPermissionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const finishOnboarding = async () => {
    await markGuestOnboardingCompleted();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Welcome' }],
    });
  };

  const handleAllowNotifications = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const currentPermission = await Notifications.getPermissionsAsync();
      if (currentPermission.status !== 'granted') {
        const requestResult = await Notifications.requestPermissionsAsync();
        if (requestResult.status !== 'granted') {
          Alert.alert(
            'Notifications skipped',
            'You can enable notifications later if you want promo updates and order reminders.',
          );
        }
      }
    } catch (error: any) {
      Alert.alert('Notifications unavailable', String(error?.message || 'Please try again later.'));
    } finally {
      setIsSubmitting(false);
      await finishOnboarding();
    }
  };

  return (
    <PermissionPrimerScreen
      icon={<Bell size={36} color="#B91C2F" strokeWidth={2.2} />}
      title="Stay in the loop"
      description="Enable notifications for promo drops, reward reminders, and updates that actually matter while your membership grows."
      bullets={[
        'Get notified when limited offers and vouchers are live.',
        'Receive timely reminders for points, rewards, and account activity.',
        'Keep updates lightweight so the app stays useful, not noisy.',
      ]}
      primaryLabel={isSubmitting ? 'Checking access...' : 'Enable Notifications'}
      secondaryLabel="Maybe Later"
      onPrimary={handleAllowNotifications}
      onSecondary={finishOnboarding}
    />
  );
}
