import React, { useState, useEffect, useRef } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';

import { useStores } from '../composition/stores';
import ScreenFadeTransition from '../components/ScreenFadeTransition';
import type { LocalStackParamList } from '../navigation/LocalAppNavigator';
import { buildStoresViewModel, visibleOrderedStores, type StoreDisplayItem } from '../application/stores/GetStores';
import type { Store } from '../application/stores/Store';
import StoreLocatorView from '../presentation/stores/StoreLocatorView';

export default function LocalStoreLocatorScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<LocalStackParamList>>();
  const route = useRoute<any>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState<StoreDisplayItem | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);

  const autoSelectNearest = route.params?.autoSelectNearest;
  const autoSelectTriggered = useRef(false);

  const { stores, loading: storesLoading } = useStores(true);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        }
      } catch (e) {
        console.log('Error fetching location on LocalStoreLocatorScreen:', e);
      } finally {
        setLocationLoading(false);
      }
    })();
  }, []);

  const orderedStores = visibleOrderedStores(stores, userLocation);
  const mappedStores = buildStoresViewModel(orderedStores, userLocation);
  const loading = locationLoading || storesLoading;

  useEffect(() => {
    if (autoSelectNearest && !loading && mappedStores.length > 0 && !autoSelectTriggered.current) {
      autoSelectTriggered.current = true;
      setSelectedStore(mappedStores[0]);
    }
  }, [autoSelectNearest, loading, mappedStores]);

  return (
    <ScreenFadeTransition>
      <StoreLocatorView
        stores={mappedStores}
        loading={loading}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedStore={selectedStore}
        onSelectStore={setSelectedStore}
        onBack={() => navigation.goBack()}
      />
    </ScreenFadeTransition>
  );
}
