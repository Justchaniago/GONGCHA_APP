import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gift, Star, X } from 'lucide-react-native';

import type { RewardDisplayItem } from '../../application/rewards/RewardsViewModel';

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
            <X size={20} color="#6B7280" />
          </TouchableOpacity>

          <View style={styles.iconBg}>
            <Gift size={32} color="#B91C2F" />
          </View>

          <Text style={styles.title}>Konfirmasi Penukaran</Text>
          <Text style={styles.subtitle}>
            Apakah Anda yakin ingin menukar
          </Text>

          <View style={styles.rewardSummaryCard}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <View style={styles.costBadge}>
              <Star size={14} color="#B91C2F" fill="#B91C2F" />
              <Text style={styles.costText}>{item.pointsRequiredLabel}</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Batal penukaran"
            >
              <Text style={styles.cancelButtonText}>Batal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityLabel="Konfirmasi tukar voucher"
            >
              <Text style={styles.confirmButtonText}>Ya, Tukar Sekarang</Text>
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
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 6,
  },
  iconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FDE8EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  rewardSummaryCard: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderColor: '#E5E7EB',
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
  },
  costBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDE8EC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  costText: {
    color: '#B91C2F',
    fontSize: 14,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '700',
  },
  confirmButton: {
    flex: 1.5,
    backgroundColor: '#B91C2F',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
