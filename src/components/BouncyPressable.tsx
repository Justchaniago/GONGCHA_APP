import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';

type BouncyPressableProps = {
  children: React.ReactNode;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  pressScale?: number;
};

export default function BouncyPressable({
  children,
  disabled = false,
  onPress,
  style,
  pressScale = 0.985,
}: BouncyPressableProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (toValue: number, speed: number, bounciness: number) => {
    Animated.spring(scale, {
      toValue,
      speed,
      bounciness,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [{ scale }],
          opacity: disabled ? 0.6 : 1,
        },
      ]}
    >
      <Pressable
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => animateTo(pressScale, 26, 2)}
        onPressOut={() => animateTo(1, 20, 6)}
        style={{ flex: 1 }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
