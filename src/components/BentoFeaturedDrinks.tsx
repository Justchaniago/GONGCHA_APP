import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  LayoutChangeEvent,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

const DRINK_IMAGES = [
  'https://xsixfedgszaswcggsulq.supabase.co/storage/v1/object/public/catalog/images/01-black-tea-with-milk-foam.png',
  'https://xsixfedgszaswcggsulq.supabase.co/storage/v1/object/public/catalog/images/02-green-tea-with-milk-foam.png',
  'https://xsixfedgszaswcggsulq.supabase.co/storage/v1/object/public/catalog/images/03-oolong-tea-with-milk-foam.png',
  'https://xsixfedgszaswcggsulq.supabase.co/storage/v1/object/public/catalog/images/11-black-milk-tea.png',
  'https://xsixfedgszaswcggsulq.supabase.co/storage/v1/object/public/catalog/images/12-green-milk-tea.png',
  'https://xsixfedgszaswcggsulq.supabase.co/storage/v1/object/public/catalog/images/13-oolong-milk-tea.png',
  'https://xsixfedgszaswcggsulq.supabase.co/storage/v1/object/public/catalog/images/14-earl-grey-milk-tea.png',
  'https://xsixfedgszaswcggsulq.supabase.co/storage/v1/object/public/catalog/images/15-matcha-milk-tea.png',
  'https://xsixfedgszaswcggsulq.supabase.co/storage/v1/object/public/catalog/images/21-taro-milk.png',
  'https://xsixfedgszaswcggsulq.supabase.co/storage/v1/object/public/catalog/images/21-strawberry-milk.png',
];

interface BentoFeaturedDrinksProps {
  onPress?: () => void;
}

export default function BentoFeaturedDrinks({ onPress }: BentoFeaturedDrinksProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(100);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Measure container layout to calculate slide distance dynamically
  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0) {
      setContainerWidth(width);
    }
  };

  useEffect(() => {
    if (containerWidth <= 0) return;

    const timer = setInterval(() => {
      // Slide out current to the left
      Animated.timing(slideAnim, {
        toValue: -containerWidth,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        // Change image index
        setCurrentIndex((prev) => (prev + 1) % DRINK_IMAGES.length);
        // Reset slide position to the right
        slideAnim.setValue(containerWidth);
        
        // Slide in from the right to center
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start();
      });
    }, 3000);

    return () => clearInterval(timer);
  }, [containerWidth, currentIndex, slideAnim]);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.95}
      onPress={onPress}
    >
      {/* Rounded stamp border styled with uniform 16px margin on all sides for perfect symmetry */}
      <View style={styles.stampBorder}>
        <View style={styles.carouselViewport} onLayout={handleLayout}>
          <Animated.View
            style={[
              styles.slideWrapper,
              {
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            <Image
              source={{ uri: DRINK_IMAGES[currentIndex] }}
              style={styles.drinkImage}
              resizeMode="contain"
            />
          </Animated.View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1, // Symmetrical 50/50 split
    height: 180,
    backgroundColor: '#B91C2F', // Gong Cha Red
    borderRadius: 22,
    position: 'relative',
  },
  stampBorder: {
    flex: 1,
    margin: 16, // Forces exactly 16px padding/margin on all sides for absolute symmetry
    borderRadius: 14, // Concentric corner radius matching the outer 22px card radius
    borderWidth: 3.5, // Thick brand stamp border
    borderColor: '#FFFFFF',
    overflow: 'hidden',
  },
  carouselViewport: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  slideWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drinkImage: {
    width: '115%', // Perfectly sized transparent drink
    height: '115%',
  },
});
