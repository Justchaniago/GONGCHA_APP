import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableWithoutFeedback, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions 
} from 'react-native';
import { Image } from 'expo-image';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  useAnimatedScrollHandler,
  withSpring, 
  withTiming,
  withDelay,
  Easing,
  runOnJS 
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Star, Heart, X, Search } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const BRAND_RED = '#C8102E';
const BRAND_BG = '#FAF8F5';
const TEXT_DARK = '#1D1D1F';
const TEXT_MUTED = '#7C6E68';
const BORDER_COLOR = '#EFECE7';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Premium, luxurious Apple spring physics (highly damped, smooth startup, zero bounce)
const springConfig = {
  damping: 34,
  stiffness: 100,
  mass: 1.2,
};

export interface MenuMorphScreenProps {
  categories: string[];
  items: any[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const MenuMorphScreen = ({ 
  categories, 
  items, 
  selectedCategory, 
  onSelectCategory, 
  searchQuery, 
  onSearchChange 
}: MenuMorphScreenProps) => {
  const insets = useSafeAreaInsets();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [activeItem, setActiveItem] = useState<any | null>(null);
  const [selectedSize, setSelectedSize] = useState<'R' | 'L'>('R');
  
  const listRef = useRef<any>(null);
  const [flatListTop, setFlatListTop] = useState(0);
  const scrollY = useSharedValue(0);
  const morphProgress = useSharedValue(0); // 0 = collapsed, 1 = expanded
  const detailsProgress = useSharedValue(0); // 0 = collapsed, 1 = details visible
  const closeBtnOpacity = useSharedValue(0); // Dedicated close button opacity controller
  
  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    }
  });

  const handleExpand = (item: any, index: number) => {
    const itemId = item.id || item.code;
    setActiveItem(item);
    setActiveIndex(index);
    setExpandedId(itemId);
    triggerHaptic();
    
    // Smoothly animate card and image morphing first
    morphProgress.value = withSpring(1, springConfig);
    
    // Stagger detail text appearance: starts fading/sliding up 220ms later (just as card settles)
    detailsProgress.value = 0;
    detailsProgress.value = withDelay(
      220,
      withTiming(1, { duration: 280 })
    );

    // Fade in the close button after a small delay during expansion
    closeBtnOpacity.value = withDelay(150, withTiming(1, { duration: 150 }));
  };

  const handleCollapse = () => {
    triggerHaptic();
    // Instantly hide the close button to prevent floating remnants
    closeBtnOpacity.value = 0;
    // Instantly reset expandedId so the static item in the list becomes visible immediately
    // during the shrink animation. This prevents the 0.5s freeze/blink effect at the end.
    setExpandedId(null);
    detailsProgress.value = withTiming(0, { duration: 100 });
    
    // Dismiss using a fast, crisp 250ms timing transition (Easing.bezier) to eliminate the settling tail delay
    morphProgress.value = withTiming(0, {
      duration: 250,
      easing: Easing.bezier(0.25, 1, 0.5, 1),
    }, (finished) => {
      if (finished) {
        runOnJS(cleanupState)();
      }
    });
  };

  const cleanupState = () => {
    setActiveItem(null);
    setActiveIndex(null);
  };

  // Close button style linked to dedicated closeBtnOpacity so it behaves perfectly
  const closeBtnAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: closeBtnOpacity.value,
    };
  });

  // Animate the absolute overlay card container
  const overlayCardStyle = useAnimatedStyle(() => {
    // Pixel-perfect calculated starting Y relative to the parent view
    const startY = (activeIndex ?? 0) * 122 + flatListTop - scrollY.value;
    const endY = insets.top + 20;

    const startHeight = 110;
    const endHeight = 440;

    const currentY = startY + (endY - startY) * morphProgress.value;
    const currentHeight = startHeight + (endHeight - startHeight) * morphProgress.value;
    const currentRadius = 18 + (24 - 18) * morphProgress.value;

    return {
      position: 'absolute',
      top: currentY,
      left: 16,
      width: screenWidth - 32,
      height: currentHeight,
      borderRadius: currentRadius,
      backgroundColor: 'white',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12 * morphProgress.value + 0.04,
      shadowRadius: 16 * morphProgress.value + 4,
      elevation: 4 + 6 * morphProgress.value,
      zIndex: 1000,
      overflow: 'hidden',
    };
  });

  // Animate the image container size and position inside the overlay card (continuous stretch)
  const overlayImageStyle = useAnimatedStyle(() => {
    const startLeft = 14;
    const endLeft = 0;
    const startTop = 14;
    const endTop = 0;

    const startWidth = 80;
    const endWidth = screenWidth - 32;
    const startHeight = 80;
    const endHeight = 230;

    const currentLeft = startLeft + (endLeft - startLeft) * morphProgress.value;
    const currentTop = startTop + (endTop - startTop) * morphProgress.value;
    const currentWidth = startWidth + (endWidth - startWidth) * morphProgress.value;
    const currentHeight = startHeight + (endHeight - startHeight) * morphProgress.value;
    const currentRadius = 12 + (0 - 12) * morphProgress.value;

    return {
      position: 'absolute',
      left: currentLeft,
      top: currentTop,
      width: currentWidth,
      height: currentHeight,
      borderRadius: currentRadius,
      overflow: 'hidden',
      backgroundColor: '#F5F1ED',
    };
  });

  const overlayCollapsedTextStyle = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      left: 110,
      top: 14,
      right: 14,
      opacity: 1 - morphProgress.value,
      transform: [{ translateX: morphProgress.value * 40 }],
    };
  });

  const overlayExpandedContentStyle = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 210,
      opacity: detailsProgress.value,
      transform: [{ translateY: (1 - detailsProgress.value) * 30 }],
    };
  });

  const backdropStyle = useAnimatedStyle(() => {
    return {
      opacity: morphProgress.value,
    };
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <StatusBar style="dark" />
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Menu & Katalog</Text>
        <Text style={styles.headerSubtitle}>Nikmati kesegaran Gong Cha terbaik</Text>
      </View>
      
      <View style={styles.searchContainer}>
        <Search size={18} color={TEXT_MUTED} style={styles.searchIcon} />
        <TextInput 
          style={styles.searchBar} 
          placeholder="Cari minuman..." 
          placeholderTextColor={TEXT_MUTED}
          value={searchQuery} 
          onChangeText={onSearchChange} 
        />
      </View>

      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScrollContent}>
          {categories.map((cat: any) => {
            const catId = typeof cat === 'object' ? cat.id : cat;
            const catName = typeof cat === 'object' ? cat.name : cat;
            const isSelected = selectedCategory === catId;
            return (
              <TouchableOpacity 
                key={catId} 
                onPress={() => {
                  onSelectCategory(catId);
                  triggerHaptic();
                }} 
                style={[styles.tab, isSelected && styles.activeTab]}
              >
                <Text style={[styles.tabText, isSelected && styles.activeTabText]}>{catName}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* STATIC FLATLIST (CARDS STAY STABLE, CLONE OPENS IN OVERLAY) */}
      <Animated.FlatList
        ref={listRef}
        data={items}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        scrollEnabled={expandedId === null}
        onLayout={(event) => setFlatListTop(event.nativeEvent.layout.y)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        keyExtractor={(item: any) => item.id || item.code}
        renderItem={({ item, index }) => {
          return (
            <TouchableWithoutFeedback onPress={() => handleExpand(item, index)}>
              <View style={styles.cardStatic}>
                <View style={[styles.cardStaticImage, { backgroundColor: '#F5F1ED' }]}>
                  {item.imageUrl || item.image_url ? (
                    <Image 
                      source={{ uri: item.imageUrl || item.image_url }} 
                      style={styles.morphImage} 
                      contentFit="contain" 
                    />
                  ) : (
                    <Text style={styles.placeholderText}>🧋</Text>
                  )}
                </View>

                <View style={styles.cardStaticText}>
                  <View style={styles.rowTitleHeader}>
                    <Text style={styles.titleText} numberOfLines={1}>{item.name}</Text>
                    <Heart size={16} color={BRAND_RED} style={styles.heartIcon} />
                  </View>
                  <Text style={styles.priceText}>Mulai {item.formattedPrice || `Rp ${item.price || item.price_minor || 0}`}</Text>
                  <View style={styles.metaRow}>
                    <View style={styles.ratingBadge}>
                      <Star size={10} color="#D4AF37" fill="#D4AF37" />
                      <Text style={styles.ratingText}>{item.rating || '4.8'}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          );
        }}
      />

      {/* DETAILED EXPANDED CONTENT OVERLAY (CLONED SHARED ELEMENT MORPH) */}
      {activeItem && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {/* Tap outside the card area backdrop to trigger collapse */}
          <TouchableWithoutFeedback onPress={handleCollapse}>
            <Animated.View style={[styles.backdrop, backdropStyle]} />
          </TouchableWithoutFeedback>

          <Animated.View style={overlayCardStyle}>
            {/* IMAGE CONTAINER WITH CONTINUOUS RESIZING */}
            <Animated.View style={overlayImageStyle}>
              {(activeItem.imageUrl || activeItem.image_url) ? (
                <Image 
                  source={{ uri: activeItem.imageUrl || activeItem.image_url }} 
                  style={styles.morphImage} 
                  contentFit="contain" 
                />
              ) : (
                <View style={[StyleSheet.absoluteFillObject, styles.placeholderImage]}>
                  <Text style={styles.placeholderText}>🧋</Text>
                </View>
              )}

              {/* Close Button overlay inside expanded hero image */}
              <Animated.View style={closeBtnAnimatedStyle}>
                <TouchableOpacity style={styles.closeBtn} onPress={handleCollapse} activeOpacity={0.8}>
                  <X size={18} color={TEXT_DARK} strokeWidth={2.5} />
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>

            {/* COLLAPSED TEXT CLONE (FADES OUT) */}
            <Animated.View style={overlayCollapsedTextStyle}>
              <View style={styles.rowTitleHeader}>
                <Text style={styles.titleText}>{activeItem.name}</Text>
                <Heart size={16} color={BRAND_RED} style={styles.heartIcon} />
              </View>
              <Text style={styles.priceText}>Mulai {activeItem.formattedPrice || `Rp ${activeItem.price || activeItem.price_minor || 0}`}</Text>
            </Animated.View>

            {/* EXPANDED CONTENT CLONE (FADES IN) */}
            <Animated.View style={[styles.expandedContent, overlayExpandedContentStyle]}>
              <LinearGradient
                colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.95)', '#FFFFFF']}
                style={styles.gradientBg}
              />
              <View style={styles.expandedContentInner}>
                <View style={styles.expandedHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.expandedTitle}>{activeItem.name}</Text>
                    <Text style={styles.expandedCategory}>{activeItem.category || 'Special Tea'}</Text>
                  </View>
                  <Text style={styles.expandedPrice}>{activeItem.formattedPrice || `Rp ${activeItem.price || activeItem.price_minor || 0}`}</Text>
                </View>

                <Text style={styles.expandedDesc} numberOfLines={2}>
                  {activeItem.description || 'Nikmati kesegaran daun teh Gong Cha pilihan dengan cita rasa premium khas Taiwan.'}
                </Text>

                {/* PILL-SHAPED SIZE SELECTOR */}
                <View style={styles.sizeSelectorSection}>
                  <Text style={styles.sizeLabel}>Pilih Ukuran:</Text>
                  <View style={styles.pillContainer}>
                    <TouchableOpacity 
                      onPress={() => setSelectedSize('R')} 
                      style={[styles.sizePill, selectedSize === 'R' && styles.sizePillActive]}
                    >
                      <Text style={[styles.sizePillText, selectedSize === 'R' && styles.sizePillTextActive]}>Reguler (R)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => setSelectedSize('L')} 
                      style={[styles.sizePill, selectedSize === 'L' && styles.sizePillActive]}
                    >
                      <Text style={[styles.sizePillText, selectedSize === 'L' && styles.sizePillTextActive]}>Large (L)</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity style={styles.actionButton} onPress={handleCollapse}>
                  <Text style={styles.actionButtonText}>Kembali ke Katalog</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </Animated.View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND_BG },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  headerContainer: { paddingHorizontal: 16, marginBottom: 12 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: TEXT_DARK },
  headerSubtitle: { fontSize: 13, color: TEXT_MUTED, marginTop: 4 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 14,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1.5,
    borderColor: BORDER_COLOR,
    marginBottom: 16,
  },
  searchIcon: { marginRight: 8 },
  searchBar: { flex: 1, fontSize: 15, color: TEXT_DARK, fontWeight: '500', padding: 0 },
  tabsWrapper: { marginBottom: 14 },
  tabsScrollContent: { paddingHorizontal: 16, gap: 8 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#EFECE7',
    borderWidth: 1,
    borderColor: '#E6DFD9',
  },
  activeTab: { backgroundColor: BRAND_RED, borderColor: BRAND_RED },
  tabText: { color: TEXT_MUTED, fontSize: 13, fontWeight: '700' },
  activeTabText: { color: 'white' },
  listContent: { paddingBottom: 120 },
  
  // Static bento card row styling
  cardStatic: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    height: 110,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardStaticImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardStaticText: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },

  // Image styles
  placeholderImage: { backgroundColor: '#F5F1ED', justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 32 },
  morphImage: {
    width: '100%',
    height: '100%',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1010,
  },

  // Text row info
  rowTitleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  titleText: { fontSize: 16, fontWeight: '800', color: TEXT_DARK, flex: 1, marginRight: 8 },
  heartIcon: { opacity: 0.75 },
  priceText: { fontSize: 14, fontWeight: '700', color: BRAND_RED, marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FFFDFB', borderWidth: 0.5, borderColor: '#EAE3DD', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  ratingText: { fontSize: 10, fontWeight: '700', color: TEXT_DARK },
  tagLabel: { fontSize: 9, fontWeight: '700', color: TEXT_MUTED, backgroundColor: BRAND_BG, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 0.5, borderColor: BORDER_COLOR },

  // Expanded Detailed Overlay
  expandedContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 210,
    justifyContent: 'flex-end',
  },
  gradientBg: {
    position: 'absolute',
    top: -50,
    left: 0,
    right: 0,
    bottom: 0,
  },
  expandedContentInner: {
    padding: 20,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: BORDER_COLOR,
  },
  expandedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  expandedTitle: { fontSize: 20, fontWeight: '900', color: TEXT_DARK },
  expandedCategory: { fontSize: 11, fontWeight: '700', color: TEXT_MUTED, textTransform: 'uppercase', marginTop: 2 },
  expandedPrice: { fontSize: 18, fontWeight: '800', color: BRAND_RED },
  expandedDesc: { fontSize: 13, color: TEXT_MUTED, lineHeight: 18, fontWeight: '500', marginBottom: 14 },
  
  // Pill Selector Styles
  sizeSelectorSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sizeLabel: { fontSize: 13, fontWeight: '700', color: TEXT_DARK },
  pillContainer: { flexDirection: 'row', gap: 6 },
  sizePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F5F1ED',
    borderWidth: 1,
    borderColor: '#EFECE7',
  },
  sizePillActive: {
    backgroundColor: BRAND_RED,
    borderColor: BRAND_RED,
  },
  sizePillText: { fontSize: 11, fontWeight: '700', color: TEXT_DARK },
  sizePillTextActive: { color: 'white' },
  
  actionButton: {
    backgroundColor: BRAND_RED,
    borderRadius: 12,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: { color: 'white', fontSize: 14, fontWeight: '700' },
});
