import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Sparkles, Star, ChevronRight } from 'lucide-react-native';

export interface FeaturedDrink {
  id: string;
  name: string;
  category: string;
  price: string;
  leaves: string;
  imageUrl: string;
}

const FEATURED_DRINKS: FeaturedDrink[] = [
  {
    id: '1',
    name: 'Earl Grey Milk Tea 3J',
    category: 'Best Seller',
    price: 'Rp 32.000',
    leaves: '50 Leaves',
    imageUrl: 'https://images.unsplash.com/photo-1558857563-b371033873b8?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: '2',
    name: 'Brown Sugar Fresh Milk',
    category: 'Trending',
    price: 'Rp 35.000',
    leaves: '60 Leaves',
    imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: '3',
    name: 'Taro Milk Tea w/ Red Bean',
    category: 'Favorite',
    price: 'Rp 30.000',
    leaves: '45 Leaves',
    imageUrl: 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=500&auto=format&fit=crop&q=80',
  },
];

interface BentoFeaturedDrinksProps {
  onPress?: (drink: FeaturedDrink) => void;
}

export default function BentoFeaturedDrinks({ onPress }: BentoFeaturedDrinksProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setInterval(() => {
      // Fade out & slide up
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: -8,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentIndex((prev) => (prev + 1) % FEATURED_DRINKS.length);
        translateYAnim.setValue(8);

        // Fade in & slide back to origin
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(translateYAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, 4000);

    return () => clearInterval(timer);
  }, [fadeAnim, translateYAnim]);

  const currentDrink = FEATURED_DRINKS[currentIndex];

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={() => onPress && onPress(currentDrink)}
    >
      {/* HEADER BADGE */}
      <View style={styles.headerRow}>
        <View style={styles.badgePill}>
          <Sparkles size={10} color="#B91C2F" />
          <Text style={styles.badgeText}>{currentDrink.category}</Text>
        </View>
        <ChevronRight size={14} color="#A08F88" />
      </View>

      {/* DRINK DISPLAY CONTENT */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: translateYAnim }],
          },
        ]}
      >
        <View style={styles.imageWrap}>
          <Image
            source={{ uri: currentDrink.imageUrl }}
            style={styles.drinkImage}
            resizeMode="cover"
          />
        </View>

        <View style={styles.textDetails}>
          <Text style={styles.drinkName} numberOfLines={2}>
            {currentDrink.name}
          </Text>
          <View style={styles.priceRow}>
            <Star size={10} color="#B91C2F" fill="#B91C2F" />
            <Text style={styles.leavesText}>{currentDrink.leaves}</Text>
          </View>
        </View>
      </Animated.View>

      {/* ROTATING INDICATOR DOTS */}
      <View style={styles.indicatorRow}>
        {FEATURED_DRINKS.map((_, idx) => (
          <View
            key={idx}
            style={[
              styles.dot,
              idx === currentIndex && styles.activeDot,
            ]}
          />
        ))}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    height: 175,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 12,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#F0E8E2',
    shadowColor: '#2A1F1F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F3',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FFE4E6',
  },
  badgeText: {
    color: '#B91C2F',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  imageWrap: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: '#FFF1F3',
    overflow: 'hidden',
  },
  drinkImage: {
    width: '100%',
    height: '100%',
  },
  textDetails: {
    flex: 1,
  },
  drinkName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2A1F1F',
    lineHeight: 17,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  leavesText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B91C2F',
  },
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#E5E7EB',
  },
  activeDot: {
    width: 14,
    backgroundColor: '#B91C2F',
  },
});
