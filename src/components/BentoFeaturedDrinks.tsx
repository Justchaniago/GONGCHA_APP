import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Image,
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
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

const TOTAL = DRINK_IMAGES.length;
const SWIPE_THRESHOLD = 40;
const AUTO_DELAY = 5000;

interface BentoFeaturedDrinksProps {
  onPress?: () => void;
}

export default React.memo(function BentoFeaturedDrinks(props: BentoFeaturedDrinksProps) {
  const { t } = useTranslation();
  const { onPress } = props;
  const containerWidthRef = useRef(0);

  // One Animated.Value per image — translateX, native thread only. Zero setState.
  const anims = useRef(
    DRINK_IMAGES.map((_, i) => new Animated.Value(i === 0 ? 0 : 999))
  ).current;

  const stepRef = useRef(0);
  const isAnimating = useRef(false);

  // Amandemen #1: setTimeout rekursif — no interval accumulation
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleNext = () => {
    timerRef.current = setTimeout(slideNext, AUTO_DELAY);
  };

  const cancelTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // Snap all anims to clean state for stepRef=0 layout
  const snapToStep = (step: number) => {
    const w = containerWidthRef.current;
    const cur = step % TOTAL;
    const next = (step + 1) % TOTAL;
    anims.forEach((a, i) => {
      if (i === cur) a.setValue(0);
      else if (i === next) a.setValue(w);
      else a.setValue(999);
    });
  };

  const slideToStep = (targetStep: number, fromDx = 0) => {
    if (isAnimating.current) return;
    isAnimating.current = true;

    const w = containerWidthRef.current;
    const cur = stepRef.current % TOTAL;
    const next = targetStep % TOTAL;
    const upcoming = (targetStep + 1) % TOTAL;

    // Pre-position upcoming off-screen
    anims[upcoming].setValue(w);

    // If coming from a gesture drag, cur and next are already offset by dx;
    // spring to their final positions from wherever they are.
    const curTarget = fromDx < 0 ? -w : w;   // next slide: exit left; prev: exit right
    const nextTarget = 0;

    Animated.parallel([
      Animated.spring(anims[cur], {
        toValue: curTarget,
        bounciness: fromDx !== 0 ? 6 : 2,
        speed: 11,
        useNativeDriver: true,
      }),
      Animated.spring(anims[next], {
        toValue: nextTarget,
        bounciness: 10,
        speed: 11,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        anims[cur].setValue(999);
        stepRef.current = targetStep;
      }
      // Amandemen #2: always reset isAnimating, even if cancelled
      isAnimating.current = false;
      if (finished) scheduleNext();
    });
  };

  const slideNext = () => {
    const w = containerWidthRef.current;
    if (w <= 0 || isAnimating.current) {
      scheduleNext();
      return;
    }
    const next = stepRef.current + 1;
    const nextIdx = next % TOTAL;
    anims[nextIdx].setValue(w);
    slideToStep(next, -1);
  };

  const slidePrev = () => {
    const w = containerWidthRef.current;
    if (w <= 0 || isAnimating.current) return;
    const prev = stepRef.current - 1;
    if (prev < 0) return; // ponytail: no wrap-around prev; add modulo when needed
    const prevIdx = prev % TOTAL;
    anims[prevIdx].setValue(-w);
    slideToStep(prev, 1);
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0 && containerWidthRef.current === 0) {
      containerWidthRef.current = width;
      anims[1].setValue(width);
    }
  };

  useEffect(() => {
    scheduleNext();
    return () => {
      cancelTimer();
      // Amandemen #2: cleanup isAnimating on unmount
      isAnimating.current = false;
    };
  }, []);

  // PanResponder — live drag offsets cur + next together
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dx }) => Math.abs(dx) > 5,

      onPanResponderGrant: () => {
        // Cancel auto-slide on touch start
        cancelTimer();
      },

      onPanResponderMove: (_, { dx }) => {
        const w = containerWidthRef.current;
        if (w <= 0) return;
        const cur = stepRef.current % TOTAL;
        const next = (stepRef.current + 1) % TOTAL;
        const prev = ((stepRef.current - 1) % TOTAL + TOTAL) % TOTAL;

        // Drag current and the adjacent image together
        anims[cur].setValue(dx);
        if (dx < 0) {
          // Dragging left — reveal next
          anims[next].setValue(w + dx);
        } else {
          // Dragging right — reveal prev
          anims[prev].setValue(-w + dx);
        }
      },

      onPanResponderRelease: (_, { dx, vx }) => {
        const w = containerWidthRef.current;
        const cur = stepRef.current % TOTAL;
        const next = (stepRef.current + 1) % TOTAL;
        const prev = ((stepRef.current - 1) % TOTAL + TOTAL) % TOTAL;

        const shouldAdvance = dx < -SWIPE_THRESHOLD || vx < -0.5;
        const shouldReverse = dx > SWIPE_THRESHOLD || vx > 0.5;

        if (shouldAdvance) {
          // Complete slide to next
          const targetStep = stepRef.current + 1;
          const upcoming = (targetStep + 1) % TOTAL;
          anims[upcoming].setValue(w);
          isAnimating.current = true;
          Animated.parallel([
            Animated.spring(anims[cur], { toValue: -w, bounciness: 6, speed: 11, useNativeDriver: true }),
            Animated.spring(anims[next], { toValue: 0, bounciness: 10, speed: 11, useNativeDriver: true }),
          ]).start(({ finished }) => {
            if (finished) { anims[cur].setValue(999); stepRef.current = targetStep; }
            isAnimating.current = false;
            scheduleNext();
          });
        } else if (shouldReverse && stepRef.current > 0) {
          // Complete slide to prev
          const targetStep = stepRef.current - 1;
          isAnimating.current = true;
          Animated.parallel([
            Animated.spring(anims[cur], { toValue: w, bounciness: 6, speed: 11, useNativeDriver: true }),
            Animated.spring(anims[prev], { toValue: 0, bounciness: 10, speed: 11, useNativeDriver: true }),
          ]).start(({ finished }) => {
            if (finished) { anims[cur].setValue(999); stepRef.current = targetStep; }
            isAnimating.current = false;
            scheduleNext();
          });
        } else {
          // Snap back — didn't reach threshold
          isAnimating.current = true;
          Animated.parallel([
            Animated.spring(anims[cur], { toValue: 0, bounciness: 8, speed: 14, useNativeDriver: true }),
            Animated.spring(anims[next], { toValue: w, bounciness: 4, speed: 14, useNativeDriver: true }),
            Animated.spring(anims[prev], { toValue: -w, bounciness: 4, speed: 14, useNativeDriver: true }),
          ]).start(() => {
            isAnimating.current = false;
            scheduleNext();
          });
        }
      },

      onPanResponderTerminate: () => {
        // Snap back on gesture cancel
        const w = containerWidthRef.current;
        const cur = stepRef.current % TOTAL;
        const next = (stepRef.current + 1) % TOTAL;
        const prev = ((stepRef.current - 1) % TOTAL + TOTAL) % TOTAL;
        anims[cur].setValue(0);
        anims[next].setValue(w);
        anims[prev].setValue(999);
        isAnimating.current = false;
        scheduleNext();
      },
    })
  ).current;

  return (
    <View
      style={styles.container}
      onLayout={handleLayout}
      {...panResponder.panHandlers}
    >
      <View style={styles.viewport}>
        {DRINK_IMAGES.map((uri, i) => (
          <Animated.View
            key={uri}
            style={[styles.layer, { transform: [{ translateX: anims[i] }] }]}
          >
            <Image source={{ uri }} style={styles.drinkImage} resizeMode="contain" />
          </Animated.View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: 180,
    backgroundColor: '#B91C2F',
    borderRadius: 22,
    overflow: 'hidden',
  },
  viewport: {
    flex: 1,
    overflow: 'hidden',
  },
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  drinkImage: {
    width: '115%',
    height: '115%',
  },
});
