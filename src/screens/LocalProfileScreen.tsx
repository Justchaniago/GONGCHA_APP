import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  Alert,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  User,
  History,
  ChevronRight,
  Lock,
  ShieldCheck,
  MapPin,
  HelpCircle,
  LogOut,
  ScanFace,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { buildLocalProfileParityViewModel } from '../application/profileParity/ProfileParityViewModel';
import { createLocalLoyaltyActivityController } from '../composition/loyaltyActivity';
import { createLocalLoyaltySummaryController } from '../composition/loyaltySummary';
import DecorativeBackground from '../components/DecorativeBackground';
import { useMember } from '../context/MemberContext';
import { useSecurity } from '../context/SecurityContext';
import { AuthService } from '../services/AuthService';
import { useLocalLoyaltyActivity } from '../presentation/loyaltyActivity/useLocalLoyaltyActivity';
import { useLocalLoyaltySummary } from '../presentation/loyaltySummary/useLocalLoyaltySummary';
import { savedLoginCredentialCapability } from '../composition/auth';
import {
  ProfileHistorySheet,
  ProfileIdentityStatsView,
} from '../presentation/profileParity/ProfileParityView';
import { colors } from '../theme/colorTokens';

// ==========================================
// SUB-KOMPONEN MENU ITEM
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

export default function LocalProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { member, loading: memberLoading } = useMember();
  const { openSecuritySettings, pinEnabled, biometricEnabled, appLockEnabled } = useSecurity();
  const uid = member?.uid ?? null;

  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioHasCreds, setBioHasCreds] = useState(false);

  useEffect(() => {
    async function checkBio() {
      const available = await savedLoginCredentialCapability.isAvailable();
      setBioAvailable(available);
      if (available) {
        const hasCreds = await savedLoginCredentialCapability.hasSavedCredentials();
        setBioHasCreds(hasCreds);
      }
    }
    checkBio();
  }, []);

  const handleToggleBioLogin = async () => {
    if (bioHasCreds) {
      Alert.alert(
        'Disable Face ID Login',
        'Are you sure you want to turn off Face ID login on this device?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              await savedLoginCredentialCapability.clearCredentials();
              setBioHasCreds(false);
            },
          },
        ]
      );
    } else {
      if (!member?.email) return;
      const success = await savedLoginCredentialCapability.authenticate('Verify Face ID to enable login');
      if (!success) return;

      if (Platform.OS === 'ios') {
        Alert.prompt(
          'Enable Face ID Login',
          'Enter your password to secure Face ID login for ' + member.email + ':',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Enable',
              onPress: async (password: string | undefined) => {
                if (password) {
                  await savedLoginCredentialCapability.saveCredentials(member.email, password);
                  setBioHasCreds(true);
                  Alert.alert('Face ID Enabled', 'You can now log in with Face ID next time.');
                }
              },
            },
          ],
          'secure-text'
        );
      } else {
        Alert.alert('Unsupported', 'Please activate Face ID on the login page next time you log in.');
      }
    }
  };

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

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => void AuthService.logout() },
    ]);
  };

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
            { paddingBottom: 100 + insets.bottom },
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
            onEdit={() => navigation.navigate('EditProfile')}
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

          {/* ACCOUNT SECTION */}
          <View style={[styles.menuSection, { paddingHorizontal: horizontalPadding }]}>
            <Text style={[styles.sectionHeader, { color: colors.text.primary }]}>
              Account
            </Text>
            
            <MenuItem 
              icon={User} 
              title="Edit Profile" 
              subtitle="Name, Phone, Email & Photo" 
              onPress={() => navigation.navigate('EditProfile')} 
            />

            <MenuItem 
              icon={Lock} 
              title="Change Password" 
              subtitle="Update your account password" 
              onPress={() => navigation.navigate('UpdatePassword', { mode: 'change' })} 
            />

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

            {bioAvailable && (
              <MenuItem
                icon={ScanFace}
                title="Face ID Login"
                subtitle={bioHasCreds ? 'Enabled for ' + member?.email : 'Enable login with Face ID'}
                onPress={handleToggleBioLogin}
              />
            )}



            <MenuItem 
              icon={MapPin} 
              title="Find a Store" 
              subtitle="Locate nearest Gong Cha" 
              onPress={() => navigation.navigate('StoreLocator')} 
            />
          </View>

          {/* SUPPORT SECTION */}
          <View style={[styles.menuSection, { paddingHorizontal: horizontalPadding }]}>
            <Text style={[styles.sectionHeader, { color: colors.text.primary }]}>
              Support
            </Text>
            <MenuItem 
              icon={HelpCircle} 
              title="Help Center" 
              onPress={() => navigation.navigate('HelpCenter')} 
            />
            <MenuItem 
              icon={LogOut} 
              title="Log Out" 
              isDestructive 
              onPress={handleLogout} 
            />
          </View>

          <Text style={[styles.versionText, { color: colors.text.secondary }]}>
            App Version 1.0.3 (FastAPI Core)
          </Text>
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
  scrollContent: { paddingBottom: 100 },
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
  menuTextContainer: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: '600' },
  menuSubtitle: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    opacity: 0.5,
    marginBottom: 20,
  },
});
