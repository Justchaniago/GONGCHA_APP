import React, { useState } from 'react';
import { Alert } from 'react-native';
import { Bell } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import PermissionPrimerScreen from '../components/PermissionPrimerScreen';
import { markGuestOnboardingCompleted } from '../utils/guestOnboarding';

type RootStackParamList = {
  NotificationPermission: undefined;
  Welcome: undefined;
};

export default function NotificationPermissionScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const finishOnboarding = async () => {
    await markGuestOnboardingCompleted();
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  };

  const handleAllowNotifications = async () => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      const current = await Notifications.getPermissionsAsync();
      if (current.status !== 'granted') {
        const result = await Notifications.requestPermissionsAsync();
        if (result.status !== 'granted') {
          Alert.alert(
            t('notificationPermission.skippedTitle'),
            t('notificationPermission.skippedMessage'),
          );
        }
      }
    } catch (error: any) {
      Alert.alert(
        t('notificationPermission.unavailableTitle'),
        String(error?.message || t('common.tryAgain')),
      );
    } finally {
      setIsSubmitting(false);
      await finishOnboarding();
    }
  };

  return (
    <PermissionPrimerScreen
      icon={<Bell size={36} color="#B91C2F" strokeWidth={2.2} />}
      title={t('notificationPermission.title')}
      description={t('notificationPermission.description')}
      bullets={t('notificationPermission.bullets', { returnObjects: true }) as string[]}
      primaryLabel={isSubmitting ? t('common.checkingAccess') : t('notificationPermission.primaryLabel')}
      secondaryLabel={t('notificationPermission.secondaryLabel')}
      onPrimary={handleAllowNotifications}
      onSecondary={finishOnboarding}
    />
  );
}
