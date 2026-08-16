import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type {
  LoyaltyActivityEventType,
  LoyaltyActivityItem,
} from '../application/loyaltyActivity/LoyaltyActivity';
import {
  loadLocalActivityFixture,
  localLoyaltyActivityController,
} from '../composition/loyaltyActivity';
import { useMember } from '../context/MemberContext';
import type { LocalStackParamList } from '../navigation/LocalAppNavigator';
import { useLocalLoyaltyActivity } from '../presentation/loyaltyActivity/useLocalLoyaltyActivity';

const EVENT_LABELS: Record<LoyaltyActivityEventType, string> = {
  earn: i18n.t('loyaltyActivity.earn'),
  refund_reversal: i18n.t('loyaltyActivity.refundReversal'),
  redemption: i18n.t('loyaltyActivity.redemption'),
};

function formatActivityDate(value: string): string {
  return new Date(value).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ActivityRow({ item }: { item: LoyaltyActivityItem }) {
  const positive = item.pointsDelta > 0;
  return (
    <View style={styles.activityRow}>
      <View
        style={[
          styles.activityIcon,
          positive ? styles.positiveIcon : styles.negativeIcon,
        ]}
      >
        <Text
          style={[
            styles.activityIconText,
            positive ? styles.positiveText : styles.negativeText,
          ]}
        >
          {positive ? '↑' : '↓'}
        </Text>
      </View>
      <View style={styles.activityMain}>
        <Text style={styles.activityTitle}>{EVENT_LABELS[item.eventType]}</Text>
        <Text style={styles.activityMeta}>
          {formatActivityDate(item.activityAt)}
        </Text>
        {item.externalOrderReference ? (
          <Text style={styles.activityReference}>
            Ref: {item.externalOrderReference}
          </Text>
        ) : null}
      </View>
      <Text
        style={[
          styles.activityPoints,
          positive ? styles.positiveText : styles.negativeText,
        ]}
      >
        {positive ? '+' : ''}
        {item.pointsDelta} pts
      </Text>
    </View>
  );
}

export default function LocalLoyaltyActivityScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<LocalStackParamList>>();
  const { member } = useMember();
  const uid = member?.uid ?? null;
  const state = useLocalLoyaltyActivity(
    localLoyaltyActivityController,
    uid,
  );
  const [fixturePhase, setFixturePhase] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const fixtureUidRef = useRef(uid);
  const fixtureGenerationRef = useRef(0);
  if (fixtureUidRef.current !== uid) {
    fixtureUidRef.current = uid;
    fixtureGenerationRef.current += 1;
  }

  useEffect(() => {
    setFixturePhase('idle');
  }, [uid]);

  const handleLoadDemoActivity = async () => {
    if (!uid || fixturePhase === 'loading') return;
    const initiatingUid = uid;
    const initiatingGeneration = fixtureGenerationRef.current;
    const isCurrent = () =>
      fixtureUidRef.current === initiatingUid &&
      fixtureGenerationRef.current === initiatingGeneration;
    setFixturePhase('loading');
    try {
      await loadLocalActivityFixture.execute(initiatingUid);
      if (isCurrent()) setFixturePhase('success');
    } catch {
      if (isCurrent()) setFixturePhase('error');
    }
  };

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
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>LOCAL EMULATOR</Text>
          <Text style={styles.title}>Loyalty Activity</Text>
        </View>
      </View>

      <View
        style={[
          styles.pendingCard,
          state.pendingAvailability === 'error' && styles.errorCard,
        ]}
      >
        <Text style={styles.pendingTitle}>Pending points</Text>
        <Text style={styles.pendingText}>
          {state.pendingAvailability === 'loading'
            ? t('loyaltyActivity.pendingLoading')
            : state.pendingAvailability === 'unsupported'
              ? t('loyaltyActivity.pendingUnsupported')
              : t('loyaltyActivity.pendingError')}
        </Text>
      </View>

      <View style={styles.fixtureCard}>
        <Text style={styles.fixtureTitle}>Demo activity lokal</Text>
        <Text style={styles.fixtureText}>
          Backend akan membuat fixture earn, refund, dan redemption untuk akun
          emulator ini.
        </Text>
        {fixturePhase === 'error' ? (
          <Text style={styles.fixtureError}>
            Demo gagal dimuat. Backend tetap menjadi sumber data; coba lagi.
          </Text>
        ) : fixturePhase === 'success' ? (
          <Text style={styles.fixtureSuccess}>
            Demo selesai dan activity sudah dimuat ulang.
          </Text>
        ) : null}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Muat demo loyalty activity lokal"
          style={[
            styles.fixtureButton,
            fixturePhase === 'loading' && styles.disabled,
          ]}
          disabled={!uid || fixturePhase === 'loading'}
          onPress={() => void handleLoadDemoActivity()}
        >
          {fixturePhase === 'loading' ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.fixtureButtonText}>
              {fixturePhase === 'error'
                ? t('loyaltyActivity.retryDemo')
                : t('loyaltyActivity.loadDemo')}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {state.phase === 'idle' || state.phase === 'loading' ? (
        <View style={styles.centerState}>
          <ActivityIndicator color="#C8102E" />
          <Text style={styles.stateText}>Memuat activity dari FastAPI...</Text>
        </View>
      ) : state.phase === 'error' ? (
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>Activity gagal dimuat</Text>
          <Text style={styles.stateText}>
            Backend tidak mengembalikan empty state, jadi error tetap terlihat.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => void localLoyaltyActivityController.retry()}
          >
            <Text style={styles.primaryButtonText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={state.items}
          keyExtractor={(item) => item.activityId}
          renderItem={({ item }) => <ActivityRow item={item} />}
          contentContainerStyle={[
            styles.listContent,
            state.items.length === 0 && styles.emptyListContent,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={state.refreshing}
              onRefresh={() => void localLoyaltyActivityController.refresh()}
              tintColor="#C8102E"
              colors={['#C8102E']}
            />
          }
          ListEmptyComponent={
            <View style={styles.centerState}>
              <Text style={styles.emptyTitle}>Belum ada loyalty activity</Text>
              <Text style={styles.stateText}>
                Member lokal baru belum memiliki earn, refund, atau redemption.
              </Text>
            </View>
          }
          ListFooterComponent={
            <View>
              {state.pageError === 'activity_load_failed' ? (
                <View style={styles.inlineError}>
                  <Text style={styles.inlineErrorText}>
                    Refresh gagal. Activity terakhir tetap ditampilkan.
                  </Text>
                  <TouchableOpacity
                    style={styles.inlineRetryButton}
                    onPress={() =>
                      void localLoyaltyActivityController.retry()
                    }
                  >
                    <Text style={styles.inlineRetryText}>Coba Lagi</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              {state.pageError === 'activity_pagination_failed' ? (
                <View style={styles.inlineError}>
                  <Text style={styles.inlineErrorText}>
                    Halaman berikutnya gagal. Activity sebelumnya tetap aman.
                  </Text>
                </View>
              ) : null}
              {state.nextCursor ? (
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    state.loadingMore && styles.disabled,
                  ]}
                  disabled={state.loadingMore}
                  onPress={() =>
                    void localLoyaltyActivityController.loadMore()
                  }
                >
                  {state.loadingMore ? (
                    <ActivityIndicator color="#C8102E" />
                  ) : (
                    <Text style={styles.secondaryButtonText}>
                      Muat Activity Sebelumnya
                    </Text>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFDFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0ECE7',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3F5',
    marginRight: 12,
  },
  backText: {
    color: '#C8102E',
    fontSize: 34,
    lineHeight: 36,
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    color: '#C8102E',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    color: '#1A1A1A',
    fontSize: 24,
    fontWeight: '800',
  },
  pendingCard: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFF7E6',
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
  },
  fixtureCard: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FDE8EC',
  },
  fixtureTitle: {
    color: '#7F1024',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  fixtureText: {
    color: '#8F3344',
    fontSize: 12,
    lineHeight: 18,
  },
  fixtureError: {
    color: '#B91C1C',
    fontSize: 12,
    marginTop: 8,
  },
  fixtureSuccess: {
    color: '#15803D',
    fontSize: 12,
    marginTop: 8,
  },
  fixtureButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    backgroundColor: '#C8102E',
    borderRadius: 12,
    marginTop: 12,
  },
  fixtureButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  pendingTitle: {
    color: '#7C4A03',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  pendingText: {
    color: '#8A5A16',
    fontSize: 13,
    lineHeight: 19,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  stateText: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 10,
  },
  emptyTitle: {
    color: '#1A1A1A',
    fontSize: 18,
    fontWeight: '800',
  },
  errorTitle: {
    color: '#991B1B',
    fontSize: 18,
    fontWeight: '800',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#ECE7E1',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  activityIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  positiveIcon: {
    backgroundColor: '#DCFCE7',
  },
  negativeIcon: {
    backgroundColor: '#FEE2E2',
  },
  activityIconText: {
    fontSize: 20,
    fontWeight: '800',
  },
  activityMain: {
    flex: 1,
  },
  activityTitle: {
    color: '#1A1A1A',
    fontSize: 14,
    fontWeight: '700',
  },
  activityMeta: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 3,
  },
  activityReference: {
    color: '#8A8178',
    fontSize: 11,
    marginTop: 2,
  },
  activityPoints: {
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 8,
  },
  positiveText: {
    color: '#15803D',
  },
  negativeText: {
    color: '#B91C1C',
  },
  primaryButton: {
    marginTop: 18,
    backgroundColor: '#C8102E',
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 13,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#C8102E',
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 10,
  },
  secondaryButtonText: {
    color: '#C8102E',
    fontSize: 14,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.55,
  },
  inlineError: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  inlineErrorText: {
    color: '#991B1B',
    fontSize: 12,
    textAlign: 'center',
  },
  inlineRetryButton: {
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 8,
  },
  inlineRetryText: {
    color: '#C8102E',
    fontSize: 13,
    fontWeight: '800',
  },
});
