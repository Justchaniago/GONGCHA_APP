import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActionSheetIOS,
  Alert,
  Animated,
  Easing,
  FlatList,
  Modal,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { AlertCircle, Bell, CheckCheck, Clock, Gift, Megaphone, Trash2, Trophy } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colorTokens';
import type { NotificationItem, NotificationType } from '../types/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'Baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}h lalu`;
  return new Date(iso).toLocaleDateString('id-ID');
}

type LucideIcon = React.ComponentType<{ size?: number; color?: string }>;
interface TypeConfig { Icon: LucideIcon; bg: string; iconColor: string }

const TYPE_CONFIG: Record<NotificationType, TypeConfig> = {
  tx_verified:      { Icon: Trophy,      bg: '#FEF3C7', iconColor: '#B45309' },
  tx_rejected:      { Icon: AlertCircle, bg: '#FEE2E2', iconColor: '#B91C2F' },
  points_pending:   { Icon: Clock,       bg: '#EDE9FE', iconColor: '#7C3AED' },
  voucher_injected: { Icon: Gift,        bg: '#CCFBF1', iconColor: '#0F766E' },
  broadcast:        { Icon: Megaphone,   bg: '#FFF7ED', iconColor: '#EA580C' },
  targeted:         { Icon: Bell,        bg: '#EEF2FF', iconColor: '#4F46E5' },
  system:           { Icon: Bell,        bg: '#F3F4F6', iconColor: '#6B7280' },
};

// High-priority types get a subtle tinted row background for visual hierarchy
const PRIORITY_BG: Partial<Record<NotificationType, string>> = {
  voucher_injected: '#F0FDFB',
  tx_verified:      '#FFFDF0',
};

// ─── SwipeableRow ────────────────────────────────────────────────────────────
// Swipe left  → delete  (red reveal)
// Swipe right → mark read (green reveal, only when unread)

const ACTION_W = 80;
const SWIPE_THRESHOLD = 60;

function SwipeableRow({
  children,
  isRead,
  onDelete,
  onMarkRead,
  onScrollEnable,
}: {
  children: React.ReactNode;
  isRead: boolean;
  onDelete: () => void;
  onMarkRead: () => void;
  onScrollEnable: (enabled: boolean) => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const dirRef = useRef<'left' | 'right' | null>(null);

  const isReadRef = useRef(isRead);
  const onDeleteRef = useRef(onDelete);
  const onMarkReadRef = useRef(onMarkRead);
  const onScrollEnableRef = useRef(onScrollEnable);
  useEffect(() => { isReadRef.current = isRead; }, [isRead]);
  useEffect(() => { onDeleteRef.current = onDelete; }, [onDelete]);
  useEffect(() => { onMarkReadRef.current = onMarkRead; }, [onMarkRead]);
  useEffect(() => { onScrollEnableRef.current = onScrollEnable; }, [onScrollEnable]);

  const snapBack = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0, useNativeDriver: true, friction: 9, tension: 100,
    }).start();
    onScrollEnableRef.current(true);
  }, [translateX]);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) =>
      Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.3,
    onPanResponderGrant: () => {
      onScrollEnableRef.current(false);
      dirRef.current = null;
    },
    onPanResponderMove: (_, g) => {
      if (dirRef.current === null) {
        dirRef.current = g.dx < 0 ? 'left' : 'right';
      }
      if (dirRef.current === 'left') {
        translateX.setValue(Math.max(g.dx, -(ACTION_W + 24)));
      } else if (!isReadRef.current && dirRef.current === 'right') {
        translateX.setValue(Math.min(g.dx, ACTION_W + 24));
      }
    },
    onPanResponderRelease: (_, g) => {
      if (dirRef.current === 'left' && g.dx < -SWIPE_THRESHOLD) {
        Animated.timing(translateX, {
          toValue: -500, duration: 180, useNativeDriver: true,
          easing: Easing.in(Easing.quad),
        }).start(() => onDeleteRef.current());
      } else if (!isReadRef.current && dirRef.current === 'right' && g.dx > SWIPE_THRESHOLD) {
        Animated.spring(translateX, {
          toValue: 0, useNativeDriver: true, friction: 9, tension: 100,
        }).start();
        onScrollEnableRef.current(true);
        onMarkReadRef.current();
      } else {
        snapBack();
      }
    },
    onPanResponderTerminate: () => { snapBack(); },
  })).current;

  const deleteReveal = translateX.interpolate({
    inputRange: [-ACTION_W, -8, 0],
    outputRange: [1, 0.4, 0],
    extrapolate: 'clamp',
  });
  const readReveal = translateX.interpolate({
    inputRange: [0, 8, ACTION_W],
    outputRange: [0, 0.4, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={swipeStyles.wrapper}>
      <Animated.View style={[swipeStyles.action, swipeStyles.deleteAction, { opacity: deleteReveal }]}>
        <Trash2 size={16} color="#fff" />
        <Text style={swipeStyles.actionText}>Hapus</Text>
      </Animated.View>
      {!isRead && (
        <Animated.View style={[swipeStyles.action, swipeStyles.readAction, { opacity: readReveal }]}>
          <CheckCheck size={16} color="#fff" />
          <Text style={swipeStyles.actionText}>Dibaca</Text>
        </Animated.View>
      )}
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  notifications: NotificationItem[];
  onClose: () => void;
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
  onDelete?: (id: string) => Promise<boolean> | void;
  onNotificationPress?: (item: NotificationItem) => void;
}

export default function NotificationSheet(props: Props) {
  const { t } = useTranslation();
  const { visible, notifications, onClose, onMarkAllRead, onMarkRead, onDelete, onNotificationPress } = props;
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  const backdropAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(screenHeight)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const screenHeightRef = useRef(screenHeight);

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  screenHeightRef.current = screenHeight;

  const visibleNotifications = notifications.filter(n => !hiddenIds.has(n.id));
  const unreadCount = visibleNotifications.filter(n => !n.isRead).length;

  const handleDelete = useCallback((id: string) => {
    setHiddenIds(prev => new Set(prev).add(id));
    const result = onDelete?.(id);
    if (result instanceof Promise) {
      result.then(ok => {
        if (ok === false) setHiddenIds(prev => { const s = new Set(prev); s.delete(id); return s; });
      });
    }
  }, [onDelete]);

  const runClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0, duration: 220, useNativeDriver: true,
        easing: Easing.in(Easing.quad),
      }),
      Animated.timing(sheetAnim, {
        toValue: screenHeightRef.current, duration: 280, useNativeDriver: true,
        easing: Easing.in(Easing.cubic),
      }),
    ]).start(({ finished }) => {
      if (finished) {
        panY.setValue(0);
        closingRef.current = false;
        setMounted(false);
        onCloseRef.current();
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sheetPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => { if (g.dy > 0) panY.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.6) {
          runClose();
        } else {
          Animated.spring(panY, { toValue: 0, useNativeDriver: true, friction: 12 }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      closingRef.current = false;
      panY.setValue(0);
      sheetAnim.setValue(screenHeightRef.current);
      backdropAnim.setValue(0);
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1, duration: 260, useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
        Animated.spring(sheetAnim, {
          toValue: 0, useNativeDriver: true, friction: 13, tension: 90,
        }),
      ]).start();
    } else if (mounted) {
      runClose();
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) return null;

  const sheetTranslate = Animated.add(sheetAnim, panY);

  const showLongPressMenu = (item: NotificationItem) => {
    const readOption = 'Tandai Sudah Dibaca';
    const deleteOption = 'Hapus Notifikasi';
    const cancelOption = 'Batal';
    const options = [
      ...(!item.isRead ? [readOption] : []),
      deleteOption,
      cancelOption,
    ];
    const destructiveIndex = options.indexOf(deleteOption);
    const cancelIndex = options.indexOf(cancelOption);

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, destructiveButtonIndex: destructiveIndex, cancelButtonIndex: cancelIndex },
        (i) => {
          if (options[i] === readOption) onMarkRead(item.id);
          if (options[i] === deleteOption) handleDelete(item.id);
        }
      );
    } else {
      Alert.alert(item.title, undefined, [
        ...(!item.isRead ? [{ text: readOption, onPress: () => onMarkRead(item.id) }] : []),
        { text: deleteOption, style: 'destructive', onPress: () => handleDelete(item.id) },
        { text: cancelOption, style: 'cancel' },
      ]);
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.system;
    const { Icon } = cfg;
    const priorityBg = PRIORITY_BG[item.type];

    return (
      <SwipeableRow
        isRead={item.isRead}
        onDelete={() => handleDelete(item.id)}
        onMarkRead={() => onMarkRead(item.id)}
        onScrollEnable={setScrollEnabled}
      >
        <TouchableOpacity
          activeOpacity={0.72}
          onPress={() => {
            if (!item.isRead) onMarkRead(item.id);
            onNotificationPress?.(item);
          }}
          onLongPress={() => showLongPressMenu(item)}
          delayLongPress={400}
          style={[
            styles.itemCard,
            priorityBg
              ? { backgroundColor: priorityBg }
              : !item.isRead
                ? styles.itemCardUnread
                : null,
          ]}
        >
          <View style={styles.itemRow}>
            <View style={[styles.iconCircle, { backgroundColor: cfg.bg }]}>
              <Icon size={17} color={cfg.iconColor} />
              {!item.isRead && <View style={styles.unreadDot} />}
            </View>
            <View style={styles.itemContent}>
              <View style={styles.itemTopRow}>
                <Text
                  style={[styles.itemTitle, item.isRead && styles.itemTitleRead]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text style={styles.itemTime}>{formatTime(item.createdAt)}</Text>
              </View>
              <Text
                style={[styles.itemBody, item.isRead && styles.itemBodyRead]}
                numberOfLines={2}
              >
                {item.body}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </SwipeableRow>
    );
  };

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={runClose}
    >
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: backdropAnim }]}
        pointerEvents="box-none"
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={28} style={StyleSheet.absoluteFill} tint="dark" />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)' }]} />
        )}
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={runClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: insets.bottom + 8, transform: [{ translateY: sheetTranslate }] },
        ]}
      >
        <View style={styles.handleZone} {...sheetPanResponder.panHandlers}>
          <View style={styles.handle} />
        </View>

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Notifikasi</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadChip}>
                <Text style={styles.unreadChipText}>{unreadCount} baru</Text>
              </View>
            )}
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.markAllBtn} onPress={onMarkAllRead} activeOpacity={0.6}>
              <CheckCheck size={13} color={colors.text.secondary} />
              <Text style={styles.markAllText}>Baca semua</Text>
            </TouchableOpacity>
          )}
        </View>

        {visibleNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Bell size={22} color={colors.text.tertiary} />
            </View>
            <Text style={styles.emptyTitle}>Belum ada notifikasi</Text>
            <Text style={styles.emptyBody}>
              Informasi poin, voucher, dan promo akan muncul di sini.
            </Text>
          </View>
        ) : (
          <FlatList
            data={visibleNotifications}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
            showsVerticalScrollIndicator={false}
            scrollEnabled={scrollEnabled}
            contentContainerStyle={styles.listContent}
          />
        )}
      </Animated.View>
    </Modal>
  );
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ICON_SIZE = 32;

// ─── Swipe styles ─────────────────────────────────────────────────────────────

const swipeStyles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    // No individual border radius — flat list row style
  },
  action: {
    position: 'absolute',
    top: 0, bottom: 0,
    width: ACTION_W,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  deleteAction: {
    right: 0,
    backgroundColor: '#DC2626',
  },
  readAction: {
    left: 0,
    backgroundColor: '#059669',
  },
  actionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});

// ─── Sheet styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    minHeight: '75%',
    maxHeight: '92%',
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 24,
  },
  handleZone: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 36, height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.light,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.3,
  },
  unreadChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  unreadChipText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.secondary,
  },

  // ─── List ──────────────────────────────────────────────────────────────────
  listContent: {
    paddingTop: 6,
    paddingBottom: 12,
  },
  listSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.medium,
    // Indent separator to align with text, not icon — creates native list feel
    marginLeft: 56,
  },

  // ─── Cards ────────────────────────────────────────────────────────────────
  itemCard: {
    backgroundColor: colors.surface.card,
  },
  itemCardUnread: {
    backgroundColor: '#F8FAFC',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 11,
  },
  iconCircle: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  unreadDot: {
    position: 'absolute',
    top: -3, right: -3,
    width: 7, height: 7,
    borderRadius: 4,
    backgroundColor: colors.brand.primary,
    borderWidth: 1.5,
    borderColor: colors.surface.card,
  },
  itemContent: {
    flex: 1,
    gap: 3,
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  itemTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    lineHeight: 20,
  },
  itemTitleRead: {
    fontWeight: '400',
    color: colors.text.secondary,
  },
  itemTime: {
    fontSize: 11,
    color: colors.text.tertiary,
    flexShrink: 0,
    marginTop: 2,
    opacity: 0.6,
  },
  itemBody: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.text.secondary,
  },
  itemBodyRead: {
    color: colors.text.tertiary,
  },

  // ─── Empty state ──────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyIconWrap: {
    width: 52, height: 52,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
