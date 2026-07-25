import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useStores } from '../composition/stores';
import ScreenFadeTransition from '../components/ScreenFadeTransition';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useMember } from '../context/MemberContext';
import { buildStoresViewModel, type StoreDisplayItem } from '../application/stores/GetStores';
import StoreLocatorView from '../presentation/stores/StoreLocatorView';

export default function StoreLocatorScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isAuthenticated, loading: memberLoading } = useMember();
  
  const {
    stores,
    loading,
  } = useStores(!memberLoading && isAuthenticated);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState<StoreDisplayItem | null>(null);

  const mappedStores = buildStoresViewModel(stores);

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
