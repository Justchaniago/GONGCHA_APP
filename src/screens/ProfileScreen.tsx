import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, useWindowDimensions,
  DeviceEventEmitter, RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
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

  const handleLinkGoogle = async () => {
    setIsLinkingGoogle(true);
    try {
      await linkGoogleToAccount();
      Alert.alert('Berhasil!', 'Akun Google kamu sudah terhubung. Sekarang bisa login dengan keduanya.');
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) return;
      if (error.code === statusCodes.IN_PROGRESS) return;
      if (error.code === 'auth/credential-already-in-use') {
        Alert.alert('Akun sudah dipakai', 'Google account ini sudah terhubung ke akun lain.');
        return;
      }
      Alert.alert('Gagal menghubungkan', error.message || 'Coba lagi nanti.');
    } finally {
      setIsLinkingGoogle(false);
    }
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
            <Text style={[styles.sectionHeader, { color: colors.text.primary }]}>Account</Text>
            <MenuItem icon={User} title="Edit Profile" subtitle="Name, Phone, Email & Photo" onPress={() => navigation.navigate('EditProfile')} />
            {hasPasswordProvider && (
              <MenuItem icon={Lock} title="Change Password" subtitle="Update your account password" onPress={() => navigation.navigate('UpdatePassword', { mode: 'change' })} />
            )}
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

          {/* CONNECTED ACCOUNTS */}
          <View style={[styles.menuSection, { paddingHorizontal: horizontalPadding }]}>
            <Text style={[styles.sectionHeader, { color: colors.text.primary }]}>Connected Accounts</Text>
            {hasGoogleProvider ? (
              <View style={styles.menuItem}>
                <View style={[styles.menuIcon, { backgroundColor: '#F8F9FA' }]}>
                  <GoogleIcon size={20} />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={[styles.menuTitle, { color: colors.text.primary }]}>Google</Text>
                  <Text style={styles.menuSubtitle}>Terhubung</Text>
                </View>
                <View style={{ backgroundColor: '#D1FAE5', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#065F46' }}>✓ Aktif</Text>
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
                    {isLinkingGoogle ? 'Menghubungkan...' : 'Hubungkan Google'}
                  </Text>
                  <Text style={styles.menuSubtitle}>Login lebih mudah dengan akun Google</Text>
                </View>
                <Link size={16} color={colors.text.tertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* SUPPORT */}
          <View style={[styles.menuSection, { paddingHorizontal: horizontalPadding }]}>
            <Text style={[styles.sectionHeader, { color: colors.text.primary }]}>Support</Text>
            <MenuItem icon={HelpCircle} title="Help Center" onPress={() => navigation.navigate('HelpCenter')} />
            <MenuItem icon={LogOut} title="Log Out" isDestructive onPress={handleLogout} />
          </View>

          <Text style={[styles.versionText, { color: colors.text.secondary }]}>App Version 1.0.3</Text>
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
