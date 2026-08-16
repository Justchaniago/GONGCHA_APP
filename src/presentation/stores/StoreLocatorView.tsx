import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Modal,
  Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  MapPin,
  Navigation,
  Clock,
  ChevronLeft,
  Search,
  Phone,
  X,
  Info,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StoreDisplayItem } from '../../application/stores/GetStores';
import { openStoreMaps } from './openStoreMaps';

export interface StoreLocatorViewProps {
  stores: StoreDisplayItem[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedStore: StoreDisplayItem | null;
  onSelectStore: (s: StoreDisplayItem | null) => void;
  onBack?: () => void;
}

const FILTER_PILLS = ['Semua', 'Dine-in', 'Takeaway', 'Delivery'];

export default function StoreLocatorView(props: StoreLocatorViewProps) {
  const { t } = useTranslation();
  const { stores, loading, searchQuery, onSearchChange, selectedStore, onSelectStore, onBack } = props;
  const insets = useSafeAreaInsets();
  const [selectedFeature, setSelectedFeature] = useState('Semua');

  // Filter stores locally based on selected feature pill and search query
  const filteredStores = stores.filter((store) => {
    const matchesSearch =
      store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.address.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFeature =
      selectedFeature === 'Semua' ||
      store.features.some(
        (feature) => feature.toLowerCase() === selectedFeature.toLowerCase()
      );

    return matchesSearch && matchesFeature;
  });

  const handleCallStore = (phoneNumber: string) => {
    const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      // Fail silently
    });
  };

  const renderStoreItem = ({ item, index }: { item: StoreDisplayItem; index: number }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => onSelectStore(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconBg}>
            <MapPin size={24} color="#B91C2F" />
          </View>
          <View style={styles.storeMeta}>
            <Text style={styles.storeName} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.storeAddress} numberOfLines={2}>
              {item.address}
            </Text>
          </View>
          <View style={styles.badgeColumn}>
            {item.distanceLabel && (
              <View
                style={[
                  styles.distanceBadge,
                  index === 0 && styles.nearestBadge,
                ]}
              >
                <Text
                  style={[
                    styles.distanceText,
                    index === 0 && styles.nearestText,
                  ]}
                >
                  {item.distanceLabel}
                </Text>
              </View>
            )}
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: item.isOpen ? '#DCFCE7' : '#E5E7EB' },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: item.isOpen ? '#166534' : '#6B7280' },
                ]}
              >
                {item.isOpen ? 'Buka' : 'Tutup'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View style={styles.infoRow}>
            <Clock size={16} color="#8C7B75" />
            <Text style={styles.infoText} numberOfLines={1}>
              {item.operatingHours}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.navButton}
            activeOpacity={0.7}
            onPress={() =>
              openStoreMaps(item.latitude, item.longitude, item.name, item.address)
            }
          >
            <Navigation size={16} color="#FFF" />
            <Text style={styles.navButtonText}>Rute</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={[styles.mainContent, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          {onBack && (
            <TouchableOpacity
              onPress={onBack}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ChevronLeft size={24} color="#2A1F1F" />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>Cari Store</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Search size={20} color="#8C7B75" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari store Gong Cha..."
              placeholderTextColor="#A1887F"
              value={searchQuery}
              onChangeText={onSearchChange}
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => onSearchChange('')}
                style={styles.clearButton}
              >
                <X size={18} color="#8C7B75" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Feature/Category Filter Pills */}
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {FILTER_PILLS.map((pill) => {
              const isSelected = selectedFeature === pill;
              return (
                <TouchableOpacity
                  key={pill}
                  style={[
                    styles.filterPill,
                    isSelected && styles.filterPillSelected,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedFeature(pill)}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      isSelected && styles.filterPillTextSelected,
                    ]}
                  >
                    {pill}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Stores List */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#B91C2F" />
            <Text style={styles.loadingText}>Mencari lokasi Gong Cha...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredStores}
            keyExtractor={(item) => item.id}
            renderItem={renderStoreItem}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + 20 },
            ]}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptyText}>Tidak ada store ditemukan.</Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Store Detail Bottom Sheet Modal */}
      <Modal
        visible={!!selectedStore}
        transparent
        animationType="slide"
        onRequestClose={() => onSelectStore(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalCloseOverlay}
            activeOpacity={1}
            onPress={() => onSelectStore(null)}
          />
          {selectedStore && (
            <View style={[styles.sheetContainer, { paddingBottom: insets.bottom + 24 }]}>
              {/* Drag handle decoration */}
              <View style={styles.dragHandle} />

              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>{selectedStore.name}</Text>
                <TouchableOpacity
                  style={styles.sheetCloseButton}
                  onPress={() => onSelectStore(null)}
                >
                  <X size={20} color="#2A1F1F" />
                </TouchableOpacity>
              </View>

              <Text style={styles.sheetAddress}>{selectedStore.address}</Text>

              {/* Status & Distance section */}
              <View style={styles.sheetBadgeRow}>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: selectedStore.isOpen ? '#DCFCE7' : '#E5E7EB' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: selectedStore.isOpen ? '#166534' : '#6B7280' },
                    ]}
                  >
                    {selectedStore.isOpen ? 'Buka' : 'Tutup'}
                  </Text>
                </View>
                {selectedStore.distanceLabel && (
                  <View style={styles.distanceBadge}>
                    <Text style={styles.distanceText}>
                      {selectedStore.distanceLabel} dari Anda
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.sheetDivider} />

              {/* Information Rows */}
              <View style={styles.sheetInfoSection}>
                <View style={styles.sheetInfoRow}>
                  <Clock size={20} color="#8C7B75" />
                  <View style={styles.sheetInfoTextContainer}>
                    <Text style={styles.sheetInfoLabel}>Jam Operasional</Text>
                    <Text style={styles.sheetInfoVal}>{selectedStore.operatingHours}</Text>
                  </View>
                </View>

                <View style={styles.sheetInfoRow}>
                  <Phone size={20} color="#8C7B75" />
                  <View style={styles.sheetInfoTextContainer}>
                    <Text style={styles.sheetInfoLabel}>Nomor Telepon</Text>
                    <Text style={styles.sheetInfoVal}>{selectedStore.phone}</Text>
                  </View>
                </View>

                <View style={styles.sheetInfoRow}>
                  <Info size={20} color="#8C7B75" />
                  <View style={styles.sheetInfoTextContainer}>
                    <Text style={styles.sheetInfoLabel}>Fasilitas Store</Text>
                    <View style={styles.featuresRow}>
                      {selectedStore.features.map((feat) => (
                        <View key={feat} style={styles.featureTag}>
                          <Text style={styles.featureTagText}>{feat}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              </View>

              {/* Action Buttons Row */}
              <View style={styles.sheetActionRow}>
                <TouchableOpacity
                  style={[styles.sheetBtn, styles.sheetBtnSecondary]}
                  onPress={() => handleCallStore(selectedStore.phone)}
                >
                  <Phone size={18} color="#B91C2F" />
                  <Text style={styles.sheetBtnSecondaryText}>Telepon</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sheetBtn, styles.sheetBtnPrimary]}
                  onPress={() =>
                    openStoreMaps(
                      selectedStore.latitude,
                      selectedStore.longitude,
                      selectedStore.name,
                      selectedStore.address
                    )
                  }
                >
                  <Navigation size={18} color="#FFF" />
                  <Text style={styles.sheetBtnPrimaryText}>Petunjuk Arah</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  mainContent: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 4,
  },
  backButton: {
    marginRight: 12,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#2A1F1F' },
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 52,
    borderWidth: 1,
    borderColor: '#EFE5DD',
    shadowColor: '#8C7B75',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#2A1F1F',
    fontWeight: '500',
  },
  clearButton: { padding: 4 },
  filterSection: {
    marginBottom: 16,
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#EFE5DD',
  },
  filterPillSelected: {
    backgroundColor: '#B91C2F',
    borderColor: '#B91C2F',
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8C7B75',
  },
  filterPillTextSelected: {
    color: '#FFF',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
    paddingHorizontal: 40,
  },
  loadingText: { marginTop: 12, color: '#8C7B75', fontSize: 14, fontWeight: '500' },
  emptyText: { color: '#9CA3AF', fontSize: 16, fontWeight: '500', textAlign: 'center' },
  listContent: { paddingHorizontal: 20, gap: 16 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#8C7B75',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#EFE5DD',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconBg: {
    width: 48,
    height: 48,
    backgroundColor: '#FFF1F2',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeMeta: { flex: 1, justifyContent: 'center' },
  storeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2A1F1F',
    marginBottom: 4,
    lineHeight: 22,
  },
  storeAddress: { fontSize: 13, color: '#8C7B75', lineHeight: 18 },
  badgeColumn: { alignItems: 'flex-end', gap: 6 },
  distanceBadge: {
    backgroundColor: '#F5ECE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  distanceText: { fontSize: 11, fontWeight: '700', color: '#8C7B75' },
  nearestBadge: { backgroundColor: '#B91C2F' },
  nearestText: { color: '#FFF' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#F5ECE5', marginVertical: 12 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 },
  infoText: { fontSize: 13, color: '#8C7B75', fontWeight: '500' },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B91C2F',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  navButtonText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCloseOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#EFE5DD',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2A1F1F',
    flex: 1,
    marginRight: 16,
  },
  sheetCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5ECE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetAddress: {
    fontSize: 14,
    color: '#8C7B75',
    lineHeight: 20,
    marginBottom: 12,
  },
  sheetBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sheetDivider: {
    height: 1,
    backgroundColor: '#F5ECE5',
    marginBottom: 16,
  },
  sheetInfoSection: {
    gap: 16,
    marginBottom: 24,
  },
  sheetInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  sheetInfoTextContainer: {
    flex: 1,
  },
  sheetInfoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A1887F',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  sheetInfoVal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2A1F1F',
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  featureTag: {
    backgroundColor: '#F5ECE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  featureTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C7B75',
  },
  sheetActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sheetBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sheetBtnPrimary: {
    backgroundColor: '#B91C2F',
  },
  sheetBtnPrimaryText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  sheetBtnSecondary: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#B91C2F',
  },
  sheetBtnSecondaryText: {
    color: '#B91C2F',
    fontSize: 14,
    fontWeight: '700',
  },
});
