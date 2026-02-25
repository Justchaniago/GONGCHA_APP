import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, DimensionValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colorTokens'; // Mengambil warna background statis kita

interface SkeletonLoaderProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: any;
}

export default function SkeletonLoader({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}: SkeletonLoaderProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animasi loop tak terbatas yang berjalan dari 0 ke 1
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1200, // Kecepatan efek shimmer menyapu
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    return () => pulseAnimation.stop();
  }, [animatedValue]);

  // Interpolasi nilai dari 0 ke 1 menjadi gerakan translasi kiri ke kanan
  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 300], // Jarak sapuan cahaya
  });

  return (
    <View
      style={[
        styles.skeletonContainer,
        {
          width,
          height,
          borderRadius,
          // Warna abu-abu lembut sebagai dasar
          backgroundColor: colors.border.light, 
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          // Gradien: transparan -> putih terang -> transparan
          colors={['transparent', 'rgba(255, 255, 255, 0.6)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonContainer: {
    overflow: 'hidden', // Agar cahaya shimmer tidak keluar dari kotak
  },
});