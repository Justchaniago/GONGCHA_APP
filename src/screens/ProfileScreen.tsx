import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { User, LogOut, ChevronRight, RotateCcw, Gift } from 'lucide-react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import DecorativeBackground from '../components/DecorativeBackground';
import ScreenFadeTransition from '../components/ScreenFadeTransition';
import MockBackend from '../services/MockBackend';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const [isResetting, setIsResetting] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleLogout = () => {
    Alert.alert('Log out?', 'Kamu akan keluar dari sesi saat ini.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Welcome' }],
            })
          );
        },
      },
    ]);
  };

  const handleResetLoyaltyData = () => {
    Alert.alert('Reset loyalty data?', 'Semua data points/transaksi lokal akan dihapus untuk mode debug.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          setIsResetting(true);
          try {
            await MockBackend.resetData();
            Alert.alert('Reset complete', 'Data loyalty lokal berhasil direset.');
            navigation.navigate('Home');
          } finally {
            setIsResetting(false);
          }
        },
      },
    ]);
  };

  const handleSimulateBigPurchase = async () => {
    if (isSimulating) return;
    setIsSimulating(true);
    try {
      const updatedUser = await MockBackend.addTransaction(500000);
      const earned = Math.floor(500000 / MockBackend.POINT_CONVERSION);
      Alert.alert(
        'Debug Transaction Added',
        `+Rp500.000 berhasil disimulasikan.\n+${earned} points earned.\nTier: ${updatedUser.tier}`
      );
      navigation.navigate('Home');
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <ScreenFadeTransition>
      <View style={styles.root}>
        <DecorativeBackground />
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <User size={64} color="#B91C2F" />
            </View>
            <Text style={styles.title}>Profile</Text>
            <Text style={styles.subtitle}>Coming Soon</Text>
            <Text style={styles.description}>
              Manage your account, preferences, order history, and membership details.
            </Text>

            <View style={styles.actionsCard}>
              <TouchableOpacity style={styles.actionRow} activeOpacity={0.8}>
                <Text style={styles.actionText}>Account Settings</Text>
                <ChevronRight size={18} color="#8C7B75" />
              </TouchableOpacity>

              <View style={styles.rowDivider} />

              <TouchableOpacity style={styles.actionRow} activeOpacity={0.8}>
                <Text style={styles.actionText}>Order History</Text>
                <ChevronRight size={18} color="#8C7B75" />
              </TouchableOpacity>

              <View style={styles.rowDivider} />

              <TouchableOpacity
                style={styles.actionRow}
                activeOpacity={0.8}
                onPress={handleSimulateBigPurchase}
                disabled={isSimulating || isResetting}
              >
                <View style={styles.logoutLeft}>
                  <Gift size={18} color="#2563EB" />
                  <Text style={styles.debugText}>
                    {isSimulating ? 'Simulating purchase...' : 'Simulate +Rp500.000 Purchase'}
                  </Text>
                </View>
                <ChevronRight size={18} color="#2563EB" />
              </TouchableOpacity>

              <View style={styles.rowDivider} />

              <TouchableOpacity
                style={styles.actionRow}
                activeOpacity={0.8}
                onPress={handleResetLoyaltyData}
                disabled={isResetting || isSimulating}
              >
                <View style={styles.logoutLeft}>
                  <RotateCcw size={18} color="#D97706" />
                  <Text style={styles.resetText}>{isResetting ? 'Resetting...' : 'Reset Loyalty Data (Debug)'}</Text>
                </View>
                <ChevronRight size={18} color="#D97706" />
              </TouchableOpacity>

              <View style={styles.rowDivider} />

              <TouchableOpacity style={styles.actionRow} activeOpacity={0.8} onPress={handleLogout}>
                <View style={styles.logoutLeft}>
                  <LogOut size={18} color="#B91C2F" />
                  <Text style={styles.logoutText}>Log out</Text>
                </View>
                <ChevronRight size={18} color="#B91C2F" />
              </TouchableOpacity>
            </View>
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
    marginBottom: 22,
  },
  actionsCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0E6DA',
    overflow: 'hidden',
    shadowColor: '#2A1F1F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  actionRow: {
    minHeight: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2A1F1F',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#F6EFE5',
  },
  logoutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#B91C2F',
  },
  resetText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#D97706',
  },
  debugText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2563EB',
  },
});
