import React, { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Easing, LayoutChangeEvent, useWindowDimensions } from 'react-native';
import { Home, Coffee, QrCode, Trophy, User } from 'lucide-react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemberCard } from '../context/MemberContext';

const BAR_HORIZONTAL_PADDING = 10;

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { showCard } = useMemberCard();
  const memberTriggerRef = useRef<View | null>(null);
  const { width: screenWidth } = useWindowDimensions();
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
  const isCompact = screenWidth < 370;
  const sideInset = screenWidth < 350 ? 14 : 24;
  const barHeight = isCompact ? 66 : 72;
  const activePillSize = isCompact ? 40 : 44;
  const triggerButtonSize = isCompact ? 54 : 60;
  const triggerLift = isCompact ? -12 : -16;
  const iconSize = isCompact ? 20 : 22;
  const navButtonHeight = isCompact ? 44 : 48;
  const dynamicBarPadding = isCompact ? 8 : BAR_HORIZONTAL_PADDING;
  const tabBarHideProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (pressScales.current.length !== state.routes.length) {
      pressScales.current = state.routes.map(() => new Animated.Value(1));
    }
  }, [state.routes]);

  const activeRouteKey = state.routes[state.index]?.key;
  const activeOptions = activeRouteKey ? descriptors[activeRouteKey]?.options : undefined;
  const shouldHideTabBar = Boolean((activeOptions as any)?.tabBarHidden);

  useEffect(() => {
    Animated.timing(tabBarHideProgress, {
      toValue: shouldHideTabBar ? 1 : 0,
      duration: shouldHideTabBar ? 220 : 260,
      easing: shouldHideTabBar ? Easing.in(Easing.cubic) : Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [shouldHideTabBar, tabBarHideProgress]);

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
  const innerWidth = Math.max(barWidth - dynamicBarPadding * 2, 0);
  const slotWidth = innerWidth > 0 ? innerWidth / tabCount : 0;
  const bottomOffset = Math.max(insets.bottom + (isCompact ? 2 : 4), isCompact ? 8 : 10);
  const hideTranslateY = barHeight + bottomOffset + Math.max(insets.bottom, 10) + 12;

  const pillTranslateX = activeIndex.interpolate({
    inputRange: state.routes.map((_, idx) => idx),
    outputRange: state.routes.map(
      (_, idx) => dynamicBarPadding + idx * slotWidth + (slotWidth - activePillSize) / 2
    ),
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      pointerEvents={shouldHideTabBar ? 'none' : 'auto'}
      style={[
        styles.bottomNav,
        {
          left: sideInset,
          right: sideInset,
          bottom: bottomOffset,
          height: barHeight,
          borderRadius: barHeight / 2,
          paddingHorizontal: dynamicBarPadding,
          opacity: tabBarHideProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0.94],
          }),
          transform: [
            {
              translateY: tabBarHideProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, hideTranslateY],
              }),
            },
          ],
        },
      ]}
      onLayout={onBarLayout}
    >
      {barWidth > 0 && !isQrFocused && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.activePill,
            {
              top: (barHeight - activePillSize) / 2,
              width: activePillSize,
              height: activePillSize,
              borderRadius: activePillSize / 2,
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
            style={
              isMemberCardTrigger
                ? [styles.memberTriggerSlot, { height: barHeight }]
                : [styles.navButton, { height: navButtonHeight }]
            }
            activeOpacity={0.92}
          >
            {isMemberCardTrigger ? (
              <Animated.View
                style={{
                  transform: [{ scale: pressScales.current[index] }],
                }}
              >
                <View
                  ref={memberTriggerRef}
                  collapsable={false}
                  style={[
                    styles.memberTriggerButton,
                    {
                      width: triggerButtonSize,
                      height: triggerButtonSize,
                      borderRadius: triggerButtonSize / 2,
                      transform: [{ translateY: triggerLift }],
                    },
                  ]}
                >
                  <IconComponent size={iconSize} color="#FFFFFF" strokeWidth={2.4} />
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
                  size={iconSize}
                  color="#FFFFFF"
                  strokeWidth={isFocused ? 2.4 : 2.1}
                />
              </Animated.View>
            )}
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    position: 'absolute',
    backgroundColor: '#2A1F1F',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#2A1F1F',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 10,
  },
  activePill: {
    position: 'absolute',
    backgroundColor: '#B91C2F',
    shadowColor: '#B91C2F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 6,
  },
  navButton: {
    flex: 1,
    height: 44,
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B91C2F',
    borderWidth: 4,
    borderColor: '#2A1F1F',
    shadowColor: '#B91C2F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
});
