import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { X, Ticket } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';

import type { VoucherDisplayItem } from '../../application/rewards/RewardsViewModel';

interface VoucherDetailModalProps {
  visible: boolean;
  voucher: VoucherDisplayItem | null;
  onClose: () => void;
}

export function VoucherDetailModal({ visible, voucher, onClose }: VoucherDetailModalProps) {
  if (!voucher) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="Tutup">
            <X size={20} color="#6B7280" />
          </TouchableOpacity>

          <View style={styles.headerRow}>
            <View style={styles.iconBg}>
              <Ticket size={24} color="#C8102E" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title} numberOfLines={2}>{voucher.title}</Text>
              <Text style={styles.expiry}>{voucher.formattedExpiry}</Text>
            </View>
          </View>

          <Text style={styles.desc}>{voucher.description}</Text>

          <View style={styles.qrContainer}>
            <View style={styles.qrWrap}>
              <QRCode value={voucher.qrPayload} size={150} color="#1A1A1A" backgroundColor="#FFFFFF" />
            </View>
            <Text style={styles.codeText}>{voucher.code}</Text>
            <Text style={styles.scanHint}>Tunjukkan QR code ini ke kasir Gong Cha</Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingRight: 32, // Prevent overlap with close button
  },
  iconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FDE8EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  headerText: { flex: 1 },
  title: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  expiry: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  desc: { fontSize: 14, color: '#4B5563', lineHeight: 20, marginBottom: 20 },
  qrContainer: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  qrWrap: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  codeText: { fontSize: 16, fontWeight: '800', color: '#C8102E', marginTop: 12, letterSpacing: 1.5 },
  scanHint: { fontSize: 12, color: '#6B7280', marginTop: 6, textAlign: 'center' },
});
