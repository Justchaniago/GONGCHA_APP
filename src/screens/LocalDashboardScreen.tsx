import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authCommands } from '../composition/auth';
import { useMember } from '../context/MemberContext';

export default function LocalDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { member } = useMember();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await authCommands.logout();
    } catch {
      setLoggingOut(false);
      Alert.alert('Logout gagal', 'Coba lagi sebentar.');
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>LOCAL EMULATOR</Text>
        </View>
        <Text style={styles.eyebrow}>WELCOME TO GONG CHA</Text>
        <Text style={styles.title}>Hai, {member?.fullName ?? 'Member'}!</Text>
        <Text style={styles.subtitle}>
          Alur akun lokal berhasil dari registrasi sampai penyimpanan profil.
        </Text>

        <View style={styles.statusCard}>
          <View style={styles.statusIcon}>
            <Text style={styles.statusIconText}>✓</Text>
          </View>
          <View style={styles.statusCopy}>
            <Text style={styles.statusTitle}>Profil siap digunakan</Text>
            <Text style={styles.statusText}>
              FastAPI mengembalikan profil lengkap untuk sesi ini.
            </Text>
          </View>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Data loyalty belum ditampilkan</Text>
          <Text style={styles.noticeText}>
            Poin, reward, dan transaksi akan muncul setelah API domain terkait
            tersedia. Dashboard lokal ini tidak membuat data contoh.
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.logoutButton, loggingOut && styles.disabled]}
        onPress={handleLogout}
        disabled={loggingOut}
      >
        {loggingOut ? (
          <ActivityIndicator color="#C8102E" />
        ) : (
          <Text style={styles.logoutText}>Logout dan Ulangi Tes</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFDFB',
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FDE8EC',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 24,
  },
  badgeText: {
    color: '#C8102E',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  eyebrow: {
    color: '#C8102E',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  title: {
    color: '#1A1A1A',
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 12,
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 32,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  statusIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#DCFCE7',
    marginRight: 14,
  },
  statusIconText: {
    color: '#15803D',
    fontSize: 22,
    fontWeight: '800',
  },
  statusCopy: {
    flex: 1,
  },
  statusTitle: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusText: {
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 19,
  },
  notice: {
    backgroundColor: '#FFF7E6',
    borderRadius: 14,
    padding: 16,
  },
  noticeTitle: {
    color: '#7C4A03',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  noticeText: {
    color: '#8A5A16',
    fontSize: 13,
    lineHeight: 20,
  },
  logoutButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    borderColor: '#C8102E',
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  disabled: {
    opacity: 0.55,
  },
  logoutText: {
    color: '#C8102E',
    fontSize: 15,
    fontWeight: '700',
  },
});
