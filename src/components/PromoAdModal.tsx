import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Image,
  Pressable,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  AppState,
  AppStateStatus,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useMember } from '../context/MemberContext';
import { useSecurity } from '../context/SecurityContext';
import { PromotionService, PromotionItem } from '../services/PromotionService';

const { width: SW, height: SH } = Dimensions.get('window');
const COUNTDOWN = 5;
const RING_R = 16;
const RING_C = 2 * Math.PI * RING_R;

const CARD_W = SW - 48;
const DEFAULT_CARD_H = Math.min(CARD_W * (4 / 3), SH * 0.78);

// No fallback — if Firestore returns empty, modal simply doesn't show.
// Marketing must populate promotions/modal_ad via admin panel.

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function PromoAdModal() {
  const { isAuthenticated } = useMember();
  const { pinEnabled, appLockEnabled } = useSecurity();
  const [visible, setVisible] = useState(false);
  const [seconds, setSeconds] = useState(COUNTDOWN);
  const adIndexRef = useRef(-1);
  const [currentAd, setCurrentAd] = useState<PromotionItem | null>(null);

  const [ads, setAds] = useState<PromotionItem[]>([]);
  const [cardHeight, setCardHeight] = useState(DEFAULT_CARD_H);

  useEffect(() => {
    return PromotionService.subscribeByType('modal_ad', setAds);
  }, []);

  const adsRef = useRef<PromotionItem[]>([]);
  useEffect(() => { adsRef.current = ads; }, [ads]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.94)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const wasAuthRef = useRef(false);
  const lastShowRef = useRef(0);

  const show = () => {
    // Debounce: login + AppState triggers can fire together → double increment
    const now = Date.now();
    if (now - lastShowRef.current < 800) return;
    const pool = adsRef.current;
    if (pool.length === 0) return;
    lastShowRef.current = now;
    adIndexRef.current = (adIndexRef.current + 1) % pool.length;
    setCurrentAd(pool[adIndexRef.current]);
    setCardHeight(DEFAULT_CARD_H);
    setVisible(true);
  };
  const hide = () => setVisible(false);

  // Trigger: return from background
  // Skip when app lock active — showing two modals simultaneously on iOS
  // causes the Face ID system sheet to be dismissed before it can resolve.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (
        (appStateRef.current === 'background' || appStateRef.current === 'inactive') &&
        next === 'active'
      ) {
        if (!pinEnabled || !appLockEnabled) {
          setTimeout(show, 0);
        }
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [pinEnabled, appLockEnabled]);

  // Trigger: login (false → true)
  useEffect(() => {
    if (!wasAuthRef.current && isAuthenticated) {
      setTimeout(show, 0);
    }
    wasAuthRef.current = isAuthenticated;
  }, [isAuthenticated]);

  // Entrance / exit animation
  useEffect(() => {
    if (visible) {
      setSeconds(COUNTDOWN);
      progressAnim.setValue(0);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 240, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 70, friction: 10, useNativeDriver: true }),
      ]).start();
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: COUNTDOWN * 1000,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.94);
    }
  }, [visible]);

  // Countdown — local var avoids setState-inside-updater bug
  useEffect(() => {
    if (!visible) return;
    let remaining = COUNTDOWN;
    setSeconds(remaining);
    const id = setInterval(() => {
      remaining -= 1;
      setSeconds(remaining);
      if (remaining <= 0) {
        clearInterval(id);
        hide();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [visible]);

  const ringOffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, RING_C],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={hide}
      statusBarTranslucent
    >
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        {/* Full-screen tap area behind card */}
        <Pressable style={StyleSheet.absoluteFillObject} onPress={hide} />

        <Animated.View style={[styles.card, { height: cardHeight, transform: [{ scale: scaleAnim }] }]}>
          {currentAd?.imageUrl ? (
            <Image
              source={{ uri: currentAd.imageUrl }}
              style={[styles.image, { height: cardHeight }]}
              resizeMode="cover"
              onLoad={(e) => {
                const { width, height } = e.nativeEvent.source;
                if (width && height) {
                  setCardHeight(Math.min(CARD_W / (width / height), SH * 0.78));
                }
              }}
            />
          ) : null}

          {/* Countdown + Skip pill */}
          <View style={styles.skipContainer} pointerEvents="box-none">
            <View style={styles.ringOverlay} pointerEvents="none">
              <Svg width={RING_R * 2 + 8} height={RING_R * 2 + 8}>
                <Circle
                  cx={RING_R + 4} cy={RING_R + 4} r={RING_R}
                  stroke="rgba(255,255,255,0.28)"
                  strokeWidth={2.5}
                  fill="transparent"
                />
                <AnimatedCircle
                  cx={RING_R + 4} cy={RING_R + 4} r={RING_R}
                  stroke="rgba(255,255,255,0.92)"
                  strokeWidth={2.5}
                  fill="transparent"
                  strokeDasharray={`${RING_C} ${RING_C}`}
                  strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                  rotation="-90"
                  origin={`${RING_R + 4}, ${RING_R + 4}`}
                />
              </Svg>
            </View>
            <Pressable
              style={styles.skipPill}
              onPress={hide}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View style={styles.countdownSlot}>
                <Text style={styles.countdownText}>{seconds > 0 ? String(seconds) : '×'}</Text>
              </View>
              <View style={styles.pillDivider} />
              <Text style={styles.skipLabel}>Skip</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: CARD_W,
    borderRadius: 24,
    overflow: 'hidden',  // only clips radius corners, not image content
    backgroundColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.55,
    shadowRadius: 32,
    elevation: 20,
  },
  image: {
    width: CARD_W,
  },
  skipContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    height: RING_R * 2 + 8,
  },
  ringOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: RING_R * 2 + 8,
    height: RING_R * 2 + 8,
  },
  skipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: RING_R * 2 + 8,
    backgroundColor: 'rgba(0,0,0,0.52)',
    borderRadius: (RING_R * 2 + 8) / 2,
    overflow: 'hidden',
  },
  countdownSlot: {
    width: RING_R * 2 + 8,
    height: RING_R * 2 + 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
    textAlign: 'center',
  },
  pillDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  skipLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 12,
  },
});
