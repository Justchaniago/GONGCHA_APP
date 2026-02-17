import React, { useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, TouchableOpacity, StyleSheet, Animated, Easing, LayoutChangeEvent, useWindowDimensions } from 'react-native';
import { Home, Coffee, QrCode, Trophy, User } from 'lucide-react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemberCard } from '../context/MemberContext';
import { useTheme } from '../context/ThemeContext';

const BAR_HORIZONTAL_PADDING = 10;

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  // Listen for custom bounce event
  const [externalHide, setExternalHide] = useState(false);
  const nav = useNavigation();
  useEffect(() => {
    const sub = nav.addListener('tabBarBounce', (e: any) => {
      setExternalHide(!!e?.data?.hide);
    });
    return () => sub && sub();
  }, [nav]);
  const { showCard } = useMemberCard();
  const { colors, activeMode } = useTheme();
  const isDark = activeMode === 'dark';

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
  
  // @ts-ignore
  const tabBarStyleDisplay = activeOptions?.tabBarStyle?.display;
  const shouldHideTabBar = tabBarStyleDisplay === 'none' || externalHide;

  useEffect(() => {
    Animated.spring(tabBarHideProgress, {
      toValue: shouldHideTabBar ? 1 : 0,
      stiffness: 180,
      damping: 18,
      mass: 0.7,
      velocity: 2,
      useNativeDriver: true,
    }).start();
  }, [shouldHideTabBar, tabBarHideProgress]);

  useEffect(() => {
    // Initial squash for anticipation
    activePillScale.setValue(0.92);
    
    Animated.parallel([
      // Bouncy slide animation dengan overshoot
      Animated.spring(activeIndex, {
        toValue: state.index,
        tension: 160,        // Lower = more bounce
        friction: 18,        // Lower = more oscillation
        velocity: 2,         // Initial velocity
        useNativeDriver: true,
      }),
      // Playful scale bounce
      Animated.spring(activePillScale, {
        toValue: 1,
        tension: 140,        // Bouncy scale
        friction: 16,        // More bounce on scale
        velocity: 1,
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

  // PRECISE CENTER CALCULATION - menghitung exact center per icon
  const pillTranslateX = activeIndex.interpolate({
    inputRange: state.routes.map((_, idx) => idx),
    outputRange: state.routes.map((_, idx) => {
      // Calculate exact center of each slot
      const slotCenter = dynamicBarPadding + (idx * slotWidth) + (slotWidth / 2);
      // Position pill at exact center
      const pillCenter = slotCenter - (activePillSize / 2);
      
      // Debug log to verify positioning
      // console.log(`Tab ${idx}: slotCenter=${slotCenter.toFixed(2)}, pillCenter=${pillCenter.toFixed(2)}`);
      
      return pillCenter;
    }),
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
          
          // --- REFINED THEME SYSTEM ---
          backgroundColor: colors.bottomNav.background,
          
          // Light Mode: Subtle border + strong shadow untuk depth & elegance
          // Dark Mode: Stronger border karena shadow kurang terlihat di dark
          borderWidth: isDark ? 1.5 : 0.5,
          borderColor: isDark 
            ? colors.border.default 
            : 'rgba(185, 28, 47, 0.12)', // Very subtle red tint
          
          // Enhanced shadow system
          shadowColor: isDark ? colors.shadow.color : colors.brand.primary,
          shadowOffset: { width: 0, height: isDark ? -4 : 8 },
          shadowOpacity: isDark ? 0.16 : 0.12,
          shadowRadius: isDark ? 20 : 28,
          elevation: isDark ? 10 : 12,
          
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
              
              backgroundColor: colors.bottomNav.active,
              
              // Active pill shadow - more prominent in light mode
              shadowColor: colors.brand.primary,
              shadowOffset: { width: 0, height: isDark ? 3 : 4 },
              shadowOpacity: isDark ? 0.24 : 0.28,
              shadowRadius: isDark ? 10 : 12,
              elevation: 6,
              
              transform: [{ translateX: pillTranslateX }, { scale: activePillScale }],
            },
          ]}
        />
      )}

      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const isMemberCardTrigger = route.name === 'QR';
        const IconComponent = iconMap[route.name] || Home;

        // ENHANCED ICON ANIMATIONS - Simplified & Safe!
        const prevIndex = index > 0 ? index - 1 : 0;
        const nextIndex = index < state.routes.length - 1 ? index + 1 : state.routes.length - 1;
        
        // Build safe inputRange (always increasing)
        const scaleInputRange = [];
        const scaleOutputRange = [];
        
        if (index > 0) {
          scaleInputRange.push(prevIndex);
          scaleOutputRange.push(1);
        }
        
        scaleInputRange.push(index);
        scaleOutputRange.push(1.12); // Active scale with overshoot
        
        if (index < state.routes.length - 1) {
          scaleInputRange.push(nextIndex);
          scaleOutputRange.push(1);
        }
        
        const iconScale = activeIndex.interpolate({
          inputRange: scaleInputRange,
          outputRange: scaleOutputRange,
          extrapolate: 'clamp',
        });

        const iconOpacity = activeIndex.interpolate({
          inputRange: scaleInputRange,
          outputRange: index === 0 || index === state.routes.length - 1
            ? [1, 0.48]
            : [0.48, 1, 0.48],
          extrapolate: 'clamp',
        });
        
        // Icon rotation untuk extra flair (subtle)
        const iconRotate = activeIndex.interpolate({
          inputRange: scaleInputRange,
          outputRange: index === 0 
            ? ['0deg', '2deg']
            : index === state.routes.length - 1
            ? ['-2deg', '0deg']
            : ['-2deg', '0deg', '2deg'],
          extrapolate: 'clamp',
        });

        const handlePressIn = () => {
          Animated.spring(pressScales.current[index], {
            toValue: 0.92,      // More squash
            tension: 200,       // Snappier
            friction: 20,
            useNativeDriver: true,
          }).start();
        };

        const handlePressOut = () => {
          Animated.spring(pressScales.current[index], {
            toValue: 1,
            tension: 180,       // Bouncier release
            friction: 16,       // More bounce
            velocity: 2,        // Pop out faster
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

        // Icon color logic - consistent for all icons
        // IMPORTANT: All icons should be outline/stroke version, not filled!
        const iconColor = isFocused 
          ? '#FFFFFF'  // Always white when active (on red pill)
          : colors.bottomNav.inactive;  // Theme color when inactive
        
        // Special handling for QR button
        const finalIconColor = isMemberCardTrigger 
          ? '#FFFFFF'  // QR button always white (on red bg)
          : iconColor;  // Other icons follow active/inactive logic
        
        // Ensure proper stroke width for visibility
        const iconStrokeWidth = isFocused ? 2.6 : 2.1;

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
                      
                      backgroundColor: colors.brand.primary,
                      
                      // QR Button Border - menyatu dengan tab bar
                      borderWidth: isDark ? 4 : 3,
                      borderColor: colors.bottomNav.background,
                      
                      // Enhanced shadow for QR button
                      shadowColor: colors.brand.primary,
                      shadowOffset: { width: 0, height: isDark ? 6 : 8 },
                      shadowOpacity: isDark ? 0.35 : 0.3,
                      shadowRadius: isDark ? 10 : 14,
                      elevation: 8,
                    },
                  ]}
                >
                  <IconComponent 
                    size={iconSize} 
                    color="#FFFFFF" 
                    strokeWidth={2.4}
                    fill="none"  // Force outline version
                  />
                </View>
              </Animated.View>
            ) : (
              <Animated.View
                style={{
                  transform: [
                    { scale: Animated.multiply(iconScale, pressScales.current[index]) },
                    { rotate: iconRotate }, // Subtle rotation for flair
                  ],
                  opacity: iconOpacity,
                }}
              >
                <IconComponent
                  size={iconSize}
                  color={finalIconColor}
                  strokeWidth={iconStrokeWidth}
                  fill="none"  // CRITICAL: Force outline/stroke version
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activePill: {
    position: 'absolute',
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
  },
});