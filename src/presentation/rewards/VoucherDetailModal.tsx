import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { X, Ticket, ShieldCheck, Copy, Check } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';

import type { VoucherDisplayItem } from '../../application/rewards/RewardsViewModel';

interface VoucherDetailModalProps {
  visible: boolean;
  voucher: VoucherDisplayItem | null;
  onClose: () => void;
}

export function VoucherDetailModal({
  visible,
  voucher,
  onClose,
}: VoucherDetailModalProps) {
  const [copied, setCopied] = useState(false);

  if (!voucher) return null;

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {/* CLOSE BUTTON */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Tutup modal voucher"
          >
            <X size={18} color="#9CA3AF" />
          </TouchableOpacity>

          {/* TICKET HEADER */}
          <View style={styles.ticketHeader}>
            <View style={styles.badgeRow}>
              <View style={styles.activeBadge}>
                <Ticket size={12} color="#B91C2F" />
                <Text style={styles.activeBadgeText}>VOUCHER AKTIF</Text>
              </View>
            </View>

            <Text style={styles.title}>{voucher.title}</Text>
            <Text style={styles.expiry}>{voucher.formattedExpiry}</Text>
          </View>

          {/* DASHED TICKET DIVIDER */}
          <View style={styles.dividerContainer}>
            <View style={styles.notchLeft} />
            <View style={styles.dashedLine} />
            <View style={styles.notchRight} />
          </View>

          {/* VOUCHER CONTENT BODY */}
          <View style={styles.bodyContent}>
            <Text style={styles.desc}>
              {voucher.description ||
                'Tunjukkan QR Code ini ke kasir Gong Cha saat memesan.'}
            </Text>

            {/* QR CODE CARD */}
            <View style={styles.qrCard}>
              <View style={styles.qrWrap}>
                <QRCode
                  value={voucher.qrPayload}
                  size={155}
                  color="#1A1A1A"
                  backgroundColor="#FFFFFF"
                />
              </View>

              {/* CODE STRIP WITH COPY BUTTON */}
              <TouchableOpacity
                style={styles.codeStrip}
                onPress={handleCopy}
                activeOpacity={0.7}
              >
                <Text style={styles.codeText}>{voucher.code}</Text>
                <View style={styles.copyPill}>
                  {copied ? (
                    <Check size={12} color="#166534" />
                  ) : (
                    <Copy size={12} color="#B91C2F" />
                  )}
                  <Text style={[styles.copyText, copied && styles.copiedText]}>
                    {copied ? 'Tersalin' : 'Salin'}
                  </Text>
                </View>
              </TouchableOpacity>

              <Text style={styles.scanHint}>
                Tunjukkan QR Code di atas kepada kasir Gong Cha
              </Text>
            </View>

            {/* TERMS & CONDITIONS (T&C) */}
            <View style={styles.tncContainer}>
              <View style={styles.tncHeader}>
                <ShieldCheck size={14} color="#B91C2F" />
                <Text style={styles.tncTitle}>Syarat & Ketentuan</Text>
              </View>
              <Text style={styles.tncItem}>
                • Tunjukkan QR Code ke kasir sebelum melakukan pembayaran.
              </Text>
              <Text style={styles.tncItem}>
                • Berlaku untuk 1 kali pemesanan di seluruh outlet Gong Cha Indonesia.
              </Text>
            </View>
          </View>

          {/* BOTTOM ACTION BUTTON */}
          <TouchableOpacity
            style={styles.closeActionBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Tutup"
          >
            <Text style={styles.closeActionText}>Tutup</Text>
          </TouchableOpacity>
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
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingTop: 20,
    paddingBottom: 18,
    paddingHorizontal: 18,
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
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
  ticketHeader: {
    paddingRight: 32,
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F3',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
    borderWidth: 1,
    borderColor: '#FFE4E6',
  },
  activeBadgeText: {
    color: '#B91C2F',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 24,
    marginBottom: 2,
  },
  expiry: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  dividerContainer: {
    height: 20,
    marginHorizontal: -18,
    position: 'relative',
    justifyContent: 'center',
    marginVertical: 4,
  },
  notchLeft: {
    position: 'absolute',
    left: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    zIndex: 2,
  },
  notchRight: {
    position: 'absolute',
    right: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    zIndex: 2,
  },
  dashedLine: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    width: '100%',
  },
  bodyContent: {
    marginTop: 4,
  },
  desc: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 17,
    marginBottom: 14,
    textAlign: 'center',
  },
  qrCard: {
    alignItems: 'center',
    backgroundColor: '#FAF7F5',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#F0E8E2',
    marginBottom: 14,
  },
  qrWrap: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    marginBottom: 12,
  },
  codeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2D9D2',
    gap: 10,
    marginBottom: 8,
  },
  codeText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#B91C2F',
    letterSpacing: 1.5,
  },
  copyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F3',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  copyText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B91C2F',
  },
  copiedText: {
    color: '#166534',
  },
  scanHint: {
    fontSize: 11,
    color: '#8C7B75',
    textAlign: 'center',
    fontWeight: '600',
  },
  tncContainer: {
    backgroundColor: '#FCF8F4',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F2EAE3',
    marginBottom: 16,
  },
  tncHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
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
  closeActionBtn: {
    backgroundColor: '#2A1F1F',
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2A1F1F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  closeActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
