import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  TouchableWithoutFeedback,
  useWindowDimensions,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Heart, X, Search, ArrowLeft } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DecorativeBackground from '../../components/DecorativeBackground';
import ScreenFadeTransition from '../../components/ScreenFadeTransition';
import SkeletonLoader from '../../components/SkeletonLoader';
import type { MenuCategoryDisplay, MenuItemDisplay } from '../../application/menu/GetMenu';

export interface MenuViewProps {
  categories: MenuCategoryDisplay[];
  items: MenuItemDisplay[];
  selectedCategory: string;
  onSelectCategory: (catId: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedItem: MenuItemDisplay | null;
  onSelectItem: (item: MenuItemDisplay | null) => void;
  loading: boolean;
  onBack?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export default function MenuView({
  categories,
  items,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  selectedItem,
  onSelectItem,
  loading,
  onBack,
  refreshing,
  onRefresh,
}: MenuViewProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [favorites, setFavorites] = useState<string[]>([]);

  const scaleValue = useRef(new Animated.Value(0)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (selectedItem) {
      Animated.parallel([
        Animated.spring(scaleValue, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
        Animated.timing(opacityValue, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [selectedItem]);

  const handleCloseModal = () => {
    Animated.parallel([
      Animated.spring(scaleValue, { toValue: 0, friction: 8, tension: 80, useNativeDriver: true }),
      Animated.timing(opacityValue, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => onSelectItem(null));
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((fav) => fav !== id) : [...prev, id]
    );
  };

  const isCompact = width < 360;
  const horizontalPadding = isCompact ? 16 : 20;

  const renderCategoryPill = (category: MenuCategoryDisplay) => {
    const isActive = selectedCategory === category.id;
    return (
      <TouchableOpacity
        key={category.id}
        style={[styles.categoryPill, isActive && styles.categoryPillActive]}
        onPress={() => onSelectCategory(category.id)}
      >
        <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
          {category.name} ({category.count})
        </Text>
      </TouchableOpacity>
    );
  };

  const renderProductSkeleton = () => (
    <View style={styles.productCard}>
      <View style={styles.imageContainer}>
        <SkeletonLoader width="100%" height="100%" borderRadius={0} />
      </View>
      <View style={styles.productInfo}>
        <SkeletonLoader width="90%" height={16} style={{ marginBottom: 10 }} />
        <SkeletonLoader width="50%" height={16} style={{ marginBottom: 10 }} />
        <View style={[styles.pillRow, { gap: 6 }]} >
          <SkeletonLoader width={45} height={20} borderRadius={10} />
          <SkeletonLoader width={45} height={20} borderRadius={10} />
        </View>
      </View>
    </View>
  );

  const renderProductCard = ({ item }: { item: MenuItemDisplay }) => {
    const isFavorite = favorites.includes(item.id);

    return (
      <TouchableOpacity
        style={styles.productCard}
        activeOpacity={0.7}
        onPress={() => onSelectItem(item)}
      >
        <View style={styles.imageContainer}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.productImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>🥤</Text>
            </View>
          )}

          {/* Badges */}
          <View style={styles.badgeContainer}>
            {item.isPopular && (
              <View style={[styles.badge, styles.popularBadge]}>
                <Text style={styles.badgeText}>POPULER</Text>
              </View>
            )}
            {item.isNew && (
              <View style={[styles.badge, styles.newBadge]}>
                <Text style={styles.badgeText}>BARU</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={() => toggleFavorite(item.id)}
          >
            <Heart
              size={18}
              color={isFavorite ? '#B91C2F' : 'white'}
              fill={isFavorite ? '#B91C2F' : 'none'}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.productPrice}>{item.formattedPrice}</Text>
          <View style={styles.pillRow}>
            {item.tags.map((tag, idx) => (
              <View
                key={idx}
                style={[
                  styles.pill,
                  tag === 'HOT' ? styles.hotPill : styles.icePill,
                ]}
              >
                <Text style={styles.pillText}>
                  {tag === 'HOT' ? '🔥 HOT' : tag === 'ICE' ? '🧊 ICE' : tag}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenFadeTransition>
      <View style={styles.root}>
        <StatusBar style="dark" translucent backgroundColor="transparent" />
        <DecorativeBackground />

        <View style={[styles.container, { paddingTop: insets.top + 4 }]}>
          {/* Header */}
          <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
            <View style={styles.headerTitleRow}>
              {onBack && (
                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                  <ArrowLeft size={24} color="#2A1F1F" />
                </TouchableOpacity>
              )}
              <Text style={styles.headerTitle}>Menu & Katalog</Text>
            </View>
            <Text style={styles.headerSubtitle}>Nikmati kesegaran Gong Cha terbaik</Text>
          </View>

          {/* Search Bar */}
          <View style={[styles.searchContainer, { paddingHorizontal: horizontalPadding }]}>
            <View style={styles.searchBar}>
              <Search size={20} color="#8C7B75" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Cari minuman favoritmu..."
                placeholderTextColor="#8C7B75"
                value={searchQuery}
                onChangeText={onSearchChange}
                clearButtonMode="while-editing"
              />
            </View>
          </View>

          {/* Categories Tab */}
          <View style={styles.categoryContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.categoryScrollContent,
                { paddingHorizontal: horizontalPadding },
              ]}
            >
              {categories.map(renderCategoryPill)}
            </ScrollView>
          </View>

          {/* Products List */}
          {loading ? (
            <FlatList
              data={[1, 2, 3, 4, 5, 6]}
              renderItem={renderProductSkeleton}
              keyExtractor={(item) => String(item)}
              numColumns={2}
              contentContainerStyle={[
                styles.productGrid,
                {
                  paddingHorizontal: horizontalPadding,
                  paddingBottom: 100 + insets.bottom,
                },
              ]}
              columnWrapperStyle={styles.columnWrapper}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <FlatList
              data={items}
              renderItem={renderProductCard}
              keyExtractor={(item) => item.id}
              numColumns={2}
              contentContainerStyle={[
                styles.productGrid,
                {
                  paddingHorizontal: horizontalPadding,
                  paddingBottom: 100 + insets.bottom,
                },
              ]}
              columnWrapperStyle={styles.columnWrapper}
              showsVerticalScrollIndicator={false}
              refreshControl={
                onRefresh ? (
                  <RefreshControl
                    refreshing={!!refreshing}
                    onRefresh={onRefresh}
                    colors={['#B91C2F']}
                    tintColor="#B91C2F"
                  />
                ) : undefined
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Menu tidak ditemukan.</Text>
                </View>
              }
            />
          )}

          {/* Product Detail Modal */}
          <Modal
            transparent
            visible={!!selectedItem}
            animationType="none"
            presentationStyle="overFullScreen"
            statusBarTranslucent
            onRequestClose={handleCloseModal}
          >
            <TouchableWithoutFeedback onPress={handleCloseModal}>
              <Animated.View style={[styles.modalOverlay, { opacity: opacityValue }]}>
                <BlurView intensity={20} style={StyleSheet.absoluteFillObject}>
                  <View style={styles.modalOverlayContent}>
                    <TouchableWithoutFeedback>
                      <Animated.View
                        style={[
                          styles.modalContent,
                          { transform: [{ scale: scaleValue }] },
                        ]}
                      >
                        {selectedItem && (
                          <>
                            <TouchableOpacity
                              style={styles.closeButton}
                              onPress={handleCloseModal}
                            >
                              <X size={24} color="#2A1F1F" />
                            </TouchableOpacity>
                            {selectedItem.imageUrl ? (
                              <Image
                                source={{ uri: selectedItem.imageUrl }}
                                style={styles.modalImageActual}
                              />
                            ) : (
                              <View style={styles.modalImage}>
                                <Text style={styles.modalEmoji}>🥤</Text>
                              </View>
                            )}
                            <View style={styles.modalDetails}>
                              <Text style={styles.modalTitle}>{selectedItem.name}</Text>
                              <View style={styles.modalPriceRow}>
                                <Text style={styles.modalPrice}>
                                  {selectedItem.formattedPrice}
                                </Text>
                              </View>
                              <View style={styles.modalPillRow}>
                                {selectedItem.tags.map((tag, idx) => (
                                  <View
                                    key={idx}
                                    style={[
                                      styles.pill,
                                      tag === 'HOT' ? styles.hotPill : styles.icePill,
                                    ]}
                                  >
                                    <Text style={styles.pillText}>
                                      {tag === 'HOT'
                                        ? '🔥 HOT'
                                        : tag === 'ICE'
                                        ? '🧊 ICE'
                                        : tag}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                              <Text style={styles.modalCategory}>
                                {selectedItem.category}
                              </Text>
                              <Text style={styles.modalDescription}>
                                {selectedItem.description}
                              </Text>

                              <TouchableOpacity
                                style={styles.orderButton}
                                activeOpacity={0.8}
                                onPress={handleCloseModal}
                              >
                                <Text style={styles.orderButtonText}>Tutup</Text>
                              </TouchableOpacity>
                            </View>
                          </>
                        )}
                      </Animated.View>
                    </TouchableWithoutFeedback>
                  </View>
                </BlurView>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Modal>
        </View>
      </View>
    </ScreenFadeTransition>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF8F0', position: 'relative' },
  container: { flex: 1, backgroundColor: 'transparent', zIndex: 1 },
  header: { paddingTop: 12, paddingBottom: 8 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  backButton: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#2A1F1F' },
  headerSubtitle: { fontSize: 14, color: '#8C7B75', marginTop: 4 },
  searchContainer: { marginVertical: 10 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDFB',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1.5,
    borderColor: '#EAE3DD',
    shadowColor: '#2A1F1F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: { marginRight: 10 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#2A1F1F',
    fontWeight: '500',
    padding: 0,
  },
  categoryContainer: { paddingVertical: 10, marginBottom: 4 },
  categoryScrollContent: { gap: 8 },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#B91C2F',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryPillActive: { backgroundColor: '#B91C2F', borderColor: '#B91C2F' },
  categoryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B91C2F',
  },
  categoryTextActive: { color: '#FFFFFF' },
  productGrid: { paddingTop: 4 },
  columnWrapper: { justifyContent: 'space-between', marginBottom: 16 },
  productCard: {
    width: '48%',
    backgroundColor: '#FFFDFB',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#2A1F1F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  imageContainer: { position: 'relative', width: '100%', aspectRatio: 1 },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F1ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
    backgroundColor: '#F5F1ED',
  },
  placeholderText: { fontSize: 44 },
  badgeContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'column',
    gap: 4,
    zIndex: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  popularBadge: { backgroundColor: '#B91C2F' },
  newBadge: { backgroundColor: '#D4AF37' },
  badgeText: { fontSize: 9, fontWeight: '800', color: 'white' },
  favoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(42, 31, 31, 0.55)',
    padding: 8,
    borderRadius: 20,
    zIndex: 2,
  },
  productInfo: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 12 },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2A1F1F',
    marginBottom: 6,
    lineHeight: 18,
    minHeight: 36,
  },
  productPrice: { fontSize: 15, fontWeight: '800', color: '#B91C2F' },
  pillRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  icePill: { backgroundColor: '#E1F3FD' },
  hotPill: { backgroundColor: '#FFEBE7' },
  pillText: { fontSize: 10, color: '#2A1F1F', fontWeight: '700' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#8C7B75', fontSize: 14, fontWeight: '500' },
  modalOverlay: { ...StyleSheet.absoluteFillObject },
  modalOverlayContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(42, 31, 31, 0.45)',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    shadowColor: '#2A1F1F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    padding: 8,
    borderRadius: 20,
  },
  modalImage: {
    width: '100%',
    height: 220,
    backgroundColor: '#F5F1ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImageActual: {
    width: '100%',
    height: 220,
    resizeMode: 'contain',
    backgroundColor: '#F5F1ED',
  },
  modalEmoji: { fontSize: 72 },
  modalDetails: { padding: 22 },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2A1F1F',
    marginBottom: 8,
  },
  modalPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalPrice: { fontSize: 20, fontWeight: '800', color: '#B91C2F' },
  modalPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  modalCategory: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8C7B75',
    backgroundColor: '#FFF8F0',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  modalDescription: {
    fontSize: 13,
    color: '#8C7B75',
    lineHeight: 20,
    fontWeight: '500',
    marginBottom: 20,
  },
  orderButton: {
    backgroundColor: '#B91C2F',
    borderRadius: 14,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  orderButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
});
