import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Settings,
  X,
} from 'lucide-react-native';

import type {
  ProfileHistoryItemViewModel,
  ProfileParityViewModel,
} from '../../application/profileParity/ProfileParityViewModel';
import SkeletonLoader from '../../components/SkeletonLoader';
import UserAvatar from '../../components/UserAvatar';
import { colors } from '../../theme/colorTokens';

interface IdentityProps {
  model: ProfileParityViewModel | null;
  loading: boolean;
  avatarSize: number;
  horizontalPadding: number;
  onEdit: (() => void) | null;
}

export function ProfileIdentityStatsView({
  model,
  loading,
  avatarSize,
  horizontalPadding,
  onEdit,
}: IdentityProps) {
  return (
    <>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <UserAvatar
            name={model?.identity.fullName ?? 'Member'}
            photoURL={model?.identity.photoUrl}
            size={avatarSize}
          />
          {onEdit ? (
            <TouchableOpacity
              style={[
                styles.editBadge,
                { backgroundColor: colors.text.primary },
              ]}
              onPress={onEdit}
            >
              <Settings size={14} color="#FFF" />
            </TouchableOpacity>
          ) : null}
        </View>
        {loading || !model ? (
          <SkeletonLoader
            width={160}
            height={28}
            style={{ marginTop: 4 }}
            borderRadius={14}
          />
        ) : (
          <Text style={[styles.userName, { color: colors.text.primary }]}>
            {model.identity.fullName}
          </Text>
        )}
        {loading || !model ? (
          <SkeletonLoader width={120} height={16} style={{ marginTop: 8 }} />
        ) : (
          <Text style={[styles.userPhone, { color: colors.text.secondary }]}>
            {model.identity.phoneNumber}
          </Text>
        )}
        {model?.identity.badgeLabel ? (
          <View
            style={[styles.memberBadge, { backgroundColor: colors.brand.primary }]}
          >
            <Text style={styles.memberBadgeText}>
              {model.identity.badgeLabel}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.statsRow, { paddingHorizontal: horizontalPadding }]}>
        {(model?.stats ?? [null, null]).map((stat, index) => {
          const pending = stat?.tone === 'pending' || index === 1;
          return (
            <View
              key={index}
              style={[
                styles.statCard,
                {
                  backgroundColor: pending ? '#FFF7ED' : '#FFFFFF',
                  borderColor: pending ? '#FED7AA' : colors.border.light,
                },
              ]}
            >
              {loading || !stat ? (
                <>
                  <SkeletonLoader width={90} height={12} />
                  <SkeletonLoader
                    width={70}
                    height={28}
                    style={{ marginTop: 10 }}
                  />
                  <SkeletonLoader
                    width={100}
                    height={12}
                    style={{ marginTop: 8 }}
                  />
                </>
              ) : (
                <>
                  <Text
                    style={[
                      styles.statLabel,
                      { color: pending ? '#9A3412' : colors.text.secondary },
                    ]}
                  >
                    {stat.label}
                  </Text>
                  <Text
                    style={[
                      styles.statValue,
                      { color: pending ? '#9A3412' : colors.text.primary },
                    ]}
                  >
                    {stat.valueLabel}
                  </Text>
                  <Text
                    style={[
                      styles.statHint,
                      { color: pending ? '#C2410C' : colors.text.secondary },
                    ]}
                  >
                    {stat.hint}
                  </Text>
                </>
              )}
            </View>
          );
        })}
      </View>
    </>
  );
}

interface HistorySheetProps {
  visible: boolean;
  screenHeight: number;
  model: ProfileParityViewModel | null;
  loading: boolean;
  errorMessage: string | null;
  loadingMore: boolean;
  onClose: () => void;
  onLoadMore: () => void;
  onRetry: () => void;
  onTabBarVisibilityChange: (hidden: boolean) => void;
}

function pointsColor(item: ProfileHistoryItemViewModel): string {
  if (item.pointsTone === 'pending') return colors.status.warningText;
  if (item.pointsTone === 'negative' || item.pointsTone === 'rejected') {
    return colors.status.errorText;
  }
  return colors.status.successText;
}

