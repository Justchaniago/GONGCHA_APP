import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, FlatList, Image, TouchableOpacity, StyleSheet, Modal, Animated, TouchableWithoutFeedback, useWindowDimensions } from 'react-native';
import { Heart, X } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// 🔥 IMPORT FIREBASE (Ganti baris ini)
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { firestoreDb as db } from '../config/firebase';

import DecorativeBackground from '../components/DecorativeBackground';
import ScreenFadeTransition from '../components/ScreenFadeTransition';
import SkeletonLoader from '../components/SkeletonLoader';

// Struktur Data tersinkronisasi dengan Web Panel
interface MenuItem {
  id: string;
  name: string;
  category: string;
  mediumPrice: number;
  availableLarge: boolean;
  availableHot?: boolean;
  description?: string;
  image?: string;
  rating?: number;
  isAvailable?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  Signature: 'Signature',
  MilkTea: 'Milk Tea',
  Coffee: 'Coffee',
  Matcha: 'Matcha',
  Mint: 'Mint',
  BrownSugar: 'Brown Sugar',
  CreativeMix: 'Creative Mix',
  BrewedTea: 'Brewed Tea',
  Topping: 'Topping'
};

const CATEGORIES = ['All', 'Signature', 'MilkTea', 'Coffee', 'Matcha', 'Mint', 'BrownSugar', 'CreativeMix', 'BrewedTea'];

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null);
  
  // State Data Firestore
  const [gongchaMenu, setGongchaMenu] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true); 
  
  const scaleValue = useRef(new Animated.Value(0)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;

  // 🔥 Fetch Real-time Data dari Firestore
  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('name'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMenus: MenuItem[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as MenuItem));
      
      setGongchaMenu(fetchedMenus);
      setIsLoading(false);
    }, (error) => {
      console.error("Gagal mengambil data menu:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter Menu (Hanya tampilkan yang isAvailable !== false)
  const availableMenu = gongchaMenu.filter(item => item.isAvailable !== false);
  const filteredMenu = selectedCategory === 'All' 
    ? availableMenu
    : availableMenu.filter(item => item.category === selectedCategory);
    
  const isCompact = width < 360;
  const horizontalPadding = isCompact ? 16 : 20;

  const toggleFavorite = (id: string) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(fav => fav !== id) : [...prev, id]
    );
  };

  const formatPrice = (price: number) => {
    // Karena di Web Panel harga asli sudah 29000 (bukan 29), tidak perlu dikali 1000 lagi
    return `Rp ${price.toLocaleString('id-ID')}`;
  };

  const onOpenModal = (item: MenuItem) => {
    setSelectedProduct(item);
    Animated.parallel([
      Animated.spring(scaleValue, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacityValue, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const onCloseModal = () => {
    Animated.parallel([
      Animated.spring(scaleValue, {
        toValue: 0,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(opacityValue, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setSelectedProduct(null);
    });
  };

  const renderCategoryPill = (category: string) => {
    const isActive = selectedCategory === category;
    const displayLabel = CATEGORY_LABELS[category] || category;
    return (
      <TouchableOpacity
        key={category}
        style={[styles.categoryPill, isActive && styles.categoryPillActive]}
        onPress={() => setSelectedCategory(category)}
      >
        <Text 
          style={[styles.categoryText, isActive && styles.categoryTextActive]}
          numberOfLines={1}
        >
          {displayLabel}
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
        <View style={styles.priceContainer}>
           <SkeletonLoader width="50%" height={16} />
        </View>
        <View style={[styles.pillRow, { gap: 6 }]}>
           <SkeletonLoader width={45} height={20} borderRadius={10} />
           <SkeletonLoader width={45} height={20} borderRadius={10} />
        </View>
        <SkeletonLoader width="60%" height={10} style={{ marginTop: 8 }} />
      </View>
    </View>
  );

  const renderProductCard = ({ item }: { item: MenuItem }) => {
    const isFavorite = favorites.includes(item.id);
    const largeNote = item.availableLarge ? `Upsize + ${formatPrice(2000)}` : '';
    
    return (
      <TouchableOpacity 
        style={styles.productCard}
        activeOpacity={0.7}
        onPress={() => onOpenModal(item)}
      >
        <View style={styles.imageContainer}>
          {/* 🔥 Render Image WebP dari Firebase jika ada, jika kosong tampilkan Emoji */}
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.productImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>🥤</Text>
            </View>
          )}

          <TouchableOpacity 
            style={styles.favoriteButton}
            onPress={() => toggleFavorite(item.id)}
          >
            <Heart 
              size={20} 
              color={isFavorite ? '#B91C2F' : 'white'} 
              fill={isFavorite ? '#B91C2F' : 'none'}
            />
          </TouchableOpacity>
        </View>
        
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.priceContainer}>
            <Text style={styles.productPrice}>{formatPrice(item.mediumPrice)}</Text>
          </View>
          <View style={styles.pillRow}>
            <View style={[styles.pill, styles.icePill]}>
              <Text style={styles.pillText}>🧊 ICE</Text>
            </View>
            {item.availableHot && (
              <View style={[styles.pill, styles.hotPill]}>
                <Text style={styles.pillText}>🔥 HOT</Text>
              </View>
            )}
          </View>
          {largeNote && <Text style={styles.upsizeCaption}>↑ {largeNote}</Text>}
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
            <Text style={styles.headerTitle}>Menu</Text>
            <Text style={styles.headerSubtitle}>Discover our signature drinks</Text>
          </View>

          {/* Category Filter */}
          <View style={styles.categoryContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.categoryScrollContent, { paddingHorizontal: horizontalPadding }]}
            >
              {CATEGORIES.map(renderCategoryPill)}
            </ScrollView>
          </View>

          {/* Product Grid */}
          {isLoading ? (
            <FlatList
              data={[1, 2, 3, 4, 5, 6]}
              renderItem={renderProductSkeleton}
              keyExtractor={(item) => String(item)}
              numColumns={2}
              contentContainerStyle={[styles.productGrid, { paddingHorizontal: horizontalPadding, paddingBottom: 100 + insets.bottom }]}
              columnWrapperStyle={styles.columnWrapper}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <FlatList
              data={filteredMenu}
              renderItem={renderProductCard}
              keyExtractor={(item) => item.id}
              numColumns={2}
              contentContainerStyle={[styles.productGrid, { paddingHorizontal: horizontalPadding, paddingBottom: 100 + insets.bottom }]}
              columnWrapperStyle={styles.columnWrapper}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Text style={{ color: '#8C7B75', fontSize: 14 }}>Menu tidak ditemukan.</Text>
                </View>
              }
            />
          )}

          {/* Product Detail Modal */}
          <Modal
            transparent
            visible={!!selectedProduct}
            animationType="none"
            presentationStyle="overFullScreen"
            statusBarTranslucent
            onRequestClose={onCloseModal}
          >
            <TouchableWithoutFeedback onPress={onCloseModal}>
              <Animated.View style={[styles.modalOverlay, { opacity: opacityValue }]}>
                <BlurView intensity={20} style={StyleSheet.absoluteFillObject}>
                  <View style={styles.modalOverlayContent}>
                    <TouchableWithoutFeedback>
                      <Animated.View 
                        style={[
                          styles.modalContent,
                          { transform: [{ scale: scaleValue }] }
                        ]}
                      >
                        {selectedProduct && (
                          <>
                            {/* Close Button */}
                            <TouchableOpacity 
                              style={styles.closeButton}
                              onPress={onCloseModal}
                            >
                              <X size={24} color="#2A1F1F" />
                            </TouchableOpacity>

                            {/* Modal Image */}
                            {selectedProduct.image ? (
                              <Image source={{ uri: selectedProduct.image }} style={styles.modalImageActual} />
                            ) : (
                              <View style={styles.modalImage}>
                                <Text style={styles.modalEmoji}>🥤</Text>
                              </View>
                            )}

                            {/* Product Details */}
                            <View style={styles.modalDetails}>
                              <Text style={styles.modalTitle}>{selectedProduct.name}</Text>
                              <View style={styles.modalPriceRow}>
                                <Text style={styles.modalPrice}>{formatPrice(selectedProduct.mediumPrice)}</Text>
                                {selectedProduct.availableLarge && (
                                  <Text style={styles.modalLargeNote}> Upsize + {formatPrice(2000)}</Text>
                                )}
                              </View>
                              <View style={styles.modalPillRow}>
                                <View style={[styles.pill, styles.icePill]}>
                                  <Text style={styles.pillText}>🧊 ICE</Text>
                                </View>
                                {selectedProduct.availableHot && (
                                  <View style={[styles.pill, styles.hotPill]}>
                                    <Text style={styles.pillText}>🔥 HOT</Text>
                                  </View>
                                )}
                              </View>

                              <Text style={styles.modalCategory}>{CATEGORY_LABELS[selectedProduct.category] || selectedProduct.category}</Text>

                              <Text style={styles.modalDescription}>
                                {selectedProduct.description || "Enjoy our signature drink made with premium ingredients. Perfectly crafted to satisfy your cravings with authentic flavors and quality ingredients."}
                              </Text>
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
  root: {
    flex: 1,
    backgroundColor: '#FFF8F0',
    position: 'relative',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2A1F1F',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8C7B75',
    marginTop: 4,
  },
  categoryContainer: {
    paddingVertical: 12,
    marginBottom: 8,
  },
  categoryScrollContent: {
    paddingHorizontal: 20,
  },
  categoryPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    height: 42,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#B91C2F',
    backgroundColor: 'transparent',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryPillActive: {
    backgroundColor: '#B91C2F',
    borderColor: '#B91C2F',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B91C2F',
    lineHeight: 20,
    textDecorationLine: 'none',
  },
  categoryTextActive: {
    color: '#FFFFFF',
    lineHeight: 20,
    textDecorationLine: 'none',
  },
  productGrid: {
    paddingHorizontal: 20,
    paddingBottom: 84,
    paddingTop: 8,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  productCard: {
    width: '48%',
    backgroundColor: '#FFFDFB',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#2A1F1F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: '#F5F1ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
productImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    resizeMode: 'contain', // <--- UBAH DARI 'cover' MENJADI 'contain'
    backgroundColor: '#F5F1ED', // Opsional: Beri background agar sisa ruang terlihat rapi
  },
  placeholderText: {
    fontSize: 48,
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(42, 31, 31, 0.6)',
    padding: 8,
    borderRadius: 20,
  },
  productInfo: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2A1F1F',
    marginBottom: 10,
    lineHeight: 20,
    minHeight: 40,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#B91C2F',
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginRight: 8,
  },
  icePill: {
    backgroundColor: '#D9F1FF',
  },
  hotPill: {
    backgroundColor: '#FFE3DD',
  },
  upsizeCaption: {
    marginTop: 6,
    fontSize: 11,
    color: '#6F5E57',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  pillText: {
    fontSize: 11,
    color: '#2A1F1F',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  // Modal Styles
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  modalOverlayContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(42, 31, 31, 0.4)',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 0,
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
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 8,
    borderRadius: 20,
  },
  modalImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#F5F1ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
 modalImageActual: {
    width: '100%',
    height: 200,
    resizeMode: 'contain', // <--- UBAH JUGA DI SINI MENJADI 'contain'
    backgroundColor: '#F5F1ED', // Opsional: Beri background senada
  },
  modalEmoji: {
    fontSize: 80,
  },
  modalDetails: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2A1F1F',
    marginBottom: 12,
  },
  modalPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  modalPrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#B91C2F',
  },
  modalLargeNote: {
    fontSize: 13,
    color: '#6F5E57',
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: 0.2,
  },
  modalPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalCategory: {
    fontSize: 14,
    color: '#8C7B75',
    backgroundColor: '#FFF8F0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  modalDescription: {
    fontSize: 14,
    color: '#8C7B75',
    lineHeight: 22,
  },
});