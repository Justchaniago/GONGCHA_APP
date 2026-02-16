import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  FlatList,
  Easing,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User,
  History,
  ArrowDownCircle,
  ArrowUpCircle,
  Settings,
  LogOut,
  ChevronRight,
  MapPin,
  HelpCircle,
  X,
  ShieldCheck, // Icon Admin
} from 'lucide-react-native';
import { useNavigation, CommonActions, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'; // PENTING: Untuk fix error tabBarHidden

import DecorativeBackground from '../components/DecorativeBackground';
import ScreenFadeTransition from '../components/ScreenFadeTransition';
import UserAvatar from '../components/UserAvatar';
import { MockBackend } from '../services/MockBackend';
import { AuthService } from '../services/AuthService';
import { MemberTier, UserProfile, XpRecord } from '../types/types';
import { RootStackParamList } from '../navigation/AppNavigator';

const TIER_CARD_THEME: Record<
  MemberTier,
  {
    gradient: [string, string];
    tierText: string;
    tierBg: string;
    border: string;
    shadow: string;
    accent: string;
    label: string;
  }
> = {
  Silver: {
    gradient: ['#3C4552', '#697485'],
    tierText: '#EEF2FF',
    tierBg: 'rgba(238,242,255,0.2)',
    border: 'rgba(203,213,225,0.36)',
    shadow: '#334155',
    accent: '#E2E8F0',
    label: 'rgba(226,232,240,0.72)',
  },
  Gold: {
    gradient: ['#2A1F1F', '#5E4B45'],
    tierText: '#FFD77A',
    tierBg: 'rgba(255,215,122,0.2)',
    border: 'rgba(243,198,119,0.34)',
    shadow: '#3A2E2A',
    accent: '#F3C677',
    label: 'rgba(243,198,119,0.72)',
  },
  Platinum: {
    gradient: ['#2E1F52', '#4A2E8F'],
    tierText: '#E9D5FF',
    tierBg: 'rgba(233,213,255,0.2)',
    border: 'rgba(196,181,253,0.34)',
    shadow: '#4C1D95',
    accent: '#DDD6FE',
    label: 'rgba(221,214,254,0.75)',
  },
};

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [user, setUser] = useState<UserProfile | null>(null);
  
  // Animation State
  const [showHistory, setShowHistory] = useState(false);
  const historyTranslateY = useRef(new Animated.Value(380)).current;
  const historyBackdropOpacity = useRef(new Animated.Value(0)).current;
  const historyCardOpacity = useRef(new Animated.Value(0)).current;
  const historyCardScale = useRef(new Animated.Value(0.98)).current;

  // Blur Logic
  const useBlurBackdrop = true; 
  const backdropBlurIntensity = Platform.OS === 'ios' ? 20 : 80; 

  const tier: MemberTier = user?.tier || 'Silver';
  const cardTheme = TIER_CARD_THEME[tier];
  
  const isCompact = screenWidth < 360;
  const horizontalPadding = isCompact ? 14 : 20;
  const avatarSize = isCompact ? 88 : 100;
  const logoWrapSize = isCompact ? 54 : 62;
  const logoSize = isCompact ? 40 : 46;

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  // FIX PENTING: Logic menyembunyikan TabBar yang support v6/v7
  useEffect(() => {
    // Kita ambil parent navigator (Tab Navigator)
    const parent = navigation.getParent<BottomTabNavigationProp<any>>();
    
    if (parent) {
      parent.setOptions({
        // Gunakan tabBarStyle: { display: 'none' } alih-alih tabBarHidden
        tabBarStyle: { display: showHistory ? 'none' : 'flex' }
      });
    }
    
    return () => {
      parent?.setOptions({
        tabBarStyle: { display: 'flex' }
      });
    };
  }, [navigation, showHistory]);

  const loadData = async () => {
    try {
      const data = await MockBackend.getUser();
      setUser(data);
    } catch (error) {
      console.log('Failed to load user data', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthService.logout();
            } catch {}
            const rootNavigation = navigation.getParent?.() || navigation;
            rootNavigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'Welcome' }],
              })
            );
          },
        },
      ]
    );
  };

  const handleTestNotification = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert('Permission needed', 'Please allow notifications to see the preview.');
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'GongCha Admin',
          body: '🔔 Test notification triggered successfully!',
        },
        // FIX: Hapus "type: 'time'", cukup "seconds" saja agar tidak error
        trigger: { seconds: 1 },
      });
    } catch (error: any) {
      Alert.alert('Notification error', String(error?.message || error));
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const openHistory = () => {
    setShowHistory(true);
    historyTranslateY.setValue(screenHeight);
    historyBackdropOpacity.setValue(0);
    historyCardOpacity.setValue(0);
    historyCardScale.setValue(0.95);

    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.spring(historyTranslateY, {
          toValue: 0, damping: 20, stiffness: 120, mass: 0.8, useNativeDriver: true,
        }),
        Animated.timing(historyBackdropOpacity, {
          toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
        Animated.timing(historyCardOpacity, {
          toValue: 1, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
        Animated.spring(historyCardScale, {
          toValue: 1, damping: 20, stiffness: 150, useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const closeHistory = () => {
    Animated.parallel([
      Animated.timing(historyTranslateY, {
        toValue: screenHeight, duration: 250, easing: Easing.in(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(historyBackdropOpacity, {
        toValue: 0, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: true,
      }),
      Animated.timing(historyCardOpacity, {
        toValue: 0, duration: 150, useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setShowHistory(false);
    });
  };

  const HistoryModal = () => {
    if (!showHistory) return null;
    return (
      <View style={styles.inlineOverlay} pointerEvents="box-none">
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalBackdrop, { opacity: historyBackdropOpacity }]}>
            {useBlurBackdrop ? (
              <BlurView intensity={backdropBlurIntensity} tint="dark" experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFillObject} />
            ) : null}
            <View style={styles.modalBackdropTint} />
            <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={closeHistory} />
          </Animated.View>
          <Animated.View
            style={[
              styles.bottomSheetCard,
              {
                minHeight: Math.max(320, screenHeight * 0.5),
                opacity: historyCardOpacity,
                transform: [{ translateY: historyTranslateY }, { scale: historyCardScale }],
              },
            ]}
          >
            <View style={styles.modalGrip} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Transaction History</Text>
              <TouchableOpacity onPress={closeHistory} style={styles.closeBtn}>
                <X size={20} color="#2A1F1F" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={[...(user?.xpHistory || [])].reverse()}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.historyListContent}
              ListEmptyComponent={<View style={{ padding: 40, alignItems: 'center' }}><Text style={styles.emptyText}>No transaction history yet.</Text></View>}
              renderItem={({ item }: { item: XpRecord }) => {
                const isRedeem = (item.type || 'earn') === 'redeem';
                return (
                  <View style={styles.historyItem}>
                    <View style={[styles.historyIconBg, isRedeem && styles.historyIconBgRedeem]}>
                      {isRedeem ? <ArrowDownCircle size={18} color="#C2410C" /> : <ArrowUpCircle size={18} color="#15803D" />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyTitle}>{isRedeem ? 'Points Redeemed' : 'Points Earned'}</Text>
                      <Text style={styles.historyContext}>{item.context || (isRedeem ? 'Reward Redeem' : 'Drink Purchase')}</Text>
                      <Text style={styles.historyMeta}>{item.location || 'Gong Cha App'}</Text>
                      <Text style={styles.historyDate}>{formatDate(item.date)}</Text>
                    </View>
                    <Text style={[styles.historyAmount, isRedeem ? styles.historyAmountRedeem : styles.historyAmountEarn]}>{isRedeem ? '-' : '+'}{item.amount} XP</Text>
                  </View>
                );
              }}
            />
          </Animated.View>
        </View>
      </View>
    );
  };

  const MenuItem = ({ icon: Icon, title, subtitle, onPress, isDestructive = false }: any) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={[styles.menuIcon, isDestructive && styles.menuIconDestructive]}>
        <Icon size={20} color={isDestructive ? '#FFF' : '#B91C2F'} />
      </View>
      <View style={styles.menuTextContainer}>
        <Text style={[styles.menuTitle, isDestructive && styles.textDestructive]}>{title}</Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      {!isDestructive && <ChevronRight size={16} color="#CDC" />}
    </TouchableOpacity>
  );

  return (
    <ScreenFadeTransition>
      <View style={styles.root}>
        <StatusBar style="dark" translucent backgroundColor="transparent" />
        <DecorativeBackground />

        <View style={[styles.container, { paddingTop: insets.top + 4 }]}> 
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
          >
            {/* --- HEADER PROFILE --- */}
            <View style={styles.header}>
              <View style={styles.avatarContainer}>
                <UserAvatar
                  name={user?.name || 'Guest'}
                  photoURL={user?.photoURL}
                  size={avatarSize}
                />
                <TouchableOpacity 
                  style={styles.editBadge} 
                  onPress={() => navigation.navigate('EditProfile')}
                  activeOpacity={0.8}
                >
                  <Settings size={14} color="#FFF" />
                </TouchableOpacity>
              </View>
              <Text style={styles.userName}>{user?.name || 'Guest'}</Text>
              <Text style={styles.userPhone}>{user?.phoneNumber || '-'}</Text>
              
              {user?.role === 'admin' && (
                 <View style={styles.adminBadge}>
                    <Text style={styles.adminBadgeText}>ADMIN MODE</Text>
                 </View>
              )}
            </View>

            {/* --- MEMBERSHIP CARD --- */}
            <LinearGradient
              colors={cardTheme.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.memberCard,
                {
                  marginHorizontal: horizontalPadding,
                  borderColor: cardTheme.border,
                  shadowColor: cardTheme.shadow,
                  padding: isCompact ? 20 : 24,
                },
              ]}
            >
              <View style={styles.cardRow}>
                <View
                  style={[
                    styles.cardLogoWrap,
                    { width: logoWrapSize, height: logoWrapSize, borderRadius: logoWrapSize / 2 },
                  ]}
                >
                  <Image
                    source={require('../../assets/images/logo1.webp')}
                    style={[styles.cardLogo, { width: logoSize, height: logoSize }]}
                  />
                </View>
                <View style={[styles.tierTag, { backgroundColor: cardTheme.tierBg }]}> 
                  <Text style={[styles.tierTagText, { color: cardTheme.tierText }]}>{user?.tier || 'MEMBER'}</Text>
                </View>
              </View>

              <View style={styles.cardContent}>
                <Text style={[styles.cardLabel, { color: cardTheme.label }]}>Member ID</Text>
                <Text style={styles.cardValue}>{user?.id || '.... .... ....'}</Text>
              </View>

              <View style={styles.cardFooter}>
                <View>
                  <Text style={[styles.cardLabel, { color: cardTheme.label }]}>Lifetime XP</Text>
                  <Text style={[styles.xpValue, { color: cardTheme.accent }]}>{user?.tierXp || 0} XP</Text>
                </View>
                <View>
                  <Text style={[styles.cardLabel, { color: cardTheme.label }]}>Joined</Text>
                  <Text style={[styles.xpValue, { color: cardTheme.accent }]}>{user ? new Date(user.joinedDate).getFullYear() : '...'}</Text>
                </View>
              </View>
            </LinearGradient>

            {/* --- MENU SECTIONS --- */}
            <View style={[styles.menuSection, { paddingHorizontal: horizontalPadding }]}>
              <Text style={styles.sectionHeader}>Account</Text>

              <MenuItem
                icon={User}
                title="Edit Profile"
                subtitle="Name, Phone, Email & Photo"
                onPress={() => navigation.navigate('EditProfile')}
              />

              <MenuItem
                icon={History}
                title="Transaction History"
                subtitle="Check your earned points"
                onPress={openHistory}
              />

              <MenuItem
                icon={MapPin}
                title="Find a Store"
                subtitle="Locate nearest Gong Cha"
                onPress={() => navigation.navigate('StoreLocator')}
              />
            </View>

            {/* --- ADMIN GOD MODE PANEL --- */}
            {user?.role === 'admin' && (
              <View style={[styles.menuSection, { paddingHorizontal: horizontalPadding }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 4 }}>
                   <ShieldCheck size={18} color="#B91C2F" style={{ marginRight: 8 }} />
                   <Text style={[styles.sectionHeader, { marginBottom: 0, marginLeft: 0, color: '#B91C2F' }]}>
                      Admin / Debug Panel
                   </Text>
                </View>

                {/* Boost XP */}
                <MenuItem
                  icon={ArrowUpCircle}
                  title="Inject 5.000 XP"
                  subtitle="Instant Level Up"
                  onPress={async () => {
                    Alert.alert('Processing', 'Adding 5.000 XP...');
                    try {
                      await MockBackend.addTransaction(5000 * 100); 
                      await loadData();
                      Alert.alert('Success', '5.000 XP Added!');
                    } catch (e) {
                      Alert.alert('Error', 'Failed to inject XP');
                    }
                  }}
                />

                {/* Reset Account */}
                <MenuItem
                  icon={LogOut}
                  title="Reset Account Data"
                  subtitle="Wipe Data (Back to New User)"
                  isDestructive
                  onPress={() => {
                    Alert.alert(
                      'Reset Data?',
                      'This will wipe all points & history. You will become a new user.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'RESET DATA',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await MockBackend.resetData();
                              if (user?.phoneNumber) {
                                await MockBackend.initUser(user.phoneNumber);
                              }
                              await loadData();
                              Alert.alert('Reset Complete', 'Welcome back, new user!');
                            } catch (e) {
                              Alert.alert('Error', 'Failed to reset data');
                            }
                          },
                        },
                      ]
                    );
                  }}
                />

                {/* Test Notif */}
                <MenuItem
                  icon={ArrowDownCircle}
                  title="Test Notification"
                  subtitle="Trigger Local Push"
                  onPress={handleTestNotification}
                />
              </View>
            )}

            <View style={[styles.menuSection, { paddingHorizontal: horizontalPadding }]}>
              <Text style={styles.sectionHeader}>Support</Text>
              <MenuItem icon={HelpCircle} title="Help Center" onPress={() => {}} />
              <MenuItem icon={LogOut} title="Log Out" isDestructive onPress={handleLogout} />
            </View>

            <Text style={styles.versionText}>App Version 1.0.2 (Pilot)</Text>
          </ScrollView>
        </View>

        <HistoryModal />
      </View>
    </ScreenFadeTransition>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF8F0' },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  header: { alignItems: 'center', marginTop: 20, marginBottom: 24 },
  avatarContainer: { position: 'relative', marginBottom: 16 },
  editBadge: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: '#2A1F1F', padding: 8, borderRadius: 20,
    borderWidth: 2, borderColor: '#FFF', elevation: 3,
  },
  userName: { fontSize: 24, fontWeight: 'bold', color: '#2A1F1F' },
  userPhone: { fontSize: 14, color: '#8C7B75', marginTop: 4 },
  
  adminBadge: {
    marginTop: 8, backgroundColor: '#B91C2F', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6
  },
  adminBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },

  memberCard: {
    marginHorizontal: 20, borderRadius: 24, padding: 24, marginBottom: 30,
    borderWidth: 1.5, elevation: 8,
    shadowColor: '#2A1F1F', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 8 },
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  cardLogoWrap: {
    width: 62, height: 62, borderRadius: 31,
    backgroundColor: 'rgba(255,255,255,0.14)', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  cardLogo: { width: 46, height: 46, resizeMode: 'contain', opacity: 0.98 },
  tierTag: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  tierTagText: { color: '#D4A853', fontWeight: 'bold', fontSize: 12, letterSpacing: 1.2 },
  cardContent: { marginBottom: 24 },
  cardLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  cardValue: { color: '#FFF', fontSize: 18, fontFamily: 'monospace', letterSpacing: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  xpValue: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  menuSection: { paddingHorizontal: 20, marginBottom: 24 },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#2A1F1F', marginBottom: 12, marginLeft: 4 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 10,
    elevation: 1, shadowColor: '#3A2E2A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4,
  },
  menuIcon: {
    width: 40, height: 40, backgroundColor: '#FFF5E1', borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  menuIconDestructive: { backgroundColor: '#B91C2F' },
  menuTextContainer: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: '600', color: '#2A1F1F' },
  menuSubtitle: { fontSize: 12, color: '#8C7B75', marginTop: 2 },
  textDestructive: { color: '#B91C2F' },

  versionText: { textAlign: 'center', color: '#8C7B75', fontSize: 12, opacity: 0.5, marginBottom: 20 },

  // Modal Styles
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'transparent' },
  inlineOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 60 },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  modalBackdropTint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(21,17,17,0.3)' },
  bottomSheetCard: {
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '85%', paddingBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 20,
  },
  modalGrip: { alignSelf: 'center', width: 44, height: 5, borderRadius: 999, backgroundColor: '#E5E7EB', marginTop: 10, marginBottom: 4 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#2A1F1F' },
  closeBtn: { padding: 8, backgroundColor: '#F5F5F5', borderRadius: 20 },
  historyListContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  emptyText: { textAlign: 'center', color: '#8C7B75', fontSize: 14 },
  historyItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F9F9F9' },
  historyIconBg: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  historyIconBgRedeem: { backgroundColor: '#FFF7ED' },
  historyTitle: { fontSize: 16, fontWeight: '600', color: '#2A1F1F' },
  historyContext: { fontSize: 13, color: '#6B5A55', marginTop: 2 },
  historyMeta: { fontSize: 12, color: '#9A8A85', marginTop: 1 },
  historyDate: { fontSize: 12, color: '#8C7B75', marginTop: 2 },
  historyAmount: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  historyAmountEarn: { color: '#15803D' },
  historyAmountRedeem: { color: '#C2410C' },
});