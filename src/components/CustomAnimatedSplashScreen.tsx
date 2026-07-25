import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

type CustomAnimatedSplashScreenProps = {
  onFinish: () => void;
};

export default function CustomAnimatedSplashScreen({ onFinish }: CustomAnimatedSplashScreenProps) {
  const { width } = useWindowDimensions();

  // Animation values
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(15)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const containerScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Entrance: Logo spring up & fade in
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 90,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Tagline text slide up
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // 3. Exit sequence after 1.25 seconds
    const exitTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(containerOpacity, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),

        Animated.timing(containerScale, {
          toValue: 1.06,
          duration: 450,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => {
        onFinish();
      });
    }, 1400);

    return () => clearTimeout(exitTimer);
  }, [onFinish, logoScale, logoOpacity, textOpacity, textTranslateY, containerOpacity, containerScale]);

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: containerOpacity,
          transform: [{ scale: containerScale }],
        },
      ]}
    >
      <StatusBar style="light" translucent backgroundColor="transparent" />

      {/* BACKGROUND DECORATIVE LEAF PATTERN */}
      <View style={styles.centerContainer}>
        {/* LOGO */}
        <Animated.View
          style={[
            styles.logoWrap,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Image
            source={require('../../assets/images/logowhite.webp')}
            style={{ width: width * 0.55, height: 90 }}
            resizeMode="contain"
          />
        </Animated.View>

        {/* TAGLINE */}
        <Animated.View
          style={{
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
            alignItems: 'center',
            marginTop: 18,
          }}
        >
          <View style={styles.dividerWrap}>
            <View style={styles.goldLine} />
            <Text style={styles.tagline}>貢 茶 · TRIBUTE TO TEA</Text>
            <View style={styles.goldLine} />
          </View>
        </Animated.View>
      </View>

      {/* BOTTOM FOOTER */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Gong Cha Indonesia</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#B91C2F',
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  goldLine: {
    width: 24,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  tagline: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2.5,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1.5,
  },
});
