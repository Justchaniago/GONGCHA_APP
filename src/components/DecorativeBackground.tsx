import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function DecorativeBackground() {
  return <View pointerEvents="none" style={styles.backgroundLayer} />;
}

const styles = StyleSheet.create({
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FAF8F5',
    zIndex: 0,
  },
});
