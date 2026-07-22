import React, { useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Linking, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  ChevronLeft, ChevronDown, MessageCircle, Mail,
  HelpCircle, Star, QrCode, Gift, AlertCircle, User,
} from 'lucide-react-native';

const BRAND = '#C8102E';
const SURFACE = '#FFFFFF';
const CANVAS = '#F5F5F7';
const TEXT_PRIMARY = '#1A1A1A';
const TEXT_SECONDARY = '#6B7280';
const BORDER = '#E5E7EB';

// ─── FAQ DATA ───────────────────────────────────────────────────────────────

const FAQ_SECTIONS = [
  {
    title: 'Poin & Transaksi',
    icon: Star,
    items: [
      {
        q: 'Bagaimana cara mengumpulkan poin?',
        a: 'Poin dikumpulkan setiap kali kamu bertransaksi di gerai Gong Cha. Tunjukkan QR Code kamu kepada kasir sebelum membayar. Setiap Rp 1.000 = 1 poin.',
      },
      {
        q: 'Berapa lama poin berlaku?',
        a: 'Poin berlaku selama 12 bulan sejak tanggal terakhir transaksi. Poin akan hangus otomatis jika tidak ada transaksi selama 12 bulan berturut-turut.',
      },
      {
        q: 'Poin saya tidak masuk setelah transaksi, kenapa?',
        a: 'Poin biasanya masuk dalam 1x24 jam setelah transaksi diverifikasi. Jika lebih dari 24 jam belum masuk, hubungi CS kami dengan menyertakan foto struk transaksi.',
      },
      {
        q: 'Apakah poin bisa ditransfer ke akun lain?',
        a: 'Saat ini poin tidak dapat ditransfer antar akun. Poin hanya bisa digunakan oleh pemilik akun terdaftar.',
      },
    ],
  },
  {
    title: 'Voucher & Redeem',
    icon: Gift,
    items: [
      {
        q: 'Bagaimana cara redeem voucher di kasir?',
        a: 'Buka tab Rewards di aplikasi, pilih voucher yang ingin digunakan, lalu tunjukkan QR voucher kepada kasir sebelum membayar. Kasir akan scan QR untuk menggunakan voucher.',
      },
      {
        q: 'Voucher saya tidak muncul di aplikasi, kenapa?',
        a: 'Pastikan voucher belum expired dan syarat penggunaan terpenuhi (minimum pembelian, item tertentu, dll). Coba refresh halaman Rewards atau logout lalu login kembali.',
      },
      {
        q: 'Voucher sudah di-scan kasir tapi tidak terpotong di struk?',
        a: 'Segera hubungi CS kami dengan menyertakan foto struk dan screenshot voucher di aplikasi. Jangan tutup aplikasi agar data voucher masih tersimpan.',
      },
    ],
  },
  {
    title: 'Tier & Membership',
    icon: HelpCircle,
    items: [
      {
        q: 'Apa perbedaan tier Silver, Gold, dan Platinum?',
        a: 'Silver: tier awal untuk semua member baru.\nGold: dicapai setelah mengumpulkan 500 XP — dapat benefit eksklusif dan multiplier poin.\nPlatinum: tier tertinggi, 1.500 XP — akses semua benefit premium dan early access promo.',
      },
      {
        q: 'Bagaimana cara naik tier?',
        a: 'XP dikumpulkan dari setiap transaksi. Semakin sering bertransaksi, semakin cepat naik tier. Progress XP bisa dilihat di halaman Home dan Membership Status.',
      },
      {
        q: 'Apakah tier bisa turun?',
        a: 'Tier dievaluasi setiap tahun. Jika aktivitas transaksi tidak memenuhi threshold, tier dapat turun ke level sebelumnya.',
      },
    ],
  },
  {
    title: 'Akun & Aplikasi',
    icon: User,
    items: [
      {
        q: 'Bagaimana cara mengubah nomor telepon?',
        a: 'Pergi ke Profile → Edit Profile. Perubahan nomor telepon memerlukan verifikasi OTP ke nomor baru. Nomor lama akan dinonaktifkan setelah verifikasi berhasil.',
      },
      {
        q: 'Saya tidak bisa login, apa yang harus dilakukan?',
        a: 'Coba langkah berikut:\n1. Pastikan nomor telepon sudah benar\n2. Cek koneksi internet\n3. Gunakan fitur "Lupa Password" jika perlu\n4. Jika masih gagal, hubungi CS kami.',
      },
      {
        q: 'Bagaimana cara menghapus akun?',
        a: 'Penghapusan akun bersifat permanen dan tidak dapat dibatalkan. Hubungi CS kami via email dengan subjek "Hapus Akun" beserta nomor telepon terdaftar.',
      },
    ],
  },
  {
    title: 'QR Code',
    icon: QrCode,
    items: [
      {
        q: 'QR Code saya tidak bisa di-scan kasir?',
        a: 'Pastikan layar brightness sudah cukup terang dan tidak ada pelindung layar yang terlalu gelap. Jika masih gagal, coba screenshot QR dan zoom in, atau hubungi kasir untuk input manual.',
      },
      {
        q: 'Apakah QR Code saya bisa digunakan oleh orang lain?',
        a: 'QR Code terikat ke akun kamu dan bersifat personal. Jangan bagikan QR Code kepada orang lain karena poin akan masuk ke akun kamu.',
      },
    ],
  },
];

