import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
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

import { buildLocalHomeLoyaltyViewModel } from '../application/homeLoyalty/HomeLoyaltyViewModel';
import LocalMemberCardModal from '../components/LocalMemberCardModal';
import { authCommands } from '../composition/auth';
import { localLoyaltySummaryController } from '../composition/loyaltySummary';
import { useMember } from '../context/MemberContext';
import type { LocalStackParamList } from '../navigation/LocalAppNavigator';
import {
  HomeMembershipRegion,
  HomeWalletRegion,
} from '../presentation/homeLoyalty/HomeLoyaltyWalletView';
import { useLocalLoyaltySummary } from '../presentation/loyaltySummary/useLocalLoyaltySummary';

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
  const loyaltyModel = useMemo(
    () => (summary ? buildLocalHomeLoyaltyViewModel(summary) : null),
    [summary],
  );
  const [loggingOut, setLoggingOut] = useState(false);
  const [cardVisible, setCardVisible] = useState(false);

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
        refreshControl={
          <RefreshControl
            refreshing={
              summaryState.phase === 'ready' && summaryState.refreshing
            }
            onRefresh={() => {
              if (summaryState.phase === 'ready') {
                void localLoyaltySummaryController.refresh();
              } else {
                void localLoyaltySummaryController.retry();
              }
            }}
            colors={['#B91C2F']}
            tintColor="#B91C2F"
          />
        }
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

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Buka member card V1"
          style={styles.cardButton}
          onPress={() => setCardVisible(true)}
        >
          <Text style={styles.cardButtonText}>💳 Buka Member Card V1</Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Buka profile lokal"
          style={styles.profileButton}
          onPress={() => navigation.navigate('LocalProfile')}
        >
          <Text style={styles.profileButtonText}>Buka Profile V1</Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Buka rewards lokal"
          style={styles.rewardsButton}
          onPress={() => navigation.navigate('LocalRewards')}
        >
          <Text style={styles.rewardsButtonText}>
            🎁 Buka Rewards & Voucher V1
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Buka menu lokal"
          style={styles.menuButton}
          onPress={() => navigation.navigate('LocalMenu')}
        >
          <Text style={styles.menuButtonText}>
            🧋 Buka Menu & Katalog V1
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Buka store locator lokal"
          style={styles.storeLocatorButton}
          onPress={() => navigation.navigate('LocalStoreLocator')}
        >
          <Text style={styles.storeLocatorButtonText}>
            📍 Buka Store Locator V1
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Buka promosi lokal"
          style={styles.promotionsButton}
          onPress={() => navigation.navigate('LocalPromotions')}
        >
          <Text style={styles.promotionsButtonText}>
            📢 Buka Promosi & Banner V1
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Buka notifikasi lokal"
          style={styles.notificationsButton}
          onPress={() => navigation.navigate('LocalNotifications')}
        >
          <Text style={styles.notificationsButtonText}>
            🔔 Buka Notifikasi V1
          </Text>
        </TouchableOpacity>

        <HomeMembershipRegion
          model={loyaltyModel}
          loading={
            summaryState.phase === 'idle' ||
            summaryState.phase === 'loading'
          }
          onPress={() => navigation.navigate('LocalMembershipStatus')}
        />
        {summaryState.phase === 'error' ? (
          <View style={styles.summaryErrorCard}>
            <Text style={styles.summaryError}>
              Loyalty summary gagal dimuat. Nilai nol tidak ditampilkan.
            </Text>
            <TouchableOpacity
              style={styles.summaryRetry}
              onPress={() => void localLoyaltySummaryController.retry()}
            >
              <Text style={styles.summaryRetryText}>Coba Lagi</Text>
            </TouchableOpacity>
          </View>
        ) : summaryState.error ? (
          <Text style={styles.summaryError}>
            Refresh gagal; data sebelumnya tetap ditampilkan.
          </Text>
        ) : null}
        <View style={styles.walletRegion}>
          <HomeWalletRegion
            model={loyaltyModel}
            loading={
              summaryState.phase === 'idle' ||
              summaryState.phase === 'loading'
            }
            onAction={() => navigation.navigate('LocalLoyaltyActivity')}
          />
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

      <LocalMemberCardModal
        visible={cardVisible}
        onClose={() => setCardVisible(false)}
        member={member}
        loyaltySummary={summary}
      />
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
  cardButton: {
    alignItems: 'center',
    backgroundColor: '#C8102E',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 48,
    marginBottom: 12,
  },
  cardButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  profileButton: {
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 48,
    marginBottom: 16,
  },
  profileButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  rewardsButton: {
    alignItems: 'center',
    backgroundColor: '#C8102E',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 48,
    marginBottom: 16,
  },
  rewardsButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  menuButton: {
    alignItems: 'center',
    backgroundColor: '#B91C2F',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 48,
    marginBottom: 16,
  },
  menuButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  storeLocatorButton: {
    alignItems: 'center',
    backgroundColor: '#8C7B75',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 48,
    marginBottom: 16,
  },
  storeLocatorButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  promotionsButton: {
    alignItems: 'center',
    backgroundColor: '#8A1C14',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 48,
    marginBottom: 16,
  },
  promotionsButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  notificationsButton: {
    alignItems: 'center',
    backgroundColor: '#CA8A04',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 48,
    marginBottom: 16,
  },
  notificationsButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  notice: {
    backgroundColor: '#FFF7E6',
    borderRadius: 14,
    padding: 16,
  },
  summaryError: {
    color: '#B91C1C',
    fontSize: 12,
    marginTop: 8,
  },
  summaryErrorCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
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
  walletRegion: {
    marginTop: 8,
    marginBottom: 16,
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
