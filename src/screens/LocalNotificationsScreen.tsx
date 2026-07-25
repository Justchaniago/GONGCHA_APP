// src/screens/LocalNotificationsScreen.tsx

import React, { useMemo, useState } from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Bell, ArrowLeft, RefreshCw, Layers } from 'lucide-react-native';

import { buildLocalNotificationsViewModel } from '../application/notifications/NotificationsViewModel';
import NotificationSheetView from '../presentation/notifications/NotificationSheetView';
import type { LocalStackParamList } from '../navigation/LocalAppNavigator';
import { colors } from '../theme/colorTokens';

const INITIAL_MOCK_NOTIFICATIONS = [
  {
    id: 'mock-notif-1',
    title: 'Selamat! Kamu mendapatkan 50 Leaves dari transaksi Grand Indonesia',
    message: 'Leaves berhasil ditambahkan ke akun Anda.',
    category: 'loyalty',
    isRead: false,
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5m ago
  },
  {
    id: 'mock-notif-2',
    title: 'Voucher Cashback 50% milikmu akan kadaluarsa dalam 2 hari',
    message: 'Gunakan segera voucher Anda di outlet Gong Cha terdekat.',
    category: 'promo',
    isRead: false,
    createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(), // 2h ago
  },
  {
    id: 'mock-notif-3',
    title: 'Pembaruan Kebijakan Privasi Gong Cha App',
    message: 'Kami memperbarui kebijakan privasi kami untuk kenyamanan Anda.',
    category: 'system',
    isRead: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24h ago
  },
];

export default function LocalNotificationsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<LocalStackParamList>>();

  const [notifications, setNotifications] = useState(INITIAL_MOCK_NOTIFICATIONS);
  const [sheetVisible, setSheetVisible] = useState(true);

  const model = useMemo(
    () => buildLocalNotificationsViewModel(notifications),
    [notifications]
  );

  const handleMarkRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleDelete = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleReset = () => {
    setNotifications(INITIAL_MOCK_NOTIFICATIONS);
    setSheetVisible(true);
  };

  const readCount = notifications.filter((n) => n.isRead).length;

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
          accessibilityLabel="Kembali"
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={20} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Harness Notifikasi V1</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <Bell size={28} color="#C8102E" />
          </View>
          <Text style={styles.heroTitle}>Notification Center V1</Text>
          <Text style={styles.heroSubtitle}>
            Uji interaksi swipeable rows, pemetaan status, dan pengelompokan kategori promo, loyalty, dan sistem.
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{model.unreadCount}</Text>
            <Text style={styles.statLbl}>Unread</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{readCount}</Text>
            <Text style={styles.statLbl}>Read</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{notifications.length}</Text>
            <Text style={styles.statLbl}>Total</Text>
          </View>
        </View>

        <View style={styles.actionsBlock}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Buka Bottom Sheet Notifikasi"
            style={styles.primaryBtn}
            onPress={() => setSheetVisible(true)}
          >
            <Bell size={18} color="#FFFFFF" style={styles.btnIcon} />
            <Text style={styles.primaryBtnText}>🔔 Buka Bottom Sheet Notifikasi</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Reset Mock Data & Buka"
            style={styles.secondaryBtn}
            onPress={handleReset}
          >
            <RefreshCw size={16} color={colors.brand.primary} style={styles.btnIcon} />
            <Text style={styles.secondaryBtnText}>Reset Mock Data & Buka</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.debugPanel}>
          <View style={styles.debugHeader}>
            <Layers size={16} color={colors.text.secondary} />
            <Text style={styles.debugTitle}>Struktur Data ViewModel Aktif</Text>
          </View>
          <View style={styles.codeContainer}>
            <Text style={styles.codeText}>
              {JSON.stringify(
                {
                  unreadCount: model.unreadCount,
                  unreadCountLabel: model.unreadCountLabel,
                  items: model.items.map((i) => ({
                    id: i.id,
                    title: i.title.substring(0, 30) + '...',
                    category: i.category,
                    isRead: i.isRead,
                    timeAgoText: i.timeAgoText,
                  })),
                },
                null,
                2
              )}
            </Text>
          </View>
        </View>
      </ScrollView>

      <NotificationSheetView
        visible={sheetVisible}
        model={model}
        onClose={() => setSheetVisible(false)}
        onMarkAllRead={handleMarkAllRead}
        onMarkRead={handleMarkRead}
        onDelete={handleDelete}
      />
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    padding: 8,
    borderRadius: 99,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  placeholder: {
    width: 36,
  },
  content: {
    padding: 24,
    gap: 20,
  },
  heroCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: 24,
    textAlign: 'center',
  },
  heroIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF1F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text.primary,
  },
  statLbl: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.tertiary,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  actionsBlock: {
    gap: 12,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C8102E',
    borderRadius: 14,
    height: 52,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#C8102E',
    borderRadius: 14,
    height: 52,
  },
  secondaryBtnText: {
    color: '#C8102E',
    fontSize: 14,
    fontWeight: '800',
  },
  btnIcon: {
    marginRight: 8,
  },
  debugPanel: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 16,
  },
  debugHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  debugTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  codeContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    color: '#38BDF8',
    lineHeight: 16,
  },
});
