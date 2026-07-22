import React, { useCallback, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigationState } from '@react-navigation/native';

type ScreenFadeTransitionProps = {
  children: React.ReactNode;
};

let previousTabIndex = 0;

export default function ScreenFadeTransition({ children }: ScreenFadeTransitionProps) {
  const opacity = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const currentTabIndex = useNavigationState((state) => state.index);

  useFocusEffect(
    useCallback(() => {
      if (currentTabIndex === previousTabIndex) {
        // Returning from a stack screen — no tab change, skip animation
        opacity.setValue(1);
        translateX.setValue(0);
        return;
      }

      const direction = currentTabIndex > previousTabIndex ? 1 : -1;
      previousTabIndex = currentTabIndex;

      opacity.setValue(0.94);
      translateX.setValue(26 * direction);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 240,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
        Animated.spring(translateX, {
          toValue: 0,
          tension: 185,
          friction: 22,
          useNativeDriver: true,
        }),
      ]).start();

      return () => {
        opacity.setValue(1);
        translateX.setValue(0);
      };
    }, [currentTabIndex, opacity, translateX])
  );

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateX }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
