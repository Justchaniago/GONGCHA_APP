import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, FlatList, Platform, useWindowDimensions,
  DeviceEventEmitter,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications/build/Notifications.types';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User, History as HistoryIcon, ArrowDownCircle, ArrowUpCircle,
  Settings, LogOut, ChevronRight, MapPin, HelpCircle, X, ShieldCheck, Lock,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import DecorativeBackground from '../components/DecorativeBackground';
import UserAvatar from '../components/UserAvatar';
import { AuthService } from '../services/AuthService';
import { TransactionService, type MemberTransactionHistoryItem } from '../services/TransactionService';
import { RootStackParamList } from '../navigation/AppNavigator';

// 🔥 IMPORT SYARAF BARU & SKELETON
import { useMember } from '../context/MemberContext';
import { useSecurity } from '../context/SecurityContext';
import { colors } from '../theme/colorTokens';
import SkeletonLoader from '../components/SkeletonLoader';

// ==========================================
// 1. SUB-KOMPONEN MENU ITEM
// ==========================================
const MenuItem = ({ icon: Icon, title, subtitle, onPress, isDestructive = false }: any) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.menuIcon, { backgroundColor: isDestructive ? colors.brand.primary : '#FFF0E0' }]}>
      <Icon size={20} color={isDestructive ? '#FFF' : colors.brand.primary} />
    </View>
    <View style={styles.menuTextContainer}>
      <Text style={[styles.menuTitle, { color: isDestructive ? colors.brand.primary : colors.text.primary }]}>{title}</Text>
      {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
    </View>
    {!isDestructive && <ChevronRight size={16} color={colors.text.tertiary} />}
  </TouchableOpacity>
);

