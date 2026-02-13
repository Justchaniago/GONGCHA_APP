import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Trophy } from 'lucide-react-native';
import DecorativeBackground from '../components/DecorativeBackground';
import ScreenFadeTransition from '../components/ScreenFadeTransition';

export default function RewardsScreen() {
  return (
    <ScreenFadeTransition>
      <View style={styles.root}>
        <DecorativeBackground />
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Trophy size={64} color="#B91C2F" />
            </View>
            <Text style={styles.title}>Rewards</Text>
            <Text style={styles.subtitle}>Coming Soon</Text>
            <Text style={styles.description}>
              Track your points, redeem exclusive rewards, and unlock special member benefits.
            </Text>
          </View>
        </SafeAreaView>
      </View>
    </ScreenFadeTransition>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFF8F0',
    position: 'relative',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    backgroundColor: '#FFF0E8',
    padding: 24,
    borderRadius: 40,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2A1F1F',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#B91C2F',
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: '#8C7B75',
    textAlign: 'center',
    lineHeight: 22,
  },
});
