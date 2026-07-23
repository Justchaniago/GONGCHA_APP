import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, ListRenderItem, RefreshControl
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MapPin, Navigation, Clock, ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { StoreStatusKind } from '../application/stores/GetStoreStatus';
import type { Store } from '../application/stores/Store';
import { useStores } from '../composition/stores';
import ScreenFadeTransition from '../components/ScreenFadeTransition';
import DecorativeBackground from '../components/DecorativeBackground';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMember } from '../context/MemberContext';
import { openStoreMaps } from '../presentation/stores/openStoreMaps';

type StoreStatus = {
  label: string;
  color: string;
  bg: string;
};

const STORE_STATUS: Record<StoreStatusKind, StoreStatus> = {
  open: { label: 'Open', color: '#166534', bg: '#DCFCE7' },
  'closing-soon': {
    label: 'Closing Soon',
    color: '#9A3412',
    bg: '#FFEDD5',
  },
  closed: { label: 'Closed', color: '#6B7280', bg: '#E5E7EB' },
};

export default function StoreLocatorScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, loading: memberLoading } = useMember();
  const {
    stores,
    loading,
    isRefreshing,
    permissionStatus,
    refresh,
    requestLocation,
    statusFor,
  } = useStores(!memberLoading && isAuthenticated);

  const renderStoreItem: ListRenderItem<Store> = ({ item, index }) => {
    const status = STORE_STATUS[statusFor(item)];

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => openStoreMaps(item.latitude, item.longitude, item.name, item.address)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconBg}><MapPin size={24} color="#B91C2F" /></View>
          <View style={styles.storeMeta}>
            <Text style={styles.storeName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.storeAddress} numberOfLines={2}>{item.address}</Text>
          </View>
          <View style={styles.badgeColumn}>
            {item.distance !== undefined && (
              <View style={[styles.distanceBadge, index === 0 && styles.nearestBadge]}>
                <Text style={[styles.distanceText, index === 0 && styles.nearestText]}>{item.distance} km</Text>
              </View>
            )}
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View style={styles.infoRow}>
            <Clock size={16} color="#8C7B75" />
            <Text style={styles.infoText}>{item.openHours}</Text>
          </View>
          <TouchableOpacity style={styles.navButton} onPress={() => openStoreMaps(item.latitude, item.longitude, item.name, item.address)}>
            <Navigation size={16} color="#FFF" />
            <Text style={styles.navButtonText}>Go There</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenFadeTransition>
      <View style={styles.container}>
        <StatusBar style="dark" />
        <DecorativeBackground />
        
        <View style={[styles.mainContent, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <ChevronLeft size={24} color="#2A1F1F" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Find a Store</Text>
          </View>

          {permissionStatus !== 'granted' && !loading && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>Enable location for nearest store.</Text>
              <TouchableOpacity onPress={requestLocation}><Text style={styles.warningAction}>Allow Access</Text></TouchableOpacity>
            </View>
          )}

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#B91C2F" />
              <Text style={styles.loadingText}>Locating Gong Cha...</Text>
            </View>
          ) : (
            <FlatList
              data={stores}
              keyExtractor={(item) => item.id}
              renderItem={renderStoreItem}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={isRefreshing} onRefresh={refresh} colors={['#B91C2F']} tintColor={'#B91C2F'} />
              }
              ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>No stores found nearby.</Text></View>}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </ScreenFadeTransition>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  mainContent: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, marginBottom: 8 },
  backButton: { marginRight: 12, width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#2A1F1F' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 },
  loadingText: { marginTop: 12, color: '#8C7B75', fontSize: 14 },
  emptyText: { color: '#9CA3AF', fontSize: 16 },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  card: { backgroundColor: '#FFF', borderRadius: 20, marginBottom: 16, padding: 16, shadowColor: '#9CA3AF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4, borderWidth: 1, borderColor: '#F3F4F6' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconBg: { width: 48, height: 48, backgroundColor: '#FFF1F2', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  storeMeta: { flex: 1, justifyContent: 'center' },
  storeName: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4, lineHeight: 22 },
  storeAddress: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  badgeColumn: { alignItems: 'flex-end', gap: 6 },
  distanceBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  distanceText: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
  nearestBadge: { backgroundColor: '#B91C2F' },
  nearestText: { color: '#FFF' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 14 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 13, color: '#4B5563', fontWeight: '500' },
  navButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, gap: 8 },
  navButtonText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  warningBox: { marginHorizontal: 20, marginBottom: 16, padding: 12, backgroundColor: '#FEF2F2', borderRadius: 12, borderWidth: 1, borderColor: '#FCA5A5', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  warningText: { color: '#991B1B', fontSize: 13, flex: 1 },
  warningAction: { color: '#B91C2F', fontWeight: '700', fontSize: 13, marginLeft: 8 },
});
