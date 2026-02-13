import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, FlatList, Image, TouchableOpacity, SafeAreaView, StyleSheet, Modal, Animated, TouchableWithoutFeedback } from 'react-native';
import { Heart, X } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import DecorativeBackground from '../components/DecorativeBackground';
import ScreenFadeTransition from '../components/ScreenFadeTransition';

// Mock Menu Data
const MOCK_MENU = [
  { id: '1', name: 'Pearl Milk Tea', price: 45000, category: 'Milk Tea', rating: 4.8, image: 'https://via.placeholder.com/200/B91C2F/FFFFFF?text=Pearl+Milk+Tea' },
  { id: '2', name: 'Taro Milk Tea', price: 48000, category: 'Milk Tea', rating: 4.7, image: 'https://via.placeholder.com/200/8B7355/FFFFFF?text=Taro+Milk+Tea' },
  { id: '3', name: 'Brown Sugar Pearl', price: 52000, category: 'Milk Tea', rating: 4.9, image: 'https://via.placeholder.com/200/8B4513/FFFFFF?text=Brown+Sugar' },
  { id: '4', name: 'Passion Fruit Tea', price: 42000, category: 'Fruit Tea', rating: 4.6, image: 'https://via.placeholder.com/200/FFA500/FFFFFF?text=Passion+Fruit' },
  { id: '5', name: 'Lychee Fruit Tea', price: 44000, category: 'Fruit Tea', rating: 4.7, image: 'https://via.placeholder.com/200/FFB6C1/FFFFFF?text=Lychee+Tea' },
  { id: '6', name: 'Green Apple Tea', price: 43000, category: 'Fruit Tea', rating: 4.5, image: 'https://via.placeholder.com/200/90EE90/FFFFFF?text=Green+Apple' },
  { id: '7', name: 'Mango Smoothie', price: 50000, category: 'Smoothie', rating: 4.8, image: 'https://via.placeholder.com/200/FFD700/FFFFFF?text=Mango+Smoothie' },
  { id: '8', name: 'Strawberry Smoothie', price: 50000, category: 'Smoothie', rating: 4.9, image: 'https://via.placeholder.com/200/FF69B4/FFFFFF?text=Strawberry' },
];

const CATEGORIES = ['All', 'Milk Tea', 'Fruit Tea', 'Smoothie'];

export default function MenuScreen() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<typeof MOCK_MENU[0] | null>(null);
  const scaleValue = useRef(new Animated.Value(0)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;

  const filteredMenu = selectedCategory === 'All' 
    ? MOCK_MENU 
    : MOCK_MENU.filter(item => item.category === selectedCategory);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(fav => fav !== id) : [...prev, id]
    );
  };

  const formatPrice = (price: number) => {
    return `Rp ${price.toLocaleString('id-ID')}`;
  };

  const onOpenModal = (item: typeof MOCK_MENU[0]) => {
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
          {category}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderProductCard = ({ item }: { item: typeof MOCK_MENU[0] }) => {
    const isFavorite = favorites.includes(item.id);
    
    return (
      <TouchableOpacity 
        style={styles.productCard}
        activeOpacity={0.7}
        onPress={() => onOpenModal(item)}
      >
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: item.image }} 
            style={styles.productImage}
            resizeMode="cover"
          />
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
          <Text style={styles.productPrice}>
            {formatPrice(item.price)}
          </Text>
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingText}>⭐ {item.rating}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenFadeTransition>
      <View style={styles.root}>
        <StatusBar style="dark" />
        <DecorativeBackground />

      <SafeAreaView style={styles.container}>
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Menu</Text>
        <Text style={styles.headerSubtitle}>Discover our signature drinks</Text>
      </View>

      {/* Category Filter */}
      <View style={styles.categoryContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {CATEGORIES.map(renderCategoryPill)}
        </ScrollView>
      </View>

      {/* Product Grid */}
      <FlatList
        data={filteredMenu}
        renderItem={renderProductCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.productGrid}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
      />

      {/* Product Detail Modal */}
      <Modal
        transparent
        visible={!!selectedProduct}
        animationType="none"
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

                    {/* Product Image */}
                    <Image 
                      source={{ uri: selectedProduct.image }}
                      style={styles.modalImage}
                      resizeMode="cover"
                    />

                    {/* Product Details */}
                    <View style={styles.modalDetails}>
                      <Text style={styles.modalTitle}>{selectedProduct.name}</Text>
                      <Text style={styles.modalPrice}>{formatPrice(selectedProduct.price)}</Text>
                      
                      <View style={styles.modalRatingRow}>
                        <Text style={styles.modalRating}>⭐ {selectedProduct.rating}</Text>
                        <Text style={styles.modalCategory}>{selectedProduct.category}</Text>
                      </View>

                      <Text style={styles.modalDescription}>
                        Enjoy our signature drink made with premium ingredients. 
                        Perfectly crafted to satisfy your cravings with authentic flavors and quality ingredients.
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
      </SafeAreaView>
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
    paddingBottom: 100,
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
  productImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
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
    padding: 12,
  },
  productName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2A1F1F',
    marginBottom: 6,
    lineHeight: 20,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#B91C2F',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: '#8C7B75',
    fontWeight: '600',
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
    backgroundColor: '#F0F0F0',
  },
  modalDetails: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2A1F1F',
    marginBottom: 8,
  },
  modalPrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#B91C2F',
    marginBottom: 12,
  },
  modalRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalRating: {
    fontSize: 14,
    color: '#2A1F1F',
    fontWeight: '600',
    marginRight: 12,
  },
  modalCategory: {
    fontSize: 14,
    color: '#8C7B75',
    backgroundColor: '#FFF8F0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modalDescription: {
    fontSize: 14,
    color: '#8C7B75',
    lineHeight: 22,
  },
});