const formatDate = (isoString: string) => {
  if (!isoString) return '-';
  const date = new Date(isoString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const formatHistoryDayLabel = (isoString: string) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (first: Date, second: Date) =>
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate();

  if (sameDay(date, today)) return 'Today';
  if (sameDay(date, yesterday)) return 'Yesterday';

  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const formatHistoryTime = (isoString: string) => {
  if (!isoString) return '-';
  return new Date(isoString).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const startOfDay = (isoString: string) => {
  const date = new Date(isoString);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

// ==========================================
// 2. KOMPONEN UTAMA
// ==========================================
export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  
  // 🔥 AMBIL DATA DARI CONTEXT (CCTV REALTIME)
  const { member, loading: isMemberLoading } = useMember();
  const { openSecuritySettings, pinEnabled, biometricEnabled, appLockEnabled } = useSecurity();
  const [todayTransactionItems, setTodayTransactionItems] = useState<MemberTransactionHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [visibleDayCount, setVisibleDayCount] = useState(1);

  // Animation State
  const [showHistory, setShowHistory] = useState(false);
  const historyTranslateY = useRef(new Animated.Value(screenHeight)).current;
  const historyBackdropOpacity = useRef(new Animated.Value(0)).current;
  const historyCardOpacity = useRef(new Animated.Value(0)).current;

  const isCompact = screenWidth < 360;
  const horizontalPadding = isCompact ? 14 : 20;
  const avatarSize = isCompact ? 88 : 100;
  const availablePoints = member?.currentPoints ?? member?.points ?? 0;
  const pendingPoints = member?.pendingPoints ?? 0;
  const groupedTransactionItems = useMemo(() => {
    const groups = new Map<number, MemberTransactionHistoryItem[]>();

    todayTransactionItems.forEach((item) => {
      const dayKey = startOfDay(item.createdAtIso);
      if (!groups.has(dayKey)) {
        groups.set(dayKey, []);
      }
      groups.get(dayKey)?.push(item);
    });

    return Array.from(groups.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([dayKey, items]) => ({
        dayKey,
        label: formatHistoryDayLabel(items[0]?.createdAtIso ?? new Date(dayKey).toISOString()),
        items,
      }));
  }, [todayTransactionItems]);

  const transactionItems = useMemo(
    () => groupedTransactionItems.slice(0, visibleDayCount).flatMap((group) => group.items),
    [groupedTransactionItems, visibleDayCount],
  );
  const hasAnyHistory = transactionItems.length > 0;
  const hasMoreHistory = groupedTransactionItems.length > visibleDayCount;

  useEffect(() => {
    if (!member?.uid) {
      setTodayTransactionItems([]);
      setIsHistoryLoading(false);
      setVisibleDayCount(1);
      return;
    }

    setIsHistoryLoading(true);
    setVisibleDayCount(1);

    const unsubscribe = TransactionService.subscribeToUserTransactions(member.uid, (items) => {
      setTodayTransactionItems(items);
      setIsHistoryLoading(false);
    });

    return unsubscribe;
  }, [member?.uid]);

  const loadOlderHistory = async () => {
    if (!hasMoreHistory) {
      return;
    }
    setVisibleDayCount((current) => current + 1);
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await AuthService.logout();
            // Satpam Navigasi akan otomatis mendeteksi perubahan sesi
          } catch (e) {
            console.error(e);
          }
        },
      },
    ]);
  };

  const handleTestNotification = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow notifications to see the preview.');
        return;
      }
      await Notifications.scheduleNotificationAsync({
        content: { title: 'GongCha Admin', body: '🔔 Test notification triggered!' },
        trigger: { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1 },
      });
    } catch (error: any) {
      Alert.alert('Notification error', String(error?.message || error));
    }
  };

  const openHistory = () => {
    setShowHistory(true);
    DeviceEventEmitter.emit('TOGGLE_TAB_BAR', true);

    Animated.parallel([
      Animated.spring(historyTranslateY, { toValue: 0, damping: 20, useNativeDriver: true }),
      Animated.timing(historyBackdropOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(historyCardOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  };

  const closeHistory = () => {
    DeviceEventEmitter.emit('TOGGLE_TAB_BAR', false);

    Animated.parallel([
      Animated.timing(historyTranslateY, { toValue: screenHeight, duration: 250, useNativeDriver: true }),
      Animated.timing(historyBackdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(historyCardOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => setShowHistory(false));
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background.primary }]}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <DecorativeBackground />

      <View style={[styles.container, { paddingTop: insets.top + 4 }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}>
          
          {/* HEADER PROFILE */}
          <View style={styles.header}>
            <View style={styles.avatarContainer}>
              <UserAvatar name={member?.fullName || 'Guest'} photoURL={member?.photoURL} size={avatarSize} />
              <TouchableOpacity style={[styles.editBadge, { backgroundColor: colors.text.primary }]} onPress={() => navigation.navigate('EditProfile')}>
                <Settings size={14} color="#FFF" />
              </TouchableOpacity>
            </View>

            {/* 🔥 SKELETON: Nama User */}
            {isMemberLoading ? (
              <SkeletonLoader width={160} height={28} style={{ marginTop: 4 }} borderRadius={14} />
            ) : (
              <Text style={[styles.userName, { color: colors.text.primary }]}>{member?.fullName || 'Guest'}</Text>
            )}

            {/* 🔥 SKELETON: Nomor HP */}
            {isMemberLoading ? (
              <SkeletonLoader width={120} height={16} style={{ marginTop: 8 }} />
            ) : (
              <Text style={[styles.userPhone, { color: colors.text.secondary }]}>{member?.phoneNumber || '-'}</Text>
            )}
            
            {member?.tier === 'Platinum' && ( // Contoh penggunaan data tier
              <View style={[styles.adminBadge, { backgroundColor: colors.brand.primary }]}>
                <Text style={styles.adminBadgeText}>PLATINUM MEMBER</Text>
              </View>
            )}
          </View>

          <View style={[styles.pointsSummaryRow, { paddingHorizontal: horizontalPadding }]}>
            <View style={[styles.pointsSummaryCard, { backgroundColor: '#FFFFFF', borderColor: colors.border.light }]}>
              <Text style={[styles.pointsSummaryLabel, { color: colors.text.secondary }]}>Available Points</Text>
              <Text style={[styles.pointsSummaryValue, { color: colors.text.primary }]}>
                {availablePoints.toLocaleString('id-ID')}
              </Text>
              <Text style={[styles.pointsSummaryHint, { color: colors.text.secondary }]}>Ready to redeem</Text>
            </View>
            <View style={[styles.pointsSummaryCard, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
              <Text style={[styles.pointsSummaryLabel, { color: '#9A3412' }]}>Pending Points</Text>
              <Text style={[styles.pointsSummaryValue, { color: '#9A3412' }]}>
                {pendingPoints.toLocaleString('id-ID')}
              </Text>
              <Text style={[styles.pointsSummaryHint, { color: '#C2410C' }]}>Awaiting validation</Text>
            </View>
          </View>

          {/* MENU SECTIONS */}
          <View style={[styles.menuSection, { paddingHorizontal: horizontalPadding }]}>
            <Text style={[styles.sectionHeader, { color: colors.text.primary }]}>Account</Text>
            <MenuItem icon={User} title="Edit Profile" subtitle="Name, Phone, Email & Photo" onPress={() => navigation.navigate('EditProfile')} />
            <MenuItem icon={Lock} title="Change Password" subtitle="Update your account password" onPress={() => navigation.navigate('UpdatePassword', { mode: 'change' })} />
            <MenuItem
              icon={ShieldCheck}
              title="Security PIN"
              subtitle={
                pinEnabled
                  ? biometricEnabled
                    ? appLockEnabled
                      ? 'PIN and biometrics enabled, with app relock active'
                      : 'PIN and biometrics enabled'
                    : appLockEnabled
                      ? 'PIN enabled, with app relock active'
                      : 'PIN enabled for sensitive actions'
                  : 'Protect redemption, vouchers, and your member QR'
              }
              onPress={openSecuritySettings}
            />
            <MenuItem icon={HistoryIcon} title="Transaction History" subtitle="Check your earned points" onPress={openHistory} />
            <MenuItem icon={MapPin} title="Find a Store" subtitle="Locate nearest Gong Cha" onPress={() => navigation.navigate('StoreLocator')} />
          </View>

          {/* SUPPORT */}
          <View style={[styles.menuSection, { paddingHorizontal: horizontalPadding }]}>
            <Text style={[styles.sectionHeader, { color: colors.text.primary }]}>Support</Text>
            <MenuItem icon={HelpCircle} title="Help Center" onPress={() => {}} />
            <MenuItem icon={LogOut} title="Log Out" isDestructive onPress={handleLogout} />
          </View>

          <Text style={[styles.versionText, { color: colors.text.secondary }]}>App Version 1.0.3</Text>
        </ScrollView>
      </View>

      {/* HISTORY MODAL */}
      {showHistory && (
        <View style={styles.inlineOverlay} pointerEvents="box-none">
          <View style={styles.modalOverlay}>
            <Animated.View style={[styles.modalBackdrop, { opacity: historyBackdropOpacity }]}>
              {Platform.OS !== 'android' && <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFillObject} />}
              <View style={styles.modalBackdropTint} />
              <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={closeHistory} />
            </Animated.View>
            
            <Animated.View
              style={[
                styles.bottomSheetCard,
                {
                  maxHeight: Math.min(screenHeight * 0.78, 720),
                  minHeight: Math.max(320, screenHeight * 0.48),
                  opacity: historyCardOpacity,
                  transform: [{ translateY: historyTranslateY }],
                },
              ]}
            >
              <View style={[styles.modalGrip, { backgroundColor: colors.border.medium }]} />
              <View style={[styles.modalHeader, { borderBottomColor: colors.border.light }]}>
                <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Transaction History</Text>
                <TouchableOpacity onPress={closeHistory} style={[styles.closeBtn, { backgroundColor: colors.background.tertiary }]}>
                  <X size={20} color={colors.text.primary} />
                </TouchableOpacity>
              </View>

              {/* 🔥 SKELETON: List History (Contoh Jika Sedang Loading) */}
              {isMemberLoading || isHistoryLoading ? (
                 <View style={{ padding: 20 }}>
                    {[1, 2, 3].map(i => <SkeletonLoader key={i} height={60} style={{ marginBottom: 16 }} />)}
                 </View>
              ) : (
                <FlatList
                  data={transactionItems}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.historyListContent}
                  style={styles.historyList}
                  onEndReached={hasAnyHistory ? loadOlderHistory : undefined}
                  onEndReachedThreshold={0.35}
                  ListFooterComponent={
                    hasAnyHistory && hasMoreHistory ? (
                      <View style={styles.historyFooter}>
                        <Text style={[styles.historyFooterText, { color: colors.text.secondary }]}>Scroll up to reveal earlier dates</Text>
                      </View>
                    ) : null
                  }
                  ListEmptyComponent={<View style={{ padding: 40, alignItems: 'center' }}><Text style={[styles.emptyText, { color: colors.text.secondary }]}>No transaction history yet.</Text></View>}
                  renderItem={({ item, index }) => {
                    const isRedeem = item.type === 'redeem';
                    const previousItem = transactionItems[index - 1];
                    const currentDay = formatHistoryDayLabel(item.createdAtIso);
                    const previousDay = previousItem ? formatHistoryDayLabel(previousItem.createdAtIso) : null;
                    const showDateDivider = index === 0 || currentDay !== previousDay;
                    return (
                      <View>
                        {showDateDivider && (
                          <View style={styles.dateSection}>
                            <View style={[styles.dateSectionLine, { backgroundColor: colors.border.light }]} />
                            <Text style={[styles.dateSectionLabel, { color: colors.text.secondary }]}>{currentDay}</Text>
                          </View>
                        )}
                        <View style={[styles.historyItem, { borderBottomColor: colors.border.light }]}>
                          <View style={[styles.historyIconBg, { backgroundColor: isRedeem ? colors.status.warningBg : colors.status.successBg }]}>
                            {isRedeem ? <ArrowDownCircle size={18} color={colors.status.warningText} /> : <ArrowUpCircle size={18} color={colors.status.successText} />}
                          </View>
                          <View style={styles.historyMain}>
                            <View style={styles.historyTopRow}>
                              <Text style={[styles.historyTitle, { color: colors.text.primary }]}>{item.title}</Text>
                              <Text style={[styles.historyAmount, { color: isRedeem ? colors.status.errorText : item.isPending ? colors.status.warningText : item.status === 'rejected' ? colors.status.errorText : colors.status.successText }]}>
                                {item.pointsAmount > 0 ? '+' : ''}{item.pointsAmount} XP
                              </Text>
                            </View>

                            <Text style={[styles.historyDate, { color: colors.text.secondary }]}>
                              {formatHistoryTime(item.createdAtIso)}
                            </Text>

                            {!!item.storeLabel && (
                              <Text style={[styles.historyMetaLine, { color: colors.text.secondary }]} numberOfLines={1}>
                                {item.storeLabel}
                              </Text>
                            )}

                            {!!item.referenceLabel && (
                              <Text style={[styles.historyReference, { color: colors.text.tertiary }]} numberOfLines={1}>
                                Ref {item.referenceLabel}
                              </Text>
                            )}

                            {item.isPending && (
                              <View style={[styles.pendingBadge, { backgroundColor: colors.status.warningBg }]}>
                                <Text style={[styles.pendingBadgeText, { color: colors.status.warningText }]}>Pending validation</Text>
                              </View>
                            )}
                            {item.status === 'rejected' && (
                              <View style={[styles.pendingBadge, { backgroundColor: colors.status.errorBg }]}>
                                <Text style={[styles.pendingBadgeText, { color: colors.status.errorText }]}>Rejected</Text>
                              </View>
                            )}
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  header: { alignItems: 'center', marginTop: 20, marginBottom: 24 },
  avatarContainer: { position: 'relative', marginBottom: 16 },
  editBadge: { position: 'absolute', bottom: 0, right: 0, padding: 8, borderRadius: 20, borderWidth: 2, borderColor: '#FFF', elevation: 3 },
  userName: { fontSize: 24, fontWeight: 'bold', marginTop: 4 },
  userPhone: { fontSize: 14, marginTop: 4 },
  adminBadge: { marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  adminBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  pointsSummaryRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  pointsSummaryCard: { flex: 1, borderRadius: 18, borderWidth: 1, padding: 16 },
  pointsSummaryLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  pointsSummaryValue: { fontSize: 24, fontWeight: '800' },
  pointsSummaryHint: { fontSize: 12, marginTop: 6 },
  menuSection: { marginBottom: 24 },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, marginLeft: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 10, elevation: 1 },
  menuIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  menuTextContainer: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: '600' },
  menuSubtitle: { fontSize: 12, marginTop: 2 },
  versionText: { textAlign: 'center', fontSize: 12, opacity: 0.5, marginBottom: 20 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'transparent' },
  inlineOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 60 },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  modalBackdropTint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(21,17,17,0.3)' },
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
  modalGrip: { alignSelf: 'center', width: 44, height: 5, borderRadius: 999, marginTop: 10, marginBottom: 4 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  closeBtn: { padding: 8, borderRadius: 20 },
  historyList: { flex: 1 },
  historyListContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  historyFooter: { alignItems: 'center', justifyContent: 'center', paddingTop: 8, paddingBottom: 10, gap: 8 },
  historyFooterText: { fontSize: 12 },
  dateSection: { paddingTop: 12, paddingBottom: 6 },
  dateSectionLine: { height: 1, marginBottom: 10 },
  dateSectionLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase' },
  emptyText: { textAlign: 'center', fontSize: 14 },
  historyItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 14, borderBottomWidth: 1 },
  historyIconBg: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  historyMain: { flex: 1 },
  historyTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  historyTitle: { fontSize: 16, fontWeight: '600' },
  historyDate: { fontSize: 12, marginTop: 2 },
  historyMetaLine: { fontSize: 13, marginTop: 4 },
  historyReference: { fontSize: 11, marginTop: 2 },
  historyAmount: { fontSize: 15, fontWeight: '700', marginTop: 1 },
  pendingBadge: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  pendingBadgeText: { fontSize: 11, fontWeight: '700' },
});
