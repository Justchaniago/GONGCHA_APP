import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { Gift, Star, X, ShieldCheck } from 'lucide-react-native';

import type { RewardDisplayItem } from '../../application/rewards/RewardsViewModel';
import SlideToRedeem from '../../components/SlideToRedeem';

interface RedemptionConfirmModalProps {
  visible: boolean;
  item: RewardDisplayItem | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function RedemptionConfirmModal({
  visible,
  item,
  onClose,
  onConfirm,
}: RedemptionConfirmModalProps) {
  if (!item) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Tutup konfirmasi"
          >
            <X size={18} color="#9CA3AF" />
          </TouchableOpacity>

          {/* VOUCHER HERO IMAGE / ICON */}
          <View style={styles.heroContainer}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.heroImage} resizeMode="cover" />
            ) : (
              <View style={styles.iconBg}>
                <Gift size={36} color="#B91C2F" />
              </View>
            )}
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{item.category || 'Voucher Gong Cha'}</Text>
            </View>
          </View>

          {/* VOUCHER TITLE & COST */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.description}</Text>

            <View style={styles.costBadge}>
              <Star size={14} color="#B91C2F" fill="#B91C2F" />
              <Text style={styles.costText}>{item.pointsRequiredLabel}</Text>
            </View>
          </View>

          {/* TERMS AND CONDITIONS (T&C) */}
          <View style={styles.tncContainer}>
            <View style={styles.tncHeader}>
              <ShieldCheck size={14} color="#B91C2F" />
              <Text style={styles.tncTitle}>Syarat & Ketentuan (T&C)</Text>
            </View>
            <Text style={styles.tncItem}>• Berlaku di seluruh outlet Gong Cha Indonesia.</Text>
            <Text style={styles.tncItem}>• Voucher berlaku 30 hari setelah penukaran.</Text>
            <Text style={styles.tncItem}>• Tidak dapat digabungkan dengan promo bank/e-wallet lain.</Text>
          </View>

          {/* ACTION BUTTON ROW */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Batal"
            >
              <Text style={styles.cancelBtnText}>Batal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.redeemPillBtn, !item.canAfford && styles.disabledRedeemBtn]}
              onPress={onConfirm}
              disabled={!item.canAfford}
              accessibilityRole="button"
              accessibilityLabel="Redeem"
            >
              <Text style={styles.redeemPillText}>
                {item.canAfford ? 'Redeem' : 'Poin Tidak Cukup'}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 6,
  },
  heroContainer: {
    width: '100%',
    height: 120,
    borderRadius: 18,
    backgroundColor: '#FFF1F3',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  iconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FDE8EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(185, 28, 47, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 10,
  },
  costBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: '#FFE4E6',
  },
  costText: {
    color: '#B91C2F',
    fontSize: 13,
    fontWeight: '800',
  },
  tncContainer: {
    backgroundColor: '#FCF8F4',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F2EAE3',
    marginBottom: 18,
  },
  tncHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  tncTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B91C2F',
    textTransform: 'uppercase',
  },
  tncItem: {
    fontSize: 11,
    color: '#6C5F5A',
    lineHeight: 16,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  cancelBtnText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
  },
  redeemPillBtn: {
    backgroundColor: '#B91C2F',
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 22,
    shadowColor: '#B91C2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  redeemPillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  disabledRedeemBtn: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
});


