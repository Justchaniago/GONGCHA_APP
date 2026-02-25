import React, { useEffect, useRef, useState } from 'react';
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
  Settings, LogOut, ChevronRight, MapPin, HelpCircle, X, ShieldCheck,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import DecorativeBackground from '../components/DecorativeBackground';
import UserAvatar from '../components/UserAvatar';
import { AuthService } from '../services/AuthService';
import { RootStackParamList } from '../navigation/AppNavigator';

// 🔥 IMPORT SYARAF BARU & SKELETON
import { useMember } from '../context/MemberContext';
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

// ==========================================
// 2. KOMPONEN UTAMA
// ==========================================
export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  
  // 🔥 AMBIL DATA DARI CONTEXT (CCTV REALTIME)
  const { member, loading: isMemberLoading } = useMember();

  // Animation State
  const [showHistory, setShowHistory] = useState(false);
  const historyTranslateY = useRef(new Animated.Value(screenHeight)).current;
  const historyBackdropOpacity = useRef(new Animated.Value(0)).current;
  const historyCardOpacity = useRef(new Animated.Value(0)).current;

  const isCompact = screenWidth < 360;
  const horizontalPadding = isCompact ? 14 : 20;
  const avatarSize = isCompact ? 88 : 100;

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

          {/* MENU SECTIONS */}
          <View style={[styles.menuSection, { paddingHorizontal: horizontalPadding }]}>
            <Text style={[styles.sectionHeader, { color: colors.text.primary }]}>Account</Text>
            <MenuItem icon={User} title="Edit Profile" subtitle="Name, Phone, Email & Photo" onPress={() => navigation.navigate('EditProfile')} />
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
            
            <Animated.View style={[styles.bottomSheetCard, { minHeight: Math.max(320, screenHeight * 0.5), opacity: historyCardOpacity, transform: [{ translateY: historyTranslateY }] }]}>
              <View style={[styles.modalGrip, { backgroundColor: colors.border.medium }]} />
              <View style={[styles.modalHeader, { borderBottomColor: colors.border.light }]}>
                <Text style={[styles.modalTitle, { color: colors.text.primary }]}>Transaction History</Text>
                <TouchableOpacity onPress={closeHistory} style={[styles.closeBtn, { backgroundColor: colors.background.tertiary }]}>
                  <X size={20} color={colors.text.primary} />
                </TouchableOpacity>
              </View>

              {/* 🔥 SKELETON: List History (Contoh Jika Sedang Loading) */}
              {isMemberLoading ? (
                 <View style={{ padding: 20 }}>
                    {[1, 2, 3].map(i => <SkeletonLoader key={i} height={60} style={{ marginBottom: 16 }} />)}
                 </View>
              ) : (
                <FlatList
                  data={[]} // Nanti disambung ke data transaksi realtime di Fase 3
                  keyExtractor={(item, index) => String(index)}
                  contentContainerStyle={styles.historyListContent}
                  ListEmptyComponent={<View style={{ padding: 40, alignItems: 'center' }}><Text style={[styles.emptyText, { color: colors.text.secondary }]}>No transaction history yet.</Text></View>}
                  renderItem={({ item }: any) => {
                    const isRedeem = item.type === 'redeem';
                    return (
                      <View style={[styles.historyItem, { borderBottomColor: colors.border.light }]}>
                        <View style={[styles.historyIconBg, { backgroundColor: isRedeem ? colors.status.warningBg : colors.status.successBg }]}>
                          {isRedeem ? <ArrowDownCircle size={18} color={colors.status.warningText} /> : <ArrowUpCircle size={18} color={colors.status.successText} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.historyTitle, { color: colors.text.primary }]}>{isRedeem ? 'Points Redeemed' : 'Points Earned'}</Text>
                          <Text style={[styles.historyDate, { color: colors.text.secondary }]}>{formatDate(item.date)}</Text>
                        </View>
                        <Text style={[styles.historyAmount, { color: isRedeem ? colors.status.errorText : colors.status.successText }]}>{isRedeem ? '-' : '+'}{item.amount} XP</Text>
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
  bottomSheetCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 20, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, elevation: 20 },
  modalGrip: { alignSelf: 'center', width: 44, height: 5, borderRadius: 999, marginTop: 10, marginBottom: 4 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  closeBtn: { padding: 8, borderRadius: 20 },
  historyListContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  emptyText: { textAlign: 'center', fontSize: 14 },
  historyItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 14, borderBottomWidth: 1 },
  historyIconBg: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  historyTitle: { fontSize: 16, fontWeight: '600' },
  historyDate: { fontSize: 12, marginTop: 2 },
  historyAmount: { fontSize: 15, fontWeight: '700', marginTop: 2 },
});