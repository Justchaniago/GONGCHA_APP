import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

export default function DecorativeBackground() {
  return (
    <View pointerEvents="none" style={styles.backgroundLayer}>
      <Image source={require('../../assets/images/abstract1.png')} style={styles.blobTopRight} />
      <Image source={require('../../assets/images/abstract2.png')} style={styles.blobBottomLeft} />

      <Image source={require('../../assets/images/fewleaf.png')} style={styles.doodleFewLeaf} />
      <Image source={require('../../assets/images/leaf2.png')} style={styles.doodleLeaf2} />
      <Image source={require('../../assets/images/boba.png')} style={styles.doodleBoba} />
      <Image source={require('../../assets/images/leaf1.png')} style={styles.doodleLeaf1} />
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  blobTopRight: {
    position: 'absolute',
    top: -64,
    right: -96,
    width: 360,
    height: 360,
    opacity: 0.46,
    transform: [{ rotate: '8deg' }],
  },
  blobBottomLeft: {
    position: 'absolute',
    bottom: 24,
    left: -116,
    width: 338,
    height: 338,
    opacity: 0.25,
  },
  doodleFewLeaf: {
    position: 'absolute',
    top: 176,
    left: 10,
    width: 36,
    height: 64,
    opacity: 0.48,
  },
  doodleLeaf2: {
    position: 'absolute',
    top: 420,
    right: 14,
    width: 52,
    height: 32,
    opacity: 0.52,
    transform: [{ rotate: '-12deg' }],
  },
  doodleBoba: {
    position: 'absolute',
    top: 638,
    right: 24,
    width: 34,
    height: 34,
    opacity: 0.55,
  },
  doodleLeaf1: {
    position: 'absolute',
    top: 760,
    left: 22,
    width: 44,
    height: 68,
    opacity: 0.42,
    transform: [{ rotate: '6deg' }],
  },
});