export function ProfileHistorySheet({
  visible,
  screenHeight,
  model,
  loading,
  errorMessage,
  loadingMore,
  onClose,
  onLoadMore,
  onRetry,
  onTabBarVisibilityChange,
}: HistorySheetProps) {
  const { t } = useTranslation();
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      onTabBarVisibilityChange(true);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          damping: 20,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: screenHeight,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => onTabBarVisibilityChange(false));
  }, [
    backdropOpacity,
    cardOpacity,
    onTabBarVisibilityChange,
    screenHeight,
    translateY,
    visible,
  ]);

  const items = model?.history.items ?? [];

  return (
    <View
      style={styles.inlineOverlay}
      pointerEvents={visible ? 'box-none' : 'none'}
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[styles.modalBackdrop, { opacity: backdropOpacity }]}
        >
          {Platform.OS !== 'android' ? (
            <BlurView
              intensity={40}
              tint="dark"
              style={StyleSheet.absoluteFillObject}
            />
          ) : null}
          <View style={styles.modalBackdropTint} />
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={onClose}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.bottomSheetCard,
            {
              maxHeight: Math.min(screenHeight * 0.78, 720),
              minHeight: Math.max(320, screenHeight * 0.48),
              opacity: cardOpacity,
              transform: [{ translateY }],
            },
          ]}
        >
          <View
            style={[styles.modalGrip, { backgroundColor: colors.border.medium }]}
          />
          <View
            style={[
              styles.modalHeader,
              { borderBottomColor: colors.border.light },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              {model?.history.title ?? 'Transaction History'}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeButton,
                { backgroundColor: colors.background.tertiary },
              ]}
            >
              <X size={20} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingList}>
              {[1, 2, 3].map((item) => (
                <SkeletonLoader
                  key={item}
                  height={60}
                  style={{ marginBottom: 16 }}
                />
              ))}
            </View>
          ) : errorMessage && items.length === 0 ? (
            <View style={styles.centerState}>
              <Text style={[styles.errorText, { color: colors.status.errorText }]}>
                {errorMessage}
              </Text>
              <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
                <Text style={styles.retryText}>{t('common.retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.historyListContent}
              style={styles.historyList}
              onEndReached={items.length > 0 ? onLoadMore : undefined}
              onEndReachedThreshold={0.35}
              ListHeaderComponent={
                errorMessage && items.length > 0 ? (
                  <View style={styles.inlineError}>
                    <Text
                      style={[
                        styles.errorText,
                        { color: colors.status.errorText },
                      ]}
                    >
                      {errorMessage}
                    </Text>
                    <TouchableOpacity onPress={onRetry}>
                      <Text style={styles.footerRetry}>{t('common.retry')}</Text>
                    </TouchableOpacity>
                  </View>
                ) : null
              }
              ListFooterComponent={
                items.length > 0 && model?.history.hasMore ? (
                  <View style={styles.historyFooter}>
                    {loadingMore ? (
                      <SkeletonLoader width={140} height={12} />
                    ) : (
                      <Text
                        style={[
                          styles.historyFooterText,
                          { color: colors.text.secondary },
                        ]}
                      >
                        {model.history.footerMessage}
                      </Text>
                    )}
                    {errorMessage ? (
                      <TouchableOpacity onPress={onRetry}>
                        <Text style={styles.footerRetry}>Coba lagi</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null
              }
              ListEmptyComponent={
                <View style={styles.centerState}>
                  <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
                    {model?.history.emptyMessage ??
                      'No transaction history yet.'}
                  </Text>
                </View>
              }
              renderItem={({ item, index }) => {
                const previous = items[index - 1];
                const showDay =
                  index === 0 || item.dayLabel !== previous?.dayLabel;
                const negative = item.direction === 'down';
                return (
                  <View>
                    {showDay ? (
                      <View style={styles.dateSection}>
                        <View
                          style={[
                            styles.dateSectionLine,
                            { backgroundColor: colors.border.light },
                          ]}
                        />
                        <Text
                          style={[
                            styles.dateSectionLabel,
                            { color: colors.text.secondary },
                          ]}
                        >
                          {item.dayLabel}
                        </Text>
                      </View>
                    ) : null}
                    <View
                      style={[
                        styles.historyItem,
                        { borderBottomColor: colors.border.light },
                      ]}
                    >
                      <View
                        style={[
                          styles.historyIcon,
                          {
                            backgroundColor: negative
                              ? colors.status.warningBg
                              : colors.status.successBg,
                          },
                        ]}
                      >
                        {negative ? (
                          <ArrowDownCircle
                            size={18}
                            color={colors.status.warningText}
                          />
                        ) : (
                          <ArrowUpCircle
                            size={18}
                            color={colors.status.successText}
                          />
                        )}
                      </View>
                      <View style={styles.historyMain}>
                        <View style={styles.historyTopRow}>
                          <Text
                            style={[
                              styles.historyTitle,
                              { color: colors.text.primary },
                            ]}
                            numberOfLines={2}
                          >
                            {item.title}
                          </Text>
                          <Text
                            style={[
                              styles.historyAmount,
                              { color: pointsColor(item) },
                            ]}
                          >
                            {item.pointsLabel}
                          </Text>
                        </View>
                        {item.transactionAmountLabel ? (
                          <Text
                            style={[
                              styles.historyTransactionAmount,
                              { color: colors.text.secondary },
                            ]}
                          >
                            {item.transactionAmountLabel}
                          </Text>
                        ) : null}
                        <Text
                          style={[
                            styles.historyDate,
                            { color: colors.text.secondary },
                          ]}
                        >
                          {item.timeLabel}
                        </Text>
                        {item.storeLabel ? (
                          <Text
                            style={[
                              styles.historyMeta,
                              { color: colors.text.secondary },
                            ]}
                            numberOfLines={1}
                          >
                            {item.storeLabel}
                          </Text>
                        ) : null}
                        {item.referenceLabel ? (
                          <Text
                            style={[
                              styles.historyReference,
                              { color: colors.text.tertiary },
                            ]}
                            numberOfLines={1}
                          >
                            {item.referenceLabel}
                          </Text>
                        ) : null}
                        {item.statusLabel ? (
                          <View
                            style={[
                              styles.statusBadge,
                              {
                                backgroundColor:
                                  item.statusLabel === 'Rejected'
                                    ? colors.status.errorBg
                                    : colors.status.warningBg,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusBadgeText,
                                {
                                  color:
                                    item.statusLabel === 'Rejected'
                                      ? colors.status.errorText
                                      : colors.status.warningText,
                                },
                              ]}
                            >
                              {item.statusLabel}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginTop: 20, marginBottom: 24 },
  avatarContainer: { position: 'relative', marginBottom: 16 },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFF',
    elevation: 3,
  },
  userName: { fontSize: 24, fontWeight: 'bold', marginTop: 4 },
  userPhone: { fontSize: 14, marginTop: 4 },
  memberBadge: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  memberBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, borderRadius: 18, borderWidth: 1, padding: 16 },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: { fontSize: 24, fontWeight: '800' },
  statHint: { fontSize: 12, marginTop: 6 },
  inlineOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 60,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  modalBackdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(21,17,17,0.3)',
  },
  bottomSheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 20,
    overflow: 'hidden',
  },
  modalGrip: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    marginTop: 10,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  closeButton: { padding: 8, borderRadius: 20 },
  loadingList: { padding: 20 },
  centerState: { padding: 40, alignItems: 'center' },
  errorText: { textAlign: 'center', fontSize: 14, lineHeight: 20 },
  retryButton: {
    backgroundColor: '#B91C2F',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 14,
  },
  retryText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  inlineError: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
  },
  historyList: { flex: 1 },
  historyListContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  historyFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 10,
    gap: 8,
  },
  historyFooterText: { fontSize: 12 },
  footerRetry: { color: '#B91C2F', fontSize: 12, fontWeight: '700' },
  dateSection: { paddingTop: 12, paddingBottom: 6 },
  dateSectionLine: { height: 1, marginBottom: 10 },
  dateSectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  emptyText: { textAlign: 'center', fontSize: 14 },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  historyMain: { flex: 1 },
  historyTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  historyTitle: { fontSize: 16, fontWeight: '600' },
  historyTransactionAmount: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  historyDate: { fontSize: 12, marginTop: 2 },
  historyMeta: { fontSize: 13, marginTop: 4 },
  historyReference: { fontSize: 11, marginTop: 2 },
  historyAmount: { fontSize: 15, fontWeight: '700', marginTop: 1 },
  statusBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
});
