import React, { useState } from 'react';
import { Alert } from 'react-native';
import { MapPin } from 'lucide-react-native';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import PermissionPrimerScreen from '../components/PermissionPrimerScreen';

type RootStackParamList = {
  LocationPermission: undefined;
  NotificationPermission: undefined;
};

export default function LocationPermissionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const goNext = () => navigation.replace('NotificationPermission');

  const handleAllowLocation = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const currentPermission = await Location.getForegroundPermissionsAsync();
      if (currentPermission.status !== 'granted') {
        const requestResult = await Location.requestForegroundPermissionsAsync();
        if (requestResult.status !== 'granted') {
          Alert.alert(
            'Location access skipped',
            'You can still browse the app and enable location later from Settings.',
          );
        }
      }
    } catch (error: any) {
      Alert.alert('Location unavailable', String(error?.message || 'Please try again later.'));
    } finally {
      setIsSubmitting(false);
      goNext();
    }
  };

  return (
    <PermissionPrimerScreen
      icon={<MapPin size={36} color="#B91C2F" strokeWidth={2.2} />}
      title="Find Gong Cha near you"
      description="Turn on location to surface the closest stores, smoother pickup flows, and more relevant local offers."
      bullets={[
        'See nearby stores first instead of browsing the full list.',
        'Make pickup and visit planning faster when you are on the go.',
        'Keep the experience relevant without forcing location every time.',
      ]}
      primaryLabel={isSubmitting ? 'Checking access...' : 'Allow Location Access'}
      secondaryLabel="Not Now"
      onPrimary={handleAllowLocation}
      onSecondary={goNext}
    />
  );
}
