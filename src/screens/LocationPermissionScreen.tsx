import React, { useState } from 'react';
import { Alert } from 'react-native';
import { MapPin } from 'lucide-react-native';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import PermissionPrimerScreen from '../components/PermissionPrimerScreen';

type RootStackParamList = {
  LocationPermission: undefined;
  NotificationPermission: undefined;
};

export default function LocationPermissionScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const goNext = () => navigation.replace('NotificationPermission');

  const handleAllowLocation = async () => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      const current = await Location.getForegroundPermissionsAsync();
      if (current.status !== 'granted') {
        const result = await Location.requestForegroundPermissionsAsync();
        if (result.status !== 'granted') {
          Alert.alert(
            t('locationPermission.skippedTitle'),
            t('locationPermission.skippedMessage'),
          );
        }
      }
    } catch (error: any) {
      Alert.alert(
        t('locationPermission.unavailableTitle'),
        String(error?.message || t('common.tryAgain')),
      );
    } finally {
      setIsSubmitting(false);
      goNext();
    }
  };

  return (
    <PermissionPrimerScreen
      icon={<MapPin size={36} color="#B91C2F" strokeWidth={2.2} />}
      title={t('locationPermission.title')}
      description={t('locationPermission.description')}
      bullets={t('locationPermission.bullets', { returnObjects: true }) as string[]}
      primaryLabel={isSubmitting ? t('common.checkingAccess') : t('locationPermission.primaryLabel')}
      secondaryLabel={t('locationPermission.secondaryLabel')}
      onPrimary={handleAllowLocation}
      onSecondary={goNext}
    />
  );
}
