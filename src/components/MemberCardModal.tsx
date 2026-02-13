import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { X } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { useMemberCard } from '../context/MemberContext';
import { MockBackend } from '../services/MockBackend';
import { UserProfile } from '../types/types';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = Math.min(width * 0.78, 340);
const CARD_HEIGHT = CARD_WIDTH * 1.58;

const TIER_BADGE_THEME = {
  Silver: { bg: '#CBD5E1', text: '#334155' },
  Gold: { bg: '#D4A853', text: '#2A1F1F' },
  Platinum: { bg: '#C4B5FD', text: '#4C1D95' },
} as const;

export default function MemberCardModal() {
  const { isCardVisible, hideCard, anchor } = useMemberCard();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [mounted, setMounted] = useState(false);
  const gestureDismissRef = useRef(false);

  const entranceProgress = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const dismissScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let active = true;

    if (isCardVisible) {
      setMounted(true);
      MockBackend.getUser().then((profile) => {
        if (active) {
          setUser(profile);
        }
      });

      entranceProgress.setValue(0);
      dragY.setValue(0);
      cardOpacity.setValue(0);
      dismissScale.setValue(1);
      gestureDismissRef.current = false;
      Animated.parallel([
        Animated.spring(entranceProgress, {
          toValue: 1,
          damping: 20,
          stiffness: 135,
          mass: 0.95,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      if (gestureDismissRef.current) {
        gestureDismissRef.current = false;
        setMounted(false);
        return;
      }

      Animated.parallel([
        Animated.timing(entranceProgress, {
          toValue: 0,
          duration: 300,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setMounted(false);
        }
      });
    }

    return () => {
      active = false;
    };
  }, [backdropOpacity, cardOpacity, dismissScale, dragY, entranceProgress, hideCard, isCardVisible, mounted]);

  const startDx = anchor ? anchor.x - width / 2 : 0;
  const startDy = anchor ? anchor.y - height / 2 : height * 0.3;
  const startScale = anchor ? Math.max(0.2, Math.min(anchor.size / CARD_WIDTH, 0.48)) : 0.45;

  const entryTranslateX = entranceProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [startDx, 0],
  });

  const entryTranslateY = entranceProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [startDy, 0],
  });

  const settleScale = entranceProgress.interpolate({
    inputRange: [0, 0.75, 1],
    outputRange: [startScale, 1.02, 1],
  });

  const composedScale = Animated.multiply(settleScale, dismissScale);

  const gestureCardOpacity = dragY.interpolate({
    inputRange: [-280, -85, 0],
    outputRange: [0.14, 1, 1],
    extrapolate: 'clamp',
  });

  const gestureBackdropOpacity = dragY.interpolate({
    inputRange: [-280, -85, 0],
    outputRange: [0.4, 1, 1],
    extrapolate: 'clamp',
  });

  const composedCardOpacity = Animated.multiply(cardOpacity, gestureCardOpacity);
  const composedBackdropOpacity = Animated.multiply(backdropOpacity, gestureBackdropOpacity);

  const composedTranslateY = Animated.add(entryTranslateY, dragY);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 4,
        onMoveShouldSetPanResponderCapture: (_, gestureState) => Math.abs(gestureState.dy) > 4,
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy < 0) {
            dragY.setValue(gestureState.dy);
          } else {
            dragY.setValue(gestureState.dy * 0.12);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy < -85 || gestureState.vy < -1.1) {
            gestureDismissRef.current = true;
            Animated.parallel([
              Animated.timing(dragY, {
                toValue: -height * 0.55,
                duration: 240,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }),
              Animated.timing(cardOpacity, {
                toValue: 0,
                duration: 210,
                easing: Easing.in(Easing.quad),
                useNativeDriver: true,
              }),
              Animated.timing(backdropOpacity, {
                toValue: 0,
                duration: 210,
                easing: Easing.in(Easing.quad),
                useNativeDriver: true,
              }),
              Animated.timing(dismissScale, {
                toValue: 0.94,
                duration: 220,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }),
            ]).start(() => hideCard());
            return;
          }

          Animated.spring(dragY, {
            toValue: 0,
            damping: 20,
            stiffness: 250,
            useNativeDriver: true,
          }).start();
        },
      }),
    [backdropOpacity, cardOpacity, dismissScale, dragY, hideCard]
  );

  if (!mounted) {
    return null;
  }

  return (
    <Modal transparent visible={mounted} animationType="none" onRequestClose={hideCard}>
      <View style={styles.container}>
        <Animated.View style={[styles.backdrop, { opacity: composedBackdropOpacity }]}>
          <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFillObject} />
          <Pressable style={StyleSheet.absoluteFillObject} onPress={hideCard} />
        </Animated.View>

        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.cardWrapper,
            {
              opacity: composedCardOpacity,
              transform: [
                { translateX: entryTranslateX },
                { translateY: composedTranslateY },
                { scale: composedScale },
              ],
            },
          ]}
        >
          <View style={styles.card}>
            <View style={styles.glowTop} />
            <Image source={require('../../assets/images/abstract1.png')} style={styles.abstractTop} />
            <Image source={require('../../assets/images/abstract2.png')} style={styles.abstractBottom} />
            <Image source={require('../../assets/images/leaf1.png')} style={styles.leafLeft} />
            <Image source={require('../../assets/images/leaf2.png')} style={styles.leafRight} />

            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.brandText}>Gong cha</Text>
                <Text style={styles.subTitle}>Member Pass</Text>
              </View>
              <TouchableOpacity onPress={hideCard} style={styles.closeBtn} activeOpacity={0.85}>
                <X size={18} color="#2A1F1F" />
              </TouchableOpacity>
            </View>

            <View style={styles.qrContainer}>
              {user ? (
                <QRCode value={user.id} size={156} color="#2A1F1F" backgroundColor="transparent" />
              ) : (
                <Text style={styles.loadingText}>Loading ID...</Text>
              )}
            </View>

            <View style={styles.pointsBlock}>
              <Text style={styles.pointsLabel}>WALLET POINTS</Text>
              <Text style={styles.pointsValue}>{(user?.currentPoints ?? 0).toLocaleString('id-ID')}</Text>
            </View>

            <View style={styles.footerRow}>
              <View>
                <Text style={styles.memberName}>{user?.name ?? 'Guest'}</Text>
                <Text style={styles.memberId}>{user?.id ?? '---'}</Text>
              </View>
              <View
                style={[
                  styles.tierBadge,
                  { backgroundColor: TIER_BADGE_THEME[user?.tier ?? 'Silver'].bg },
                ]}
              >
                <Text style={[styles.tierText, { color: TIER_BADGE_THEME[user?.tier ?? 'Silver'].text }]}>
                  {(user?.tier ?? 'Silver').toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.swipeIndicator} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 18,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    backgroundColor: '#FFF8F0',
    borderColor: '#FFFFFF',
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingVertical: 18,
    justifyContent: 'space-between',
  },
  abstractTop: {
    position: 'absolute',
    top: -34,
    right: -24,
    width: 126,
    height: 126,
    opacity: 0.2,
  },
  abstractBottom: {
    position: 'absolute',
    bottom: -40,
    left: -30,
    width: 132,
    height: 132,
    opacity: 0.18,
  },
  leafLeft: {
    position: 'absolute',
    left: -8,
    top: CARD_HEIGHT * 0.38,
    width: 62,
    height: 62,
    opacity: 0.14,
  },
  leafRight: {
    position: 'absolute',
    right: -10,
    bottom: CARD_HEIGHT * 0.2,
    width: 70,
    height: 70,
    opacity: 0.13,
  },
  glowTop: {
    position: 'absolute',
    top: -62,
    right: -54,
    width: 180,
    height: 180,
    borderRadius: 100,
    backgroundColor: '#F2D4D8',
    opacity: 0.55,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandText: {
    color: '#B91C2F',
    fontWeight: '700',
    fontSize: 22,
  },
  subTitle: {
    marginTop: 3,
    color: '#8C7B75',
    fontSize: 12,
    fontWeight: '600',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(42,31,31,0.08)',
  },
  qrContainer: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFE8E1',
    shadowColor: '#2A1F1F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  pointsBlock: {
    alignItems: 'center',
    marginTop: 8,
  },
  pointsLabel: {
    color: '#8C7B75',
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '700',
  },
  pointsValue: {
    color: '#2A1F1F',
    fontSize: 30,
    fontWeight: '800',
    marginTop: 2,
  },
  loadingText: {
    fontSize: 13,
    color: '#8C7B75',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  memberName: {
    color: '#2A1F1F',
    fontWeight: '700',
    fontSize: 17,
  },
  memberId: {
    color: '#8C7B75',
    marginTop: 4,
    letterSpacing: 0.8,
    fontSize: 11,
  },
  tierBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tierText: {
    fontWeight: '700',
    fontSize: 11,
  },
  swipeIndicator: {
    width: 42,
    height: 5,
    borderRadius: 999,
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
});