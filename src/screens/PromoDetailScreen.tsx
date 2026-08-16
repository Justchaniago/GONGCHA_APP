import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'PromoDetail'>;

export default function PromoDetailScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { imageUrl, imageSource, title, subtitle } = route.params;
  const insets = useSafeAreaInsets();

  // Generate fallback description if subtitle is empty
  const description = subtitle || 'Dapatkan penawaran istimewa dan kesegaran menu eksklusif dari Gong Cha. Promo ini berlaku di seluruh outlet pilihan Indonesia selama periode promo berlangsung. Nikmati kemudahan memesan menu favorit Anda melalui aplikasi member Gong Cha.';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* APPLE EDITORIAL NAVIGATION BAR (SOLID GONG CHA RED) */}
      <View style={[styles.redHeader, { paddingTop: insets.top, height: insets.top + 56 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.headerBackTextBtn}
            activeOpacity={0.7}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.headerBackText}>‹ Kembali</Text>
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Promosi</Text>
          
          <TouchableOpacity style={styles.headerShareTextBtn} activeOpacity={0.7}>
            <Text style={styles.headerShareText}>Bagikan</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* HERO IMAGE BANNER (ASPECT RATIO FITTED) */}
        <View style={styles.heroContainer}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.heroImage} resizeMode="contain" />
          ) : imageSource ? (
            <Image source={imageSource} style={styles.heroImage} resizeMode="contain" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.placeholderText}>Gong Cha</Text>
            </View>
          )}
        </View>

        {/* PROMO DETAILS (APPLE CLEAN TYPOGRAPHY LAYOUT) */}
        <View style={styles.detailsCard}>
          <Text style={styles.dateLabel}>PERIODE: FEBRUARI 2026</Text>
          <Text style={styles.title}>{title}</Text>
          
          <View style={styles.divider} />

          {/* DESCRIPTION SECTION */}
          <Text style={styles.sectionHeader}>Detail Penawaran</Text>
          <Text style={styles.descriptionText}>{description}</Text>

          <View style={styles.divider} />

          {/* TERMS & CONDITIONS (CLEAN EDITORIAL TABLE LINES, NO ICONS) */}
          <Text style={styles.sectionHeader}>Syarat & Ketentuan</Text>
          <View style={styles.termsList}>
            <View style={styles.termRow}>
              <Text style={styles.termText}>Hanya berlaku untuk pengguna terdaftar Aplikasi Member Gong Cha.</Text>
            </View>
            <View style={styles.termRow}>
              <Text style={styles.termText}>Promo dapat digunakan untuk transaksi langsung di kasir (Dine-in/Take-away).</Text>
            </View>
            <View style={styles.termRow}>
              <Text style={styles.termText}>Tidak dapat digabungkan dengan promo kupon atau voucher diskon lainnya.</Text>
            </View>
            <View style={styles.termRow}>
              <Text style={styles.termText}>Selama persediaan item menu musiman atau botol cinta masih tersedia di toko.</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Clean White background
  },
  redHeader: {
    backgroundColor: '#B91C2F', // Gong Cha Red Accent
    width: '100%',
    justifyContent: 'center',
    zIndex: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  headerBackTextBtn: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  headerBackText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  headerShareTextBtn: {
    paddingVertical: 8,
    paddingLeft: 16,
  },
  headerShareText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  scrollContent: {
    paddingBottom: 60,
  },
  heroContainer: {
    width: '100%',
    aspectRatio: 1.95, // Fits the promo banner exactly
    backgroundColor: '#FFF0F2',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#B91C2F',
  },
  placeholderText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93', // iOS Muted text color
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1C1C1E', // iOS Dark text color
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  divider: {
    height: 0.5,
    backgroundColor: '#E5E5EA', // Thin iOS separator line
    marginVertical: 20,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B91C2F', // Gong Cha Red Accent for section subtitles
    marginBottom: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#3A3A3C',
    fontWeight: '400',
  },
  termsList: {
    marginTop: 4,
  },
  termRow: {
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  termText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#48484A',
    fontWeight: '400',
  },
});
