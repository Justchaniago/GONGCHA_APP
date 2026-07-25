import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import ScreenFadeTransition from '../components/ScreenFadeTransition';
import type { LocalStackParamList } from '../navigation/LocalAppNavigator';
import { buildStoresViewModel, type StoreDisplayItem } from '../application/stores/GetStores';
import type { Store } from '../application/stores/Store';
import StoreLocatorView from '../presentation/stores/StoreLocatorView';

const MOCK_STORES: Store[] = [
  {
    id: 'mock-gi',
    name: 'Gong Cha Grand Indonesia',
    address: 'Grand Indonesia Mall, West Mall, Lower Ground Floor, Jl. M.H. Thamrin No.1, Jakarta Pusat',
    latitude: -6.1951,
    longitude: 106.8202,
    openHours: '10:00 - 22:00',
    isAvailable: true,
    // Add additional mock fields to showcase the presentation features
    phone: '+62 21 2358 0123',
    features: ['Dine-in', 'Takeaway', 'Delivery'],
  } as any,
  {
    id: 'mock-pi',
    name: 'Gong Cha Plaza Indonesia',
    address: 'Plaza Indonesia, Level 4, Jl. M.H. Thamrin No.28-30, Jakarta Pusat',
    latitude: -6.1932,
    longitude: 106.8218,
    openHours: '10:00 - 22:00',
    isAvailable: true,
    phone: '+62 21 2992 4567',
    features: ['Dine-in', 'Takeaway'],
  } as any,
  {
    id: 'mock-cp',
    name: 'Gong Cha Central Park',
    address: 'Central Park Mall, Lower Ground Floor, Jl. Letjen S. Parman No.28, Jakarta Barat',
    latitude: -6.1774,
    longitude: 106.7907,
    openHours: '10:00 - 22:00',
    isAvailable: true,
    phone: '+62 21 5698 5432',
    features: ['Dine-in', 'Takeaway', 'Delivery'],
  } as any,
  {
    id: 'mock-mkg',
    name: 'Gong Cha Mall Kelapa Gading',
    address: 'Mall Kelapa Gading 3, Ground Floor, Jl. Boulevard Raya, Jakarta Utara',
    latitude: -6.1585,
    longitude: 106.9088,
    openHours: '10:00 - 22:00',
    isAvailable: true,
    phone: '+62 21 4585 3789',
    features: ['Takeaway', 'Delivery'],
  } as any,
  {
    id: 'mock-pim',
    name: 'Gong Cha Pondok Indah Mall',
    address: 'Pondok Indah Mall 2, 3rd Floor, Jl. Metro Pondok Indah, Jakarta Selatan',
    latitude: -6.2652,
    longitude: 106.7828,
    openHours: '10:00 - 22:00',
    isAvailable: true,
    phone: '+62 21 7592 1234',
    features: ['Dine-in', 'Takeaway', 'Delivery'],
  } as any,
  {
    id: 'mock-tp6',
    name: 'Gong Cha Tunjungan Plaza 6',
    address: 'Tunjungan Plaza 6, Lantai 5, Jl. Basuki Rahmat No.8-12, Kedungdoro, Kec. Tegalsari, Surabaya, Jawa Timur 60261',
    latitude: -7.2622,
    longitude: 112.7394,
    openHours: '10:00 - 22:00',
    isAvailable: true,
    phone: '+62 31 9924 6789',
    features: ['Dine-in', 'Takeaway', 'Delivery'],
  } as any,
];

export default function LocalStoreLocatorScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<LocalStackParamList>>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState<StoreDisplayItem | null>(null);

  const mappedStores = buildStoresViewModel(MOCK_STORES);

  return (
    <ScreenFadeTransition>
      <StoreLocatorView
        stores={mappedStores}
        loading={false}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedStore={selectedStore}
        onSelectStore={setSelectedStore}
        onBack={() => navigation.goBack()}
      />
    </ScreenFadeTransition>
  );
}
