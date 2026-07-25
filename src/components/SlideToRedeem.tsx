import React, { useRef, useState, useEffect } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  View,
  LayoutChangeEvent,
} from 'react-native';
import { ChevronsRight, Check, Gift } from 'lucide-react-native';

interface SlideToRedeemProps {
  onUnlock: () => void;
  label?: string;
  disabled?: boolean;
}

export default function SlideToRedeem({
  onUnlock,
  label = 'Geser untuk Tukar',
  disabled = false,
}: SlideToRedeemProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [unlocked, setUnlocked] = useState(false);

  const translateX = useRef(new Animated.Value(0)).current;
  const KNOB_SIZE = 52;
  const MARGIN = 4;
  const maxSlide = Math.max(1, trackWidth - KNOB_SIZE - MARGIN * 2);

  // Chevron pulse animation
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!unlocked && !disabled) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 6,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [unlocked, disabled, pulseAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled && !unlocked,
      onStartShouldSetPanResponderCapture: () => !disabled && !unlocked,
      onMoveShouldSetPanResponder: () => !disabled && !unlocked,
      onMoveShouldSetPanResponderCapture: () => !disabled && !unlocked,
      onPanResponderGrant: () => {},
      onPanResponderMove: (_, gestureState) => {
        if (disabled || unlocked) return;
        const currentMax = Math.max(1, trackWidth - KNOB_SIZE - MARGIN * 2);
        const newX = Math.max(0, Math.min(gestureState.dx, currentMax));
        translateX.setValue(newX);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (disabled || unlocked) return;
        const currentMax = Math.max(1, trackWidth - KNOB_SIZE - MARGIN * 2);
        if (gestureState.dx >= currentMax * 0.75) {
          // Trigger Unlock!
          Animated.timing(translateX, {
            toValue: currentMax,
            duration: 180,
            useNativeDriver: false,
          }).start(() => {
            setUnlocked(true);
            onUnlock();
          });
        } else {
          // Snap back
          Animated.spring(translateX, {
            toValue: 0,
            tension: 50,
            friction: 7,
            useNativeDriver: false,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  const handleLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0) {
      setTrackWidth(width);
    }
  };

  const textOpacity = translateX.interpolate({
    inputRange: [0, Math.max(1, maxSlide * 0.5)],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View
      style={[
        styles.track,
        disabled && styles.trackDisabled,
        unlocked && styles.trackUnlocked,
      ]}
      onLayout={handleLayout}
    >
      {/* Active Fill Track */}
      <Animated.View
        style={[
          styles.fillTrack,
          unlocked && styles.fillTrackUnlocked,
          {
            width: translateX.interpolate({
              inputRange: [0, Math.max(1, maxSlide)],
              outputRange: [KNOB_SIZE + MARGIN * 2, trackWidth || 100],
              extrapolate: 'clamp',
            }),
          },
        ]}
      />

      {/* Label Text & Pulsing Arrows */}
      <Animated.View style={[styles.labelContainer, { opacity: textOpacity }]}>
        <Text style={[styles.label, disabled && styles.labelDisabled]}>
          {disabled ? 'Poin Tidak Cukup' : label}
        </Text>
        {!disabled && !unlocked && (
          <Animated.View style={{ transform: [{ translateX: pulseAnim }] }}>
            <ChevronsRight size={18} color="rgba(255,255,255,0.7)" />
          </Animated.View>
        )}
      </Animated.View>

      {/* Unlocked Message */}
      {unlocked && (
        <View style={styles.unlockedTextContainer}>
          <Text style={styles.unlockedText}>BERHASIL DITUKAR!</Text>
        </View>
      )}

      {/* Draggable Knob */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.knob,
          unlocked && styles.knobUnlocked,
          disabled && styles.knobDisabled,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        {unlocked ? (
          <Check size={24} color="#166534" />
        ) : disabled ? (
          <Gift size={22} color="#9CA3AF" />
        ) : (
          <ChevronsRight size={24} color="#B91C2F" />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2A1F1F',
    justifyContent: 'center',
    padding: 4,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#3D2F2F',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  trackDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  trackUnlocked: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  fillTrack: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 30,
    backgroundColor: '#B91C2F',
  },
  fillTrackUnlocked: {
    backgroundColor: '#16A34A',
  },
  labelContainer: {
    position: 'absolute',
    left: 60,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    zIndex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  labelDisabled: {
    color: '#9CA3AF',
  },
  unlockedTextContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  unlockedText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#166534',
    letterSpacing: 1,
  },
  knob: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  knobDisabled: {
    backgroundColor: '#E5E7EB',
  },
  knobUnlocked: {
    backgroundColor: '#FFFFFF',
  },
});
