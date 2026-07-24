import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createLocalLoyaltySummaryController } from '../composition/loyaltySummary';
import { useMember } from '../context/MemberContext';
import type { LocalStackParamList } from '../navigation/LocalAppNavigator';
import { useLocalLoyaltySummary } from '../presentation/loyaltySummary/useLocalLoyaltySummary';

function leavesLabel(value: number): string {
  return value === 1 ? 'Leaf' : 'Leaves';
}

export default function LocalMembershipStatusScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<LocalStackParamList>>();
  const { member } = useMember();
  const controller = useMemo(
    () => createLocalLoyaltySummaryController(),
    [],
  );
  const state = useLocalLoyaltySummary(
    controller,
    member?.uid ?? null,
  );
  const summary = state.phase === 'ready' ? state.summary : null;

  return (
    <SafeAreaView
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Kembali ke dashboard lokal"
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.eyebrow}>LOCAL CANDIDATE POLICY</Text>
          <Text style={styles.title}>Membership Status</Text>
        </View>
      </View>

      {state.phase === 'idle' || state.phase === 'loading' ? (
        <View style={styles.centerState}>
          <ActivityIndicator color="#C8102E" />
          <Text style={styles.stateText}>
            Memuat status membership dari backend...
          </Text>
        </View>
      ) : state.phase === 'error' ? (
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>
            Membership status gagal dimuat
          </Text>
          <Text style={styles.stateText}>
            Data tidak diganti dengan nilai nol. Periksa local stack lalu coba
            lagi.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => void controller.retry()}
          >
            <Text style={styles.primaryButtonText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      ) : summary ? (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={state.refreshing}
              onRefresh={() => void controller.refresh()}
              tintColor="#C8102E"
            />
          }
        >
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>TIER SAAT INI</Text>
            <Text style={styles.tierName}>{summary.tier.displayName}</Text>
            <Text style={styles.policyVersion}>
              {summary.policyVersion}
            </Text>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${summary.tier.progressPercent}%` },
                ]}
              />
            </View>
            <View style={styles.progressMeta}>
              <Text style={styles.progressValue}>
                {summary.tier.progressPercent}%
              </Text>
              <Text style={styles.progressTarget}>
                {summary.tier.nextDisplayName
                  ? `${summary.tier.remaining} ${leavesLabel(
                      summary.tier.remaining,
                    )} menuju ${summary.tier.nextDisplayName}`
                  : 'Tier kandidat tertinggi tercapai'}
              </Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>
                {summary.availableLeaves.toLocaleString('id-ID')}
              </Text>
              <Text style={styles.metricLabel}>
                Available {leavesLabel(summary.availableLeaves)}
              </Text>
              <Text style={styles.metricHint}>Dapat digunakan sekarang</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>
                {summary.qualifyingLeaves.toLocaleString('id-ID')}
              </Text>
              <Text style={styles.metricLabel}>
                Qualifying {leavesLabel(summary.qualifyingLeaves)}
              </Text>
              <Text style={styles.metricHint}>Menentukan tier kandidat</Text>
            </View>
          </View>

          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Threshold tier saat ini</Text>
              <Text style={styles.detailValue}>
                {summary.tier.currentThreshold.toLocaleString('id-ID')}{' '}
                {leavesLabel(summary.tier.currentThreshold)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Threshold berikutnya</Text>
              <Text style={styles.detailValue}>
                {summary.tier.nextThreshold === null
                  ? 'Tidak ada'
                  : `${summary.tier.nextThreshold.toLocaleString('id-ID')} ${leavesLabel(
                      summary.tier.nextThreshold,
                    )}`}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Pending Leaves</Text>
              <Text style={styles.unsupportedValue}>Belum didukung</Text>
            </View>
          </View>

          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>
              Benefit belum dikonfigurasi
            </Text>
            <Text style={styles.noticeText}>
              Screen lokal ini hanya memvalidasi tier dan Leaves dari backend.
              Benefit kandidat belum menjadi entitlement.
            </Text>
          </View>

          {state.error ? (
            <Text style={styles.refreshError}>
              Refresh gagal; data sebelumnya tetap ditampilkan.
            </Text>
          ) : null}

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Buka loyalty activity dari membership status"
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('LocalLoyaltyActivity')}
          >
            <Text style={styles.secondaryButtonText}>
              Lihat Loyalty Activity
            </Text>
          </TouchableOpacity>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFDFB',
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    marginRight: 12,
  },
  backText: {
    color: '#1A1A1A',
    fontSize: 32,
    lineHeight: 34,
  },
  eyebrow: {
    color: '#C8102E',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  title: {
    color: '#1A1A1A',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 2,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  stateText: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 12,
  },
  errorTitle: {
    color: '#B91C1C',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#C8102E',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 18,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  content: {
    paddingBottom: 28,
  },
  heroCard: {
    backgroundColor: '#8E1027',
    borderRadius: 22,
    padding: 22,
    marginBottom: 16,
  },
  heroLabel: {
    color: '#FDC7D1',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  tierName: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    marginTop: 6,
  },
  policyVersion: {
    color: '#F9A8B8',
    fontSize: 10,
    marginTop: 2,
    marginBottom: 22,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#6D0D20',
    overflow: 'hidden',
  },
  progressFill: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  progressMeta: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  progressValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  progressTarget: {
    flex: 1,
    color: '#FDE8EC',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'right',
    marginLeft: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  metricValue: {
    color: '#1A1A1A',
    fontSize: 25,
    fontWeight: '900',
  },
  metricLabel: {
    color: '#4B5563',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
  },
  metricHint: {
    color: '#9CA3AF',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 6,
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
  },
  detailLabel: {
    flex: 1,
    color: '#6B7280',
    fontSize: 12,
  },
  detailValue: {
    color: '#1A1A1A',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
    marginLeft: 12,
  },
  unsupportedValue: {
    color: '#8A5A16',
    fontSize: 12,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  noticeCard: {
    backgroundColor: '#FFF7E6',
    borderRadius: 16,
    padding: 16,
  },
  noticeTitle: {
    color: '#7C4A03',
    fontSize: 13,
    fontWeight: '800',
  },
  noticeText: {
    color: '#8A5A16',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  refreshError: {
    color: '#B91C1C',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#C8102E',
    borderRadius: 14,
    borderWidth: 1.5,
    minHeight: 50,
    justifyContent: 'center',
    marginTop: 16,
  },
  secondaryButtonText: {
    color: '#C8102E',
    fontSize: 14,
    fontWeight: '800',
  },
});
