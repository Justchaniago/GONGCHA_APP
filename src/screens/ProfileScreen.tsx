import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, useWindowDimensions,
  DeviceEventEmitter, RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications/build/Notifications.types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User, History as HistoryIcon,
  LogOut, ChevronRight, MapPin, HelpCircle, ShieldCheck, Lock, Link,
} from 'lucide-react-native';
import { linkGoogleToAccount, statusCodes } from '../services/GoogleSignInService';
import GoogleIcon from '../components/GoogleIcon';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { buildLegacyProfileParityViewModel } from '../application/profileParity/ProfileParityViewModel';
import DecorativeBackground from '../components/DecorativeBackground';
import { AuthService } from '../services/AuthService';
import { TransactionService, type MemberTransactionHistoryItem } from '../services/TransactionService';
import { RootStackParamList } from '../navigation/AppNavigator';

// 🔥 IMPORT SYARAF BARU & SKELETON
import { useMember } from '../context/MemberContext';
import { useSecurity } from '../context/SecurityContext';
import { colors } from '../theme/colorTokens';
import {
  ProfileHistorySheet,
  ProfileIdentityStatsView,
} from '../presentation/profileParity/ProfileParityView';

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

// ==========================================
// 2. KOMPONEN UTAMA
// ==========================================
export default function ProfileScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  
  // 🔥 AMBIL DATA DARI CONTEXT (CCTV REALTIME)
  const { member, loading: isMemberLoading } = useMember();
  const { openSecuritySettings, pinEnabled, biometricEnabled, appLockEnabled } = useSecurity();
  const [todayTransactionItems, setTodayTransactionItems] = useState<MemberTransactionHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [visibleDayCount, setVisibleDayCount] = useState(1);

  // Auth provider detection
  const authProviders = AuthService.getCurrentIdentity()?.providerIds ?? [];
  const hasPasswordProvider = authProviders.includes('password');
  const hasGoogleProvider = authProviders.includes('google.com');
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    setVisibleDayCount(1);
    setTimeout(() => setIsRefreshing(false), 1000);
  }, []);

  // Animation State
  const [showHistory, setShowHistory] = useState(false);
  const isCompact = screenWidth < 360;
  const horizontalPadding = isCompact ? 14 : 20;
  const avatarSize = isCompact ? 88 : 100;
  const profileModel = useMemo(
    () =>
      buildLegacyProfileParityViewModel(
        member,
        todayTransactionItems,
        visibleDayCount,
      ),
    [member, todayTransactionItems, visibleDayCount],
  );

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
    if (!profileModel.history.hasMore) {
      return;
    }
    setVisibleDayCount((current) => current + 1);
  };

  const handleLogout = () => {
    Alert.alert(t('profile.logOut'), t('profile.logOutConfirm'), [
      { text: t('profile.cancel'), style: 'cancel' },
      {
        text: t('profile.logOut'),
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

  const handleLinkGoogle = async () => {
    setIsLinkingGoogle(true);
    try {
      await linkGoogleToAccount();
      Alert.alert(t('profile.success'), t('profile.googleConnected'));
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) return;
      if (error.code === statusCodes.IN_PROGRESS) return;
      if (error.code === 'auth/credential-already-in-use') {
        Alert.alert(t('profile.googleAccountExists'), t('profile.googleAlreadyUsed'));
        return;
      }
      Alert.alert(t('profile.googleLinkFailed'), error.message || t('profile.googleLinkFailed'));
    } finally {
      setIsLinkingGoogle(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('profile.permissionNeeded'), t('profile.notificationPermissionNeeded'));
        return;
      }
      await Notifications.scheduleNotificationAsync({
        content: { title: 'GongCha Admin', body: '🔔 Test notification triggered!' },
        trigger: { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1 },
      });
    } catch (error: any) {
      Alert.alert(t('profile.notificationError'), String(error?.message || error));
    }
  };

  const openHistory = () => {
    setShowHistory(true);
  };

  const closeHistory = () => {
    setShowHistory(false);
  };
  const handleTabBarVisibility = useCallback((hidden: boolean) => {
    DeviceEventEmitter.emit('TOGGLE_TAB_BAR', hidden);
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.background.primary }]}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <DecorativeBackground />

      <View style={[styles.container, { paddingTop: insets.top + 4 }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#B91C2F']} tintColor="#B91C2F" />}>
          
          <ProfileIdentityStatsView
            model={profileModel}
            loading={isMemberLoading}
            avatarSize={avatarSize}
            horizontalPadding={horizontalPadding}
            onEdit={() => navigation.navigate('EditProfile')}
          />

          {/* MENU SECTIONS */}
          <View style={[styles.menuSection, { paddingHorizontal: horizontalPadding }]}>
            <Text style={[styles.sectionHeader, { color: colors.text.primary }]}>{t('profile.accountSection')}</Text>
            <MenuItem icon={User} title={t('profile.editProfile')} subtitle={t('profile.editProfileSub')} onPress={() => navigation.navigate('EditProfile')} />
            {hasPasswordProvider && (
              <MenuItem icon={Lock} title={t('profile.changePassword')} subtitle={t('profile.changePasswordSub')} onPress={() => navigation.navigate('UpdatePassword', { mode: 'change' })} />
            )}
            <MenuItem
              icon={ShieldCheck}
              title={t('profile.securityPin')}
              subtitle={
                pinEnabled
                  ? biometricEnabled
                    ? appLockEnabled
                      ? t('profile.pinBioRelock')
                      : t('profile.pinBio')
                    : appLockEnabled
                      ? t('profile.pinRelock')
                      : t('profile.pinOnly')
                  : t('profile.pinOff')
              }
              onPress={openSecuritySettings}
            />
            <MenuItem icon={HistoryIcon} title={t('profile.transactionHistory')} subtitle={t('profile.transactionHistorySub')} onPress={openHistory} />
            <MenuItem icon={MapPin} title={t('profile.findStore')} subtitle={t('profile.findStoreSub')} onPress={() => navigation.navigate('StoreLocator')} />
          </View>

          {/* CONNECTED ACCOUNTS */}
          <View style={[styles.menuSection, { paddingHorizontal: horizontalPadding }]}>
            <Text style={[styles.sectionHeader, { color: colors.text.primary }]}>{t('profile.connectedAccountsSection')}</Text>
            {hasGoogleProvider ? (
              <View style={styles.menuItem}>
                <View style={[styles.menuIcon, { backgroundColor: '#F8F9FA' }]}>
                  <GoogleIcon size={20} />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={[styles.menuTitle, { color: colors.text.primary }]}>Google</Text>
                  <Text style={styles.menuSubtitle}>{t('profile.googleConnectedStatus')}</Text>
                </View>
                <View style={{ backgroundColor: '#D1FAE5', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#065F46' }}>{t('profile.googleActiveStatus')}</Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.menuItem, isLinkingGoogle && { opacity: 0.6 }]}
                onPress={handleLinkGoogle}
                activeOpacity={0.7}
                disabled={isLinkingGoogle}
              >
                <View style={[styles.menuIcon, { backgroundColor: '#F8F9FA' }]}>
                  <GoogleIcon size={20} />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={[styles.menuTitle, { color: colors.text.primary }]}>
                    {isLinkingGoogle ? t('profile.googleConnecting') : t('profile.googleConnectLabel')}
                  </Text>
                  <Text style={styles.menuSubtitle}>{t('profile.googleConnectSub')}</Text>
                </View>
                <Link size={16} color={colors.text.tertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* SUPPORT */}
          <View style={[styles.menuSection, { paddingHorizontal: horizontalPadding }]}>
            <Text style={[styles.sectionHeader, { color: colors.text.primary }]}>{t('profile.supportSection')}</Text>
            <MenuItem icon={HelpCircle} title={t('profile.helpCenter')} onPress={() => navigation.navigate('HelpCenter')} />
            <MenuItem icon={LogOut} title={t('profile.logOut')} isDestructive onPress={handleLogout} />
          </View>

          <Text style={[styles.versionText, { color: colors.text.secondary }]}>{t('profile.appVersion', { version: '1.0.3' })}</Text>
        </ScrollView>
      </View>

      <ProfileHistorySheet
        visible={showHistory}
        screenHeight={screenHeight}
        model={profileModel}
        loading={isMemberLoading || isHistoryLoading}
        errorMessage={null}
        loadingMore={false}
        onClose={closeHistory}
        onLoadMore={() => void loadOlderHistory()}
        onRetry={() => undefined}
        onTabBarVisibilityChange={handleTabBarVisibility}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  menuSection: { marginBottom: 24 },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, marginLeft: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 10, elevation: 1 },
  menuIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  menuTextContainer: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: '600' },
  menuSubtitle: { fontSize: 12, marginTop: 2 },
  versionText: { textAlign: 'center', fontSize: 12, opacity: 0.5, marginBottom: 20 },
});