// ─── FAQ ITEM (Accordion) ───────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const heightAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    const toValue = open ? 0 : 1;
    Animated.parallel([
      Animated.spring(heightAnim, { toValue, useNativeDriver: false, tension: 60, friction: 10 }),
      Animated.spring(rotateAnim, { toValue, useNativeDriver: true, tension: 60, friction: 10 }),
    ]).start();
    setOpen(!open);
  };

  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const maxHeight = heightAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 300] });

  return (
    <View style={faqStyles.item}>
      <TouchableOpacity style={faqStyles.question} onPress={toggle} activeOpacity={0.7}>
        <Text style={faqStyles.questionText}>{q}</Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <ChevronDown size={16} color={TEXT_SECONDARY} strokeWidth={2.5} />
        </Animated.View>
      </TouchableOpacity>
      <Animated.View style={[faqStyles.answerWrap, { maxHeight }]}>
        <Text style={faqStyles.answerText}>{a}</Text>
      </Animated.View>
    </View>
  );
}

// ─── CONTACT CARD ───────────────────────────────────────────────────────────

function ContactCard({
  icon: Icon, label, sublabel, color, onPress,
}: {
  icon: any; label: string; sublabel: string; color: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={contactStyles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={[contactStyles.iconBox, { backgroundColor: color + '18' }]}>
        <Icon size={22} color={color} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={contactStyles.label}>{label}</Text>
        <Text style={contactStyles.sublabel}>{sublabel}</Text>
      </View>
      <ChevronLeft
        size={16} color={TEXT_SECONDARY} strokeWidth={2.5}
        style={{ transform: [{ rotate: '180deg' }] }}
      />
    </TouchableOpacity>
  );
}

// ─── MAIN SCREEN ────────────────────────────────────────────────────────────

export default function HelpCenterScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const openWhatsApp = () => {
    // Replace with real WA number
    Linking.openURL('https://wa.me/6281234567890?text=Halo%2C%20saya%20butuh%20bantuan%20terkait%20aplikasi%20Gong%20Cha');
  };

  const openEmail = () => {
    Linking.openURL('mailto:support@gongcha.id?subject=Bantuan%20Aplikasi%20Gong%20Cha');
  };

  return (
    <View style={[styles.root, { backgroundColor: CANVAS }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={22} color={TEXT_PRIMARY} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <AlertCircle size={28} color={BRAND} strokeWidth={1.8} />
          </View>
          <Text style={styles.heroTitle}>Ada yang bisa kami bantu?</Text>
          <Text style={styles.heroSub}>Temukan jawaban di FAQ atau hubungi tim kami</Text>
        </View>

        {/* Contact */}
        <Text style={styles.sectionLabel}>Hubungi Kami</Text>
        <View style={styles.contactBlock}>
          <ContactCard
            icon={MessageCircle}
            label="WhatsApp CS"
            sublabel="Senin–Jumat, 09.00–18.00 WIB"
            color="#25D366"
            onPress={openWhatsApp}
          />
          <View style={styles.contactDivider} />
          <ContactCard
            icon={Mail}
            label="Email Support"
            sublabel="support@gongcha.id"
            color={BRAND}
            onPress={openEmail}
          />
        </View>

        {/* FAQ */}
        <Text style={styles.sectionLabel}>Pertanyaan Umum</Text>
        {FAQ_SECTIONS.map((section) => (
          <View key={section.title} style={styles.faqSection}>
            <View style={styles.faqSectionHeader}>
              <section.icon size={15} color={BRAND} strokeWidth={2.5} />
              <Text style={styles.faqSectionTitle}>{section.title}</Text>
            </View>
            <View style={styles.faqCard}>
              {section.items.map((item, idx) => (
                <View key={idx}>
                  <FaqItem q={item.q} a={item.a} />
                  {idx < section.items.length - 1 && <View style={styles.faqDivider} />}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Footer note */}
        <Text style={styles.footerNote}>
          Versi Aplikasi 1.0.0 · © 2025 Gong Cha Indonesia
        </Text>
      </ScrollView>
    </View>
  );
}

// ─── STYLES ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: SURFACE,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: TEXT_PRIMARY },
  scroll: { padding: 20 },

  hero: { alignItems: 'center', paddingVertical: 24, marginBottom: 8 },
  heroIconWrap: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: BRAND + '12',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  heroTitle: { fontSize: 18, fontWeight: '800', color: TEXT_PRIMARY, marginBottom: 6 },
  heroSub: { fontSize: 13, color: TEXT_SECONDARY, textAlign: 'center' },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: TEXT_SECONDARY, letterSpacing: 0.8, marginBottom: 10, marginTop: 8 },

  contactBlock: { backgroundColor: SURFACE, borderRadius: 16, marginBottom: 24, overflow: 'hidden', borderWidth: 1, borderColor: BORDER },
  contactDivider: { height: 1, backgroundColor: BORDER, marginHorizontal: 16 },

  faqSection: { marginBottom: 20 },
  faqSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  faqSectionTitle: { fontSize: 13, fontWeight: '700', color: TEXT_PRIMARY },
  faqCard: { backgroundColor: SURFACE, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: BORDER },
  faqDivider: { height: 1, backgroundColor: BORDER, marginHorizontal: 16 },

  footerNote: { textAlign: 'center', fontSize: 11, color: TEXT_SECONDARY, marginTop: 8 },
});

const faqStyles = StyleSheet.create({
  item: { paddingHorizontal: 16 },
  question: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, gap: 12 },
  questionText: { flex: 1, fontSize: 14, fontWeight: '600', color: TEXT_PRIMARY, lineHeight: 20 },
  answerWrap: { overflow: 'hidden' },
  answerText: { fontSize: 13, color: TEXT_SECONDARY, lineHeight: 20, paddingBottom: 14 },
});

const contactStyles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
  iconBox: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 14, fontWeight: '600', color: TEXT_PRIMARY, marginBottom: 2 },
  sublabel: { fontSize: 12, color: TEXT_SECONDARY },
});
