import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  Dimensions,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import type {
  PromotionsViewModel,
  PromotionDisplayItem,
} from '../../application/promotions/PromotionsViewModel';

const { width: SW } = Dimensions.get('window');
const CAROUSEL_WIDTH = SW - 32;

interface PromotionsViewProps {
  viewModel: PromotionsViewModel;
  onSelectPromo?: (promo: PromotionDisplayItem) => void;
}

export function PromotionsView({ viewModel, onSelectPromo }: PromotionsViewProps) {
  const { heroBanners = [], activeCards = [] } = viewModel;
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const index = Math.round(event.nativeEvent.contentOffset.x / CAROUSEL_WIDTH);
        setActiveHeroIndex(index);
      },
    }
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📢</Text>
      <Text style={styles.emptyTitle}>No Promotions Active</Text>
      <Text style={styles.emptySubtitle}>
        Check back later for seasonal Gong Cha deals and exclusive offers!
      </Text>
    </View>
  );

  const hasContent = heroBanners.length > 0 || activeCards.length > 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gong Cha Banners</Text>
        <Text style={styles.headerSubtitle}>V1 Promotions & Local Ads Feed</Text>
      </View>

      {!hasContent ? (
        renderEmptyState()
      ) : (
        <>
          {/* Hero Carousel */}
          {heroBanners.length > 0 && (
            <View style={styles.carouselContainer}>
              <Text style={styles.sectionTitle}>Featured Offers</Text>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                snapToInterval={CAROUSEL_WIDTH}
                decelerationRate="fast"
                onScroll={handleScroll}
                scrollEventThrottle={16}
                contentContainerStyle={styles.carouselScroll}
              >
                {heroBanners.map((item) => (
                  <Pressable
                    key={item.id}
                    style={styles.heroCard}
                    onPress={() => onSelectPromo?.(item)}
                  >
                    <Image source={{ uri: item.imageUrl }} style={styles.heroImage} />
                    <View style={styles.heroGradient}>
                      <View style={styles.tag}>
                        <Text style={styles.tagText}>Hero</Text>
                      </View>
                      <Text style={styles.heroTitle}>{item.title}</Text>
                      {item.subtitle ? <Text style={styles.heroSubtitle}>{item.subtitle}</Text> : null}
                      <Text style={styles.heroPeriod}>⏱ {item.formattedPeriod}</Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Indicator Dots */}
              {heroBanners.length > 1 && (
                <View style={styles.indicatorContainer}>
                  {heroBanners.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.indicatorDot,
                        activeHeroIndex === index && styles.indicatorDotActive,
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Active Cards Feed */}
          {activeCards.length > 0 && (
            <View style={styles.feedContainer}>
              <Text style={styles.sectionTitle}>More Promos</Text>
              {activeCards.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.promoCard}
                  onPress={() => onSelectPromo?.(item)}
                >
                  <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />
                  <View style={styles.cardContent}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.cardTitle}>{item.title}</Text>
                      <View style={styles.cardTag}>
                        <Text style={styles.cardTagText}>Card</Text>
                      </View>
                    </View>
                    {item.subtitle ? <Text style={styles.cardSubtitle}>{item.subtitle}</Text> : null}
                    <View style={styles.cardFooter}>
                      <Text style={styles.cardPeriod}>⏱ {item.formattedPeriod}</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9FB',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#8A1C14', // Gong Cha signature premium red
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#65656B',
    marginTop: 4,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  carouselContainer: {
    marginTop: 8,
    marginBottom: 24,
  },
  carouselScroll: {
    paddingHorizontal: 16,
  },
  heroCard: {
    width: CAROUSEL_WIDTH,
    height: 190,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginRight: 0,
    shadowColor: '#8A1C14',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  heroGradient: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  tag: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#8A1C14',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  heroTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroSubtitle: {
    color: '#E1E1E6',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  heroPeriod: {
    color: '#FFD3D1',
    fontSize: 10,
    fontWeight: '600',
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D1D6',
    marginHorizontal: 3,
  },
  indicatorDotActive: {
    width: 14,
    backgroundColor: '#8A1C14',
  },
  feedContainer: {
    marginTop: 8,
  },
  promoCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EBEBEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardImage: {
    width: '100%',
    height: 140,
  },
  cardContent: {
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    flex: 1,
    marginRight: 8,
  },
  cardTag: {
    backgroundColor: '#EAEAEF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cardTagText: {
    color: '#65656B',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#65656B',
    marginBottom: 12,
    lineHeight: 16,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingTop: 8,
  },
  cardPeriod: {
    fontSize: 11,
    color: '#8A1C14',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#65656B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
