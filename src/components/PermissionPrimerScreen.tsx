import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BouncyPressable from './BouncyPressable';

type PermissionPrimerScreenProps = {
  icon: React.ReactNode;
  noHalo?: boolean;
  title: string;
  description: string;
  bullets: string[];
  primaryLabel: string;
  secondaryLabel: string;
  onPrimary: () => void;
  onSecondary: () => void;
};

export default function PermissionPrimerScreen({
  icon,
  noHalo,
  title,
  description,
  bullets,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
}: PermissionPrimerScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/welcome1.webp')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      <View style={styles.overlay}>
        <LinearGradient
          colors={['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.22)', 'rgba(0,0,0,0.78)']}
          locations={[0, 0.38, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={[styles.contentWrap, { paddingTop: insets.top + 36, paddingBottom: Math.max(insets.bottom + 18, 24) }]}>
        <View style={[styles.card, { paddingBottom: Math.max(insets.bottom + 18, 24) }]}>
          <View style={styles.eyebrowRow}>
            <View style={styles.eyebrowDot} />
            <Text style={styles.eyebrowText}>{t('permission.eyebrow')}</Text>
          </View>

          {noHalo ? (
            <View style={{ marginBottom: 18, alignItems: 'center' }}>{icon}</View>
          ) : (
            <View style={styles.iconHalo}>
              <LinearGradient
                colors={['#FFF3F4', '#FDEBEC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconHaloGradient}
              >
                {icon}
              </LinearGradient>
            </View>
          )}

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>

          <View style={styles.bulletList}>
            {bullets.map((item) => (
              <View key={item} style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>

          <BouncyPressable style={styles.primaryButton} onPress={onPrimary}>
            <View style={styles.buttonInner}>
              <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
            </View>
          </BouncyPressable>

          <BouncyPressable style={styles.secondaryButton} onPress={onSecondary}>
            <View style={styles.buttonInner}>
              <Text style={styles.secondaryButtonText}>{secondaryLabel}</Text>
            </View>
          </BouncyPressable>

          <Text style={styles.footerNote}>{t('permission.footerNote')}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFDFB' },
  backgroundImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject },
  contentWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingHorizontal: 22,
    paddingTop: 20,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 4 },
    elevation: 14,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 18,
  },
  eyebrowDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#B91C2F',
    marginRight: 8,
  },
  eyebrowText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: '#A06C63',
    textAlign: 'center',
  },
  iconHalo: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignSelf: 'center',
    marginBottom: 18,
    overflow: 'hidden',
  },
  iconHaloGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F1715',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  bulletList: {
    backgroundColor: '#FBF7F4',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1ECE8',
    marginBottom: 18,
    gap: 12,
  },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start' },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#B91C2F',
    marginTop: 6,
    marginRight: 10,
    flexShrink: 0,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: '#3E342F',
  },
  primaryButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#B91C2F',
    marginBottom: 10,
  },
  secondaryButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E7D8D4',
    marginBottom: 14,
  },
  buttonInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: '#6F5D57',
    fontSize: 14,
    fontWeight: '600',
  },
  footerNote: {
    textAlign: 'center',
    color: '#9A8C86',
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
});
