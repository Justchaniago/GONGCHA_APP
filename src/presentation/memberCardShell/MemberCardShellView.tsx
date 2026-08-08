import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';

import { MemberCardShellViewModel } from '../../application/memberCardShell/MemberCardShellViewModel';

const CARD_BACKGROUND_IMAGES: Record<string, any> = {
  LOVER: require('../../../assets/images/Lovermembercard.png'),
  MASTER: require('../../../assets/images/Mastermembercard.png'),
  AMBASSADOR: require('../../../assets/images/card1.webp'),
  LEGEND: require('../../../assets/images/card1.webp'),
  SILVER: require('../../../assets/images/card1.webp'),
  GOLD: require('../../../assets/images/card1.webp'),
  PLATINUM: require('../../../assets/images/card1.webp'),
};

export interface MemberCardShellViewProps {
  viewModel: MemberCardShellViewModel;
  onClose: () => void;
}

export function MemberCardShellView({ viewModel, onClose }: MemberCardShellViewProps) {
  const { width, height } = useWindowDimensions();
  const [mounted, setMounted] = useState(false);
  const gestureDismissRef = useRef(false);

  const isShortScreen = height < 760;
  const cardWidth = Math.min(Math.max(width * 0.78, 270), 342);
  const cardHeight = Math.min(
    Math.max(cardWidth * (isShortScreen ? 1.36 : 1.44), 430),
    height * 0.78
  );
  const qrSize = Math.round(
    Math.min(Math.max(cardWidth * (isShortScreen ? 0.34 : 0.38), 118), 150)
  );
  const pointsFontSize = width < 360 ? 42 : 50;

  const entranceProgress = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const dismissScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let active = true;

    if (viewModel.visible) {
      setMounted(true);

      entranceProgress.setValue(0);
      dragY.setValue(0);
      cardOpacity.setValue(0);
      backdropOpacity.setValue(0);
      dismissScale.setValue(1);
      gestureDismissRef.current = false;

      Animated.parallel([
        Animated.spring(entranceProgress, {
          toValue: 1,
          damping: 24,
          stiffness: 110,
          mass: 0.95,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 300,
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
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished && active) {
          setMounted(false);
        }
      });
    }

    return () => {
      active = false;
    };
  }, [
    backdropOpacity,
    cardOpacity,
    dismissScale,
    dragY,
    entranceProgress,
    mounted,
    viewModel.visible,
  ]);

  // Clean Slide Up from the bottom of the screen (behind the floating navbar)
  const entryTranslateY = entranceProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [height, 0],
  });

  // Remain scale size consistent at 1
  const composedScale = dismissScale;

  // Fade out slightly when dragging down
  const gestureCardOpacity = dragY.interpolate({
    inputRange: [0, 120, 320],
    outputRange: [1, 0.9, 0.15],
    extrapolate: 'clamp',
  });

  const gestureBackdropOpacity = dragY.interpolate({
    inputRange: [0, 120, 320],
    outputRange: [1, 0.8, 0.3],
    extrapolate: 'clamp',
  });

  const composedCardOpacity = Animated.multiply(cardOpacity, gestureCardOpacity);
  const composedBackdropOpacity = Animated.multiply(
    backdropOpacity,
    gestureBackdropOpacity
  );

  const composedTranslateY = dragY;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 4,
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          Math.abs(gestureState.dy) > 4,
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            // Dragging down freely
            dragY.setValue(gestureState.dy);
          } else {
            // Resist dragging up
            dragY.setValue(gestureState.dy * 0.15);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 80 || gestureState.vy > 1.0) {
            // Swipe down to dismiss
            gestureDismissRef.current = true;
            Animated.parallel([
              Animated.timing(dragY, {
                toValue: height,
                duration: 250,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }),
              Animated.timing(cardOpacity, {
                toValue: 0,
                duration: 220,
                useNativeDriver: true,
              }),
              Animated.timing(backdropOpacity, {
                toValue: 0,
                duration: 220,
                useNativeDriver: true,
              }),
            ]).start(() => onClose());
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
    [backdropOpacity, cardOpacity, dismissScale, dragY, height, onClose]
  );

  if (!mounted) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={mounted}
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <Animated.View style={[styles.backdrop, { opacity: composedBackdropOpacity }]}>
          <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFillObject} />
          <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        </Animated.View>

        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.cardWrapper,
            {
              width: cardWidth,
              opacity: composedCardOpacity,
              transform: [
                { translateY: composedTranslateY },
                { scale: composedScale },
              ],
            },
          ]}
        >
          <View
            style={[
              styles.card,
              {
                width: cardWidth,
                height: cardHeight,
                borderRadius: Math.max(24, cardWidth * 0.078),
              },
            ]}
          >
            {/* Background Image */}
            <Image
              source={CARD_BACKGROUND_IMAGES[viewModel.tierName] ?? require('../../../assets/images/card1.webp')}
              style={{
                position: 'absolute',
                width: cardWidth,
                height: cardHeight,
                borderRadius: Math.max(24, cardWidth * 0.078),
              }}
              resizeMode="cover"
            />

            {/* Dark overlay for better contrast */}
            <View
              style={[
                StyleSheet.absoluteFillObject,
                {
                  backgroundColor: 'rgba(0,0,0,0.45)',
                  borderRadius: Math.max(24, cardWidth * 0.078),
                },
              ]}
            />

            {/* Card Content */}
            <View
              style={[
                styles.cardContent,
                {
                  paddingHorizontal: Math.max(22, cardWidth * 0.068),
                  paddingTop: Math.max(20, cardWidth * 0.062),
                  paddingBottom: Math.max(22, cardWidth * 0.072),
                },
              ]}
            >
              {/* Header with logo */}
              <View
                style={[
                  styles.cardHeader,
                  {
                    marginBottom: Math.max(8, cardWidth * 0.026),
                  },
                ]}
              >
                <View style={{ flex: 1 }} />
                <Image
                  source={require('../../../assets/images/logowhite.webp')}
                  style={[
                    styles.logoImage,
                    {
                      width: Math.round(cardWidth * 0.28),
                      height: Math.round(cardWidth * 0.22),
                    },
                  ]}
                  resizeMode="contain"
                />
                <View style={{ flex: 1 }} />
              </View>

              {/* QR Code Container with glassmorphism */}
              <View
                style={[
                  styles.qrSection,
                  {
                    marginTop: Math.max(4, cardWidth * 0.018),
                    marginBottom: Math.max(14, cardWidth * 0.04),
                  },
                ]}
              >
                <BlurView intensity={20} tint="light" style={styles.qrBlurContainer}>
                  <View style={styles.qrInnerContainer}>
                    {viewModel.showQrCode && viewModel.qrValue ? (
                      <QRCode
                        value={viewModel.qrValue}
                        size={qrSize}
                        color="#1A1A1A"
                        backgroundColor="transparent"
                      />
                    ) : (
                      <Text style={styles.placeholderQrText}>
                        {viewModel.qrPlaceholderText}
                      </Text>
                    )}
                  </View>
                </BlurView>
              </View>

              {/* Points / Leaves section */}
              <View
                style={[
                  styles.pointsBlock,
                  {
                    marginTop: Math.max(2, cardWidth * 0.01),
                    marginBottom: Math.max(14, cardWidth * 0.04),
                  },
                ]}
              >
                <Text style={styles.pointsLabel}>AVAILABLE LEAVES</Text>
                <Text style={[styles.pointsValue, { fontSize: pointsFontSize }]}>
                  {viewModel.availableLeavesText}
                </Text>
                <View style={styles.pointsMetaRow}>
                  <View style={styles.pointsMetaChip}>
                    <Text style={styles.pointsMetaText}>
                      {viewModel.pendingLeavesText}
                    </Text>
                  </View>
                  <View style={styles.pointsMetaChip}>
                    <Text style={styles.pointsMetaText}>Redeemable now</Text>
                  </View>
                </View>
                <Text style={styles.pendingPointsText}>
                  {viewModel.pendingExplanationText}
                </Text>
              </View>

              {/* Footer with user info and tier */}
              <View
                style={[
                  styles.footerRow,
                  {
                    marginTop: 'auto',
                  },
                ]}
              >
                <View style={styles.userInfoBlock}>
                  <Text style={styles.memberName}>{viewModel.memberName}</Text>
                  <Text style={styles.memberId}>{viewModel.joinDateText}</Text>
                </View>
                <LinearGradient
                  colors={viewModel.theme.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.tierBadge}
                >
                  <Text
                    style={[
                      styles.tierText,
                      { color: viewModel.theme.text },
                    ]}
                  >
                    {viewModel.tierName}
                  </Text>
                </LinearGradient>
              </View>
            </View>
          </View>

          {/* Swipe indicator */}
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
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.58,
    shadowRadius: 40,
    elevation: 24,
  },
  card: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoImage: {},
  qrSection: {
    alignSelf: 'center',
  },
  qrBlurContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  qrInnerContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 14,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    minHeight: 120,
  },
  placeholderQrText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  pointsBlock: {
    alignItems: 'center',
  },
  pointsLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  pointsValue: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: -1,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  pendingPointsText: {
    color: 'rgba(255, 255, 255, 0.78)',
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: '92%',
  },
  pointsMetaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  pointsMetaChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  pointsMetaText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfoBlock: {
    flex: 1,
    paddingRight: 12,
  },
  memberName: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 20,
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  memberId: {
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
    letterSpacing: 0.2,
    fontSize: 12,
    fontWeight: '500',
  },
  tierBadge: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  tierText: {
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 1,
  },
  swipeIndicator: {
    width: 46,
    height: 5,
    borderRadius: 999,
    marginTop: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
});
