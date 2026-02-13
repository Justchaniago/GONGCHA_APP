import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User,
  History,
  Settings,
  LogOut,
  ChevronRight,
  CreditCard,
  HelpCircle,
  X,
} from 'lucide-react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import DecorativeBackground from '../components/DecorativeBackground';
import ScreenFadeTransition from '../components/ScreenFadeTransition';
import { MockBackend } from '../services/MockBackend';
import { MemberTier, UserProfile, XpRecord } from '../types/types';

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
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showHistory, setShowHistory] = useState(false);
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

  const loadData = async () => {
    const data = await MockBackend.getUser();
    setUser(data);
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out? This will reset your local data for testing purposes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await MockBackend.resetData();
            navigation.dispatch(
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

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const HistoryModal = () => (
    <Modal
      visible={showHistory}
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={() => setShowHistory(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>History</Text>
          <TouchableOpacity onPress={() => setShowHistory(false)} style={styles.closeBtn}>
            <X size={24} color="#2A1F1F" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={[...(user?.xpHistory || [])].reverse()}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No transaction history yet.</Text>}
          renderItem={({ item }: { item: XpRecord }) => (
            <View style={styles.historyItem}>
              <View style={styles.historyIconBg}>
                <History size={20} color="#B91C2F" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.historyTitle}>Points Earned</Text>
                <Text style={styles.historyDate}>{formatDate(item.date)}</Text>
              </View>
              <Text style={styles.historyAmount}>+{item.amount} XP</Text>
            </View>
          )}
        />
      </View>
    </Modal>
  );

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
            <View style={styles.header}>
              <View style={styles.avatarContainer}>
                <Image
                  source={require('../../assets/images/avatar1.jpeg')}
                  style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
                />
                <View style={styles.editBadge}>
                  <Settings size={12} color="#FFF" />
                </View>
              </View>
              <Text style={styles.userName}>{user?.name || 'Guest'}</Text>
              <Text style={styles.userPhone}>{user?.phoneNumber || '-'}</Text>
            </View>

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
                    source={require('../../assets/images/logo1.png')}
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

            <View style={[styles.menuSection, { paddingHorizontal: horizontalPadding }]}>
              <Text style={styles.sectionHeader}>Account</Text>

              <MenuItem
                icon={User}
                title="Edit Profile"
                subtitle="Name, Phone, Email"
                onPress={() => Alert.alert('Coming Soon', 'Edit profile feature is under development.')}
              />

              <MenuItem
                icon={History}
                title="Transaction History"
                subtitle="Check your earned points"
                onPress={() => setShowHistory(true)}
              />

              <MenuItem icon={CreditCard} title="Payment Methods" onPress={() => {}} />
            </View>

            <View style={[styles.menuSection, { paddingHorizontal: horizontalPadding }]}>
              <Text style={styles.sectionHeader}>Support</Text>
              <MenuItem icon={HelpCircle} title="Help Center" onPress={() => {}} />
              <MenuItem icon={LogOut} title="Log Out" isDestructive onPress={handleLogout} />
            </View>

            <Text style={styles.versionText}>App Version 1.0.0 (Pilot)</Text>
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
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: '#FFF' },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#2A1F1F',
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  userName: { fontSize: 24, fontWeight: 'bold', color: '#2A1F1F' },
  userPhone: { fontSize: 14, color: '#8C7B75', marginTop: 4 },

  memberCard: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    marginBottom: 30,
    borderWidth: 1.5,
    elevation: 8,
    shadowColor: '#2A1F1F',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  cardLogoWrap: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  cardLogo: { width: 46, height: 46, resizeMode: 'contain', opacity: 0.98 },
  tierTag: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  tierTagText: { color: '#D4A853', fontWeight: 'bold', fontSize: 12, letterSpacing: 1.2 },
  cardContent: { marginBottom: 24 },
  cardLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardValue: { color: '#FFF', fontSize: 18, fontFamily: 'monospace', letterSpacing: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  xpValue: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  menuSection: { paddingHorizontal: 20, marginBottom: 24 },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#2A1F1F', marginBottom: 12, marginLeft: 4 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    elevation: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#FFF5E1',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuIconDestructive: { backgroundColor: '#B91C2F' },
  menuTextContainer: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: '600', color: '#2A1F1F' },
  menuSubtitle: { fontSize: 12, color: '#8C7B75', marginTop: 2 },
  textDestructive: { color: '#B91C2F' },

  versionText: { textAlign: 'center', color: '#8C7B75', fontSize: 12, opacity: 0.5, marginBottom: 20 },

  modalContainer: { flex: 1, backgroundColor: '#FFF' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#2A1F1F' },
  closeBtn: { padding: 8, backgroundColor: '#F5F5F5', borderRadius: 20 },
  emptyText: { textAlign: 'center', color: '#8C7B75', marginTop: 40 },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F9F9F9',
  },
  historyIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  historyTitle: { fontSize: 16, fontWeight: '600', color: '#2A1F1F' },
  historyDate: { fontSize: 12, color: '#8C7B75', marginTop: 2 },
  historyAmount: { fontSize: 16, fontWeight: 'bold', color: '#4CAF50' },
});
