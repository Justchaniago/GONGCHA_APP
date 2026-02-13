import React, { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Easing, LayoutChangeEvent } from 'react-native';
import { Home, Coffee, QrCode, Trophy, User } from 'lucide-react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemberCard } from '../context/MemberContext';

const BAR_HORIZONTAL_PADDING = 10;
const ACTIVE_PILL_SIZE = 44;

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { showCard } = useMemberCard();
  const memberTriggerRef = useRef<View | null>(null);
  const isQrFocused = state.routes[state.index]?.name === 'QR';
  const iconMap: Record<string, React.ComponentType<any>> = {
    Home: Home,
    Menu: Coffee,
    QR: QrCode,
    Rewards: Trophy,
    Profile: User,
  };

  const activeIndex = useRef(new Animated.Value(state.index)).current;
  const activePillScale = useRef(new Animated.Value(1)).current;
  const [barWidth, setBarWidth] = useState(0);
  const pressScales = useRef(state.routes.map(() => new Animated.Value(1)));
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (pressScales.current.length !== state.routes.length) {
      pressScales.current = state.routes.map(() => new Animated.Value(1));
    }
  }, [state.routes]);

  useEffect(() => {
    activePillScale.setValue(0.985);
    Animated.parallel([
      Animated.spring(activeIndex, {
        toValue: state.index,
        tension: 190,
        friction: 22,
        useNativeDriver: true,
      }),
      Animated.spring(activePillScale, {
        toValue: 1,
        tension: 185,
        friction: 19,
        useNativeDriver: true,
      }),
    ]).start();
  }, [activeIndex, activePillScale, state.index]);

  const onBarLayout = (event: LayoutChangeEvent) => {
    setBarWidth(event.nativeEvent.layout.width);
  };

  const tabCount = state.routes.length || 1;
  const innerWidth = Math.max(barWidth - BAR_HORIZONTAL_PADDING * 2, 0);
  const slotWidth = innerWidth > 0 ? innerWidth / tabCount : 0;
  const bottomOffset = Math.max(insets.bottom + 10, 20);

  const pillTranslateX = activeIndex.interpolate({
    inputRange: state.routes.map((_, idx) => idx),
    outputRange: state.routes.map(
      (_, idx) => BAR_HORIZONTAL_PADDING + idx * slotWidth + (slotWidth - ACTIVE_PILL_SIZE) / 2
    ),
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.bottomNav, { bottom: bottomOffset }]} onLayout={onBarLayout}>
      {barWidth > 0 && !isQrFocused && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.activePill,
            {
              transform: [{ translateX: pillTranslateX }, { scale: activePillScale }],
            },
          ]}
        />
      )}

      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const isMemberCardTrigger = route.name === 'QR';
        const IconComponent = iconMap[route.name] || Home;

        const iconScale = activeIndex.interpolate({
          inputRange: [index - 1, index, index + 1],
          outputRange: [1, 1.05, 1],
          extrapolate: 'clamp',
        });

        const iconOpacity = activeIndex.interpolate({
          inputRange: [index - 1, index, index + 1],
          outputRange: [0.58, 1, 0.58],
          extrapolate: 'clamp',
        });

        const handlePressIn = () => {
          Animated.timing(pressScales.current[index], {
            toValue: 0.97,
            duration: 60,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start();
        };

        const handlePressOut = () => {
          Animated.spring(pressScales.current[index], {
            toValue: 1,
            tension: 240,
            friction: 22,
            useNativeDriver: true,
          }).start();
        };

        const onPress = () => {
          if (isMemberCardTrigger) {
            if (memberTriggerRef.current) {
              memberTriggerRef.current.measureInWindow((x, y, width, height) => {
                showCard({
                  x: x + width / 2,
                  y: y + height / 2,
                  size: Math.max(width, height),
                });
              });
            } else {
              showCard();
            }
            return;
          }

          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={isMemberCardTrigger ? styles.memberTriggerSlot : styles.navButton}
            activeOpacity={0.92}
          >
            {isMemberCardTrigger ? (
              <Animated.View
                style={{
                  transform: [{ scale: pressScales.current[index] }],
                }}
              >
                <View ref={memberTriggerRef} collapsable={false} style={styles.memberTriggerButton}>
                  <IconComponent size={22} color="#FFFFFF" strokeWidth={2.4} />
                </View>
              </Animated.View>
            ) : (
              <Animated.View
                style={{
                  transform: [{ scale: Animated.multiply(iconScale, pressScales.current[index]) }],
                  opacity: iconOpacity,
                }}
              >
                <IconComponent
                  size={22}
                  color="#FFFFFF"
                  strokeWidth={isFocused ? 2.4 : 2.1}
                />
              </Animated.View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    position: 'absolute',
    left: 24,
    right: 24,
    backgroundColor: '#2A1F1F',
    height: 72,
    borderRadius: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: BAR_HORIZONTAL_PADDING,
    shadowColor: '#2A1F1F',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 10,
  },
  activePill: {
    position: 'absolute',
    top: 14,
    width: ACTIVE_PILL_SIZE,
    height: ACTIVE_PILL_SIZE,
    borderRadius: 22,
    backgroundColor: '#B91C2F',
    shadowColor: '#B91C2F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 6,
  },
  navButton: {
    flex: 1,
    height: 48,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  memberTriggerSlot: {
    flex: 1,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  memberTriggerButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B91C2F',
    borderWidth: 4,
    borderColor: '#2A1F1F',
    transform: [{ translateY: -16 }],
    shadowColor: '#B91C2F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
});
