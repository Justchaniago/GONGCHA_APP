import React, { useCallback, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { History, ChevronRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { buildLocalProfileParityViewModel } from '../application/profileParity/ProfileParityViewModel';
import { createLocalLoyaltyActivityController } from '../composition/loyaltyActivity';
import { createLocalLoyaltySummaryController } from '../composition/loyaltySummary';
import DecorativeBackground from '../components/DecorativeBackground';
import { useMember } from '../context/MemberContext';
import type { LocalStackParamList } from '../navigation/LocalAppNavigator';
import { useLocalLoyaltyActivity } from '../presentation/loyaltyActivity/useLocalLoyaltyActivity';
import { useLocalLoyaltySummary } from '../presentation/loyaltySummary/useLocalLoyaltySummary';
import {
  ProfileHistorySheet,
  ProfileIdentityStatsView,
} from '../presentation/profileParity/ProfileParityView';
import { colors } from '../theme/colorTokens';

export default function LocalProfileScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<LocalStackParamList>>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { member, loading: memberLoading } = useMember();
  const uid = member?.uid ?? null;
  const summaryController = useMemo(
    () => createLocalLoyaltySummaryController(),
    [],
  );
  const activityController = useMemo(
    () => createLocalLoyaltyActivityController(),
    [],
  );
  const summaryState = useLocalLoyaltySummary(summaryController, uid);
  const activityState = useLocalLoyaltyActivity(activityController, uid);
  const [historyVisible, setHistoryVisible] = useState(false);

  const model = useMemo(
    () =>
      buildLocalProfileParityViewModel(
        member,
        summaryState.phase === 'ready' ? summaryState.summary : null,
        activityState.items,
        activityState.nextCursor !== null,
      ),
    [activityState, member, summaryState],
  );
  const loading =
    memberLoading ||
    summaryState.phase === 'idle' ||
    summaryState.phase === 'loading';
  const historyLoading =
    activityState.phase === 'idle' || activityState.phase === 'loading';
  const rootError =
    summaryState.phase === 'error'
      ? 'Profile loyalty gagal dimuat. Nilai nol tidak ditampilkan.'
      : null;
  const historyError =
    activityState.phase === 'error'
      ? 'Loyalty activity gagal dimuat dari FastAPI.'
      : activityState.pageError
        ? 'Sebagian activity gagal dimuat. Data sebelumnya tetap ditampilkan.'
        : null;
  const horizontalPadding = width < 360 ? 14 : 20;
  const avatarSize = width < 360 ? 88 : 100;

  const refreshAll = useCallback(() => {
    void Promise.all([
      summaryState.phase === 'ready'
        ? summaryController.refresh()
        : summaryController.retry(),
      activityState.phase === 'ready'
        ? activityController.refresh()
        : activityController.retry(),
    ]);
  }, [
    activityController,
    activityState.phase,
    summaryController,
    summaryState.phase,
  ]);
  const ignoreTabBar = useCallback(() => undefined, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.background.primary }]}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <DecorativeBackground />
      <View style={[styles.container, { paddingTop: insets.top + 4 }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 80 + insets.bottom },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={
                summaryState.phase === 'ready' &&
                activityState.phase === 'ready' &&
                (summaryState.refreshing || activityState.refreshing)
              }
              onRefresh={refreshAll}
              colors={['#B91C2F']}
              tintColor="#B91C2F"
            />
          }
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>‹ Dashboard</Text>
          </TouchableOpacity>

          <ProfileIdentityStatsView
            model={model}
            loading={loading}
            avatarSize={avatarSize}
            horizontalPadding={horizontalPadding}
            onEdit={null}
          />

          {rootError ? (
            <View
              style={[
                styles.errorCard,
                { marginHorizontal: horizontalPadding },
              ]}
            >
              <Text style={styles.errorText}>{rootError}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => void summaryController.retry()}
              >
                <Text style={styles.retryText}>Coba Lagi</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View
            style={[
              styles.menuSection,
              { paddingHorizontal: horizontalPadding },
            ]}
          >
            <Text style={[styles.sectionHeader, { color: colors.text.primary }]}>
              Account
            </Text>
            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => setHistoryVisible(true)}
            >
              <View style={styles.menuIcon}>
                <History size={20} color={colors.brand.primary} />
              </View>
              <View style={styles.menuText}>
                <Text style={[styles.menuTitle, { color: colors.text.primary }]}>
                  Loyalty Activity
                </Text>
                <Text style={styles.menuSubtitle}>
                  Riwayat authoritative dari FastAPI
                </Text>
              </View>
              <ChevronRight size={16} color={colors.text.tertiary} />
            </TouchableOpacity>
            <View style={styles.notice}>
              <Text style={styles.noticeText}>
                Edit profile, avatar, provider linking, notification, dan
                destructive account action belum diaktifkan di local mode.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>

      <ProfileHistorySheet
        visible={historyVisible}
        screenHeight={height}
        model={model}
        loading={historyLoading}
        errorMessage={historyError}
        loadingMore={activityState.loadingMore}
        onClose={() => setHistoryVisible(false)}
        onLoadMore={() => void activityController.loadMore()}
        onRetry={() => void activityController.retry()}
        onTabBarVisibilityChange={ignoreTabBar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 80 },
  backButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backText: { color: '#B91C2F', fontSize: 14, fontWeight: '800' },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  errorText: { color: '#B91C1C', fontSize: 13, lineHeight: 19 },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#B91C2F',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginTop: 12,
  },
  retryText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  menuSection: { marginBottom: 24 },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    elevation: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    backgroundColor: '#FFF0E0',
  },
  menuText: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: '600' },
  menuSubtitle: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  notice: {
    backgroundColor: '#FFF7E6',
    borderRadius: 14,
    padding: 16,
  },
  noticeText: { color: '#8A5A16', fontSize: 12, lineHeight: 18 },
});
