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
            <X size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.headerRow}>
            <View style={styles.iconBg}>
              <Gift size={22} color="#B91C2F" />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>Konfirmasi Penukaran</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                Gong Cha Rewards V1
              </Text>
            </View>
          </View>

          <View style={styles.summaryBox}>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={styles.costBadge}>
              <Star size={12} color="#B91C2F" fill="#B91C2F" />
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
              accessibilityLabel="Ya, Tukar"
            >
              <Text style={styles.confirmButtonText}>Ya, Tukar</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 10,
    padding: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    paddingRight: 24,
  },
  iconBg: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FDE8EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  summaryBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderColor: '#F3F4F6',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  itemTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    marginRight: 8,
  },
  costBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDE8EC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  costText: {
    color: '#B91C2F',
    fontSize: 12,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '700',
  },
  confirmButton: {
    flex: 1.2,
    backgroundColor: '#B91C2F',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
