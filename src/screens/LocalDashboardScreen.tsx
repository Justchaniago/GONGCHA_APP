import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { authCommands } from '../composition/auth';
import { localLoyaltySummaryController } from '../composition/loyaltySummary';
import { useMember } from '../context/MemberContext';
import type { LocalStackParamList } from '../navigation/LocalAppNavigator';
import { useLocalLoyaltySummary } from '../presentation/loyaltySummary/useLocalLoyaltySummary';

function leavesLabel(value: number): string {
  return value === 1 ? 'Leaf' : 'Leaves';
}

export default function LocalDashboardScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<LocalStackParamList>>();
  const { member } = useMember();
  const summaryState = useLocalLoyaltySummary(
    localLoyaltySummaryController,
    member?.uid ?? null,
  );
  const summary =
    summaryState.phase === 'ready' ? summaryState.summary : null;
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
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
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

        <View style={styles.summaryCard}>
          <Text style={styles.summaryEyebrow}>CANDIDATE LOYALTY POLICY</Text>
          {summaryState.phase === 'idle' ||
          summaryState.phase === 'loading' ? (
            <View style={styles.summaryLoading}>
              <ActivityIndicator color="#C8102E" />
              <Text style={styles.summaryMuted}>Memuat Leaves dari backend...</Text>
            </View>
          ) : summaryState.phase === 'error' ? (
            <View>
              <Text style={styles.summaryError}>
                Loyalty summary gagal dimuat.
              </Text>
              <TouchableOpacity
                style={styles.summaryRetry}
                onPress={() =>
                  void localLoyaltySummaryController.retry()
                }
              >
                <Text style={styles.summaryRetryText}>Coba Lagi</Text>
              </TouchableOpacity>
            </View>
          ) : summary ? (
            <>
              <Text style={styles.tierName}>
                {summary.tier.displayName}
              </Text>
              <Text style={styles.summaryPolicy}>
                {summary.policyVersion}
              </Text>
              <View style={styles.leavesRow}>
                <View style={styles.leavesMetric}>
                  <Text style={styles.leavesValue}>
                    {summary.availableLeaves}
                  </Text>
                  <Text style={styles.leavesCaption}>
                    Available{' '}
                    {leavesLabel(summary.availableLeaves)}
                  </Text>
                </View>
                <View style={styles.leavesMetric}>
                  <Text style={styles.leavesValue}>
                    {summary.qualifyingLeaves}
                  </Text>
                  <Text style={styles.leavesCaption}>
                    Qualifying{' '}
                    {leavesLabel(summary.qualifyingLeaves)}
                  </Text>
                </View>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${summary.tier.progressPercent}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {summary.tier.nextDisplayName
                  ? `${summary.tier.remaining} ${leavesLabel(
                      summary.tier.remaining,
                    )} menuju ${summary.tier.nextDisplayName}`
                  : 'Tier kandidat tertinggi tercapai'}
              </Text>
              <Text style={styles.pendingText}>
                Pending Leaves belum tersedia.
              </Text>
              {summaryState.error ? (
                <Text style={styles.summaryError}>
                  Refresh gagal; data sebelumnya tetap ditampilkan.
                </Text>
              ) : null}
              <TouchableOpacity
                style={styles.summaryRefresh}
                disabled={summaryState.refreshing}
                onPress={() =>
                  void localLoyaltySummaryController.refresh()
                }
              >
                {summaryState.refreshing ? (
                  <ActivityIndicator color="#C8102E" />
                ) : (
                  <Text style={styles.summaryRefreshText}>
                    Refresh Loyalty Summary
                  </Text>
                )}
              </TouchableOpacity>
            </>
          ) : null}
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Loyalty activity siap diuji</Text>
          <Text style={styles.noticeText}>
            Riwayat dibaca langsung dari FastAPI. Member baru akan menampilkan
            empty state sebelum demo activity dibuat oleh backend.
          </Text>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Buka loyalty activity lokal"
          style={styles.activityButton}
          onPress={() => navigation.navigate('LocalLoyaltyActivity')}
        >
          <Text style={styles.activityButtonText}>
            Buka Loyalty Activity
          </Text>
        </TouchableOpacity>
      </ScrollView>

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
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 24,
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
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  summaryEyebrow: {
    color: '#C8102E',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  summaryLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
  },
  summaryMuted: {
    color: '#6B7280',
    fontSize: 13,
    marginLeft: 10,
  },
  tierName: {
    color: '#1A1A1A',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },
  summaryPolicy: {
    color: '#9CA3AF',
    fontSize: 10,
    marginBottom: 16,
  },
  leavesRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  leavesMetric: {
    flex: 1,
  },
  leavesValue: {
    color: '#1A1A1A',
    fontSize: 26,
    fontWeight: '800',
  },
  leavesCaption: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 2,
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#F3E8EA',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    backgroundColor: '#C8102E',
    borderRadius: 999,
  },
  progressText: {
    color: '#4B5563',
    fontSize: 12,
    marginTop: 8,
  },
  pendingText: {
    color: '#8A5A16',
    fontSize: 12,
    marginTop: 8,
  },
  summaryError: {
    color: '#B91C1C',
    fontSize: 12,
    marginTop: 8,
  },
  summaryRetry: {
    alignItems: 'center',
    backgroundColor: '#C8102E',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 12,
  },
  summaryRetryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  summaryRefresh: {
    alignItems: 'center',
    borderColor: '#C8102E',
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
    marginTop: 12,
  },
  summaryRefreshText: {
    color: '#C8102E',
    fontSize: 12,
    fontWeight: '800',
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
  activityButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    backgroundColor: '#C8102E',
    borderRadius: 14,
    marginTop: 16,
  },
  activityButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
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
