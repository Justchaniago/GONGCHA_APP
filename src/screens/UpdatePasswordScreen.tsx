import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react-native';
import { AuthService } from '../services/AuthService';
import { colors } from '../theme/colorTokens';

// ─── Types ─────────────────────────────────────────────────────────────────
type RootStackParamList = {
  UpdatePassword: { oobCode?: string; mode?: 'reset' | 'change' };
  Welcome: undefined;
  MainApp: undefined;
};

type UpdatePasswordRouteProp = RouteProp<RootStackParamList, 'UpdatePassword'>;
type UpdatePasswordNavProp = NativeStackNavigationProp<RootStackParamList, 'UpdatePassword'>;

// ─── Component ─────────────────────────────────────────────────────────────
export default function UpdatePasswordScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<UpdatePasswordNavProp>();
  const route = useRoute<UpdatePasswordRouteProp>();

  // Kalau ada oobCode di params → mode reset (dari magic link)
  // Kalau tidak ada → mode change (user sudah login, ganti password dari settings)
  const oobCode = route.params?.oobCode;
  const isResetMode = !!oobCode || route.params?.mode === 'reset';

  // ─── State ───────────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // ─── Validation ──────────────────────────────────────────────────────────
  const passwordStrength = (() => {
    if (newPassword.length === 0) return null;
    if (newPassword.length < 6) return 'weak';
    if (newPassword.length < 10 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) return 'medium';
    return 'strong';
  })();

  const strengthColor = { weak: '#EF4444', medium: '#F59E0B', strong: '#10B981' };
  const strengthLabel = { weak: 'Lemah', medium: 'Sedang', strong: 'Kuat' };

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Password terlalu pendek', 'Password minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Password tidak cocok', 'Konfirmasi password tidak sesuai.');
      return;
    }
    if (!isResetMode && !currentPassword.trim()) {
      Alert.alert('Password saat ini diperlukan', 'Masukkan password kamu yang sekarang.');
      return;
    }

    try {
      setIsSubmitting(true);

      if (isResetMode && oobCode) {
        // Mode reset via magic link — pakai oobCode dari Firebase
        await AuthService.confirmPasswordReset(oobCode, newPassword);
      } else {
        // Mode ganti password — user sudah login
        await AuthService.changePassword(currentPassword, newPassword);
      }

      setIsSuccess(true);
    } catch (error: any) {
      const message = String(error?.message || '');
      if (message.includes('auth/wrong-password') || message.includes('auth/invalid-credential'))
        Alert.alert('Password salah', 'Password saat ini yang kamu masukkan tidak benar.');
      else if (message.includes('auth/weak-password'))
        Alert.alert('Password terlalu lemah', 'Gunakan kombinasi huruf, angka, dan karakter khusus.');
      else if (message.includes('auth/expired-action-code'))
        Alert.alert('Link kadaluarsa', 'Link reset password sudah kadaluarsa. Minta link baru dari halaman login.');
      else if (message.includes('auth/invalid-action-code'))
        Alert.alert('Link tidak valid', 'Link reset sudah digunakan atau tidak valid. Minta link baru.');
      else if (message.includes('auth/network-request-failed'))
        Alert.alert('Gagal', 'Cek koneksi internet kamu.');
      else Alert.alert('Gagal', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Success State ────────────────────────────────────────────────────────
  if (isSuccess) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.successContainer}>
          <CheckCircle size={72} color="#10B981" />
          <Text style={styles.successTitle}>Password Berhasil Diubah!</Text>
          <Text style={styles.successSubtext}>
            {isResetMode
              ? 'Password kamu sudah diperbarui. Silakan login dengan password baru.'
              : 'Password kamu sudah berhasil diubah.'}
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              if (isResetMode) {
                navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
              } else {
                navigation.goBack();
              }
            }}
          >
            <Text style={styles.primaryButtonText}>
              {isResetMode ? 'Kembali ke Login' : 'Selesai'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Form ─────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={styles.iconWrapper}>
            <Lock size={32} color="#B91C2F" />
          </View>
          <Text style={styles.title}>
            {isResetMode ? 'Reset Password' : 'Ganti Password'}
          </Text>
          <Text style={styles.subtitle}>
            {isResetMode
              ? 'Masukkan password baru kamu. Pastikan mudah diingat namun sulit ditebak.'
              : 'Masukkan password saat ini dan password baru kamu.'}
          </Text>
        </View>

        {/* Form Fields */}
        <View style={styles.formContainer}>

          {/* Current Password (hanya untuk mode change) */}
          {!isResetMode && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Password Saat Ini</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Masukkan password saat ini"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showCurrent}
                  autoCapitalize="none"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowCurrent(v => !v)}
                  style={styles.eyeButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {showCurrent ? <EyeOff size={18} color="#9CA3AF" /> : <Eye size={18} color="#9CA3AF" />}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* New Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Password Baru</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Minimal 6 karakter"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showNew}
                autoCapitalize="none"
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <TouchableOpacity
                onPress={() => setShowNew(v => !v)}
                style={styles.eyeButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {showNew ? <EyeOff size={18} color="#9CA3AF" /> : <Eye size={18} color="#9CA3AF" />}
              </TouchableOpacity>
            </View>
            {/* Password strength indicator */}
            {passwordStrength && (
              <View style={styles.strengthRow}>
                <View style={[styles.strengthBar, { backgroundColor: strengthColor[passwordStrength] }]} />
                <Text style={[styles.strengthText, { color: strengthColor[passwordStrength] }]}>
                  {strengthLabel[passwordStrength]}
                </Text>
              </View>
            )}
          </View>

          {/* Confirm Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Konfirmasi Password Baru</Text>
            <View style={[
              styles.inputWrapper,
              confirmPassword.length > 0 && styles.inputWrapperFocused,
              confirmPassword.length > 0 && confirmPassword !== newPassword && styles.inputWrapperError,
            ]}>
              <TextInput
                style={styles.input}
                placeholder="Ulangi password baru"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <TouchableOpacity
                onPress={() => setShowConfirm(v => !v)}
                style={styles.eyeButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {showConfirm ? <EyeOff size={18} color="#9CA3AF" /> : <Eye size={18} color="#9CA3AF" />}
              </TouchableOpacity>
            </View>
            {confirmPassword.length > 0 && confirmPassword !== newPassword && (
              <Text style={styles.errorText}>Password tidak cocok</Text>
            )}
            {confirmPassword.length > 0 && confirmPassword === newPassword && (
              <Text style={styles.matchText}>✓ Password cocok</Text>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (isSubmitting || newPassword !== confirmPassword || newPassword.length < 6) && styles.primaryButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting || newPassword !== confirmPassword || newPassword.length < 6}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Simpan Password Baru</Text>
            )}
          </TouchableOpacity>

          {/* Reset mode hint */}
          {isResetMode && (
            <Text style={styles.hintText}>
              Link reset password hanya berlaku sekali. Setelah berhasil, kamu perlu login dengan password baru.
            </Text>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F0',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  header: {
    marginBottom: 32,
  },
  backButton: {
    marginBottom: 24,
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 24,
    color: '#1A1A1A',
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
  },
  formContainer: {
    gap: 4,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 54,
  },
  inputWrapperFocused: {
    borderColor: '#10B981',
  },
  inputWrapperError: {
    borderColor: '#EF4444',
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 16,
    color: '#1A1A1A',
  },
  eyeButton: {
    paddingHorizontal: 14,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  strengthBar: {
    height: 4,
    flex: 1,
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
    width: 48,
    textAlign: 'right',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
    marginLeft: 4,
  },
  matchText: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 6,
    marginLeft: 4,
  },
  primaryButton: {
    height: 54,
    backgroundColor: '#B91C2F',
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#B91C2F',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonDisabled: {
    backgroundColor: '#E5E7EB',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  hintText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  successSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
});
