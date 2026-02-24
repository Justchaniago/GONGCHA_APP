import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';

export type OtpThemeColors = {
  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
  textInverse: string;
  brandPrimary: string;
  brandPrimaryDisabled: string;
  inputBg: string;
  borderDefault: string;
  otpFilledBg: string;
};

type OtpVerificationSectionProps = {
  phone: string;
  otp: string[];
  otpRefs: React.MutableRefObject<Array<TextInput | null>>;
  onChange: (text: string, index: number) => void;
  onBack: () => void;
  onVerify: () => void;
  verifyLabel: string;
  progressMessage?: string;
  resendTimer: number;
  onResend: () => void;
  isSubmitting?: boolean;
  themeColors?: OtpThemeColors;
};

const DEFAULT_THEME: OtpThemeColors = {
  textPrimary: '#1A1A1A',
  textSecondary: '#6B7280',
  textDisabled: '#9CA3AF',
  textInverse: '#FFFFFF',
  brandPrimary: '#B91C2F',
  brandPrimaryDisabled: '#E5E7EB',
  inputBg: '#F9FAFB',
  borderDefault: '#E5E7EB',
  otpFilledBg: '#FFF5F5',
};

export default function OtpVerificationSection({
  phone,
  otp,
  otpRefs,
  onChange,
  onBack,
  onVerify,
  verifyLabel,
  progressMessage,
  resendTimer,
  onResend,
  isSubmitting = false,
  themeColors,
}: OtpVerificationSectionProps) {
  const { width } = useWindowDimensions();
  const isCompact = width < 360;
  const otpBoxWidth = isCompact ? 44 : 50;
  const otpBoxHeight = isCompact ? 54 : 60;
  const otpFontSize = isCompact ? 22 : 24;

  const t = themeColors ?? DEFAULT_THEME;
  const isDisabled = otp.join('').length < 4 || isSubmitting;

  return (
    <View>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={[styles.backIcon, { color: t.textPrimary }]}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={[styles.title, { color: t.textPrimary }]}>Verify Phone</Text>
          <Text style={[styles.subtitle, { color: t.textSecondary }]}>Code sent to +62 {phone}</Text>
        </View>
      </View>

      {/* OTP Boxes */}
      <View style={styles.otpContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => { otpRefs.current[index] = ref; }}
            style={[
              styles.otpBox,
              {
                width: otpBoxWidth,
                height: otpBoxHeight,
                fontSize: otpFontSize,
                backgroundColor: digit ? t.otpFilledBg : t.inputBg,
                borderColor: digit ? t.brandPrimary : t.borderDefault,
                color: t.textPrimary,
              },
            ]}
            keyboardType="number-pad"
            maxLength={1}
            value={digit}
            onChangeText={(text) => onChange(text, index)}
            editable={!isSubmitting}
          />
        ))}
      </View>

      {/* Verify Button */}
      <TouchableOpacity
        style={[
          styles.primaryButton,
          { backgroundColor: isDisabled ? t.brandPrimaryDisabled : t.brandPrimary },
        ]}
        onPress={onVerify}
        disabled={isDisabled}
      >
        <Text style={[styles.primaryButtonText, { color: isDisabled ? t.textSecondary : t.textInverse }]}>
          {verifyLabel}
        </Text>
      </TouchableOpacity>

      {/* Progress Message */}
      {isSubmitting && !!progressMessage && (
        <Text style={[styles.progressText, { color: t.textSecondary }]}>{progressMessage}</Text>
      )}

      {/* Resend */}
      <View style={styles.resendWrap}>
        {resendTimer > 0 ? (
          <Text style={[styles.resendText, { color: t.textDisabled }]}>
            Resend in 00:{resendTimer.toString().padStart(2, '0')}
          </Text>
        ) : (
          <TouchableOpacity onPress={onResend} disabled={isSubmitting}>
            <Text style={[styles.resendAction, { color: isSubmitting ? t.textDisabled : t.brandPrimary }]}>
              Resend Code
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButton: { padding: 4, marginRight: 8 },
  backIcon: { fontSize: 20 },
  title: { fontSize: 20, fontWeight: 'bold' },
  subtitle: { fontSize: 13 },

  otpContainer: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 24 },
  otpBox: {
    borderRadius: 12,
    borderWidth: 1,
    textAlign: 'center',
    fontWeight: 'bold',
  },

  primaryButton: { height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  primaryButtonText: { fontWeight: '600', fontSize: 16 },
  progressText: { textAlign: 'center', marginTop: 10, fontSize: 12 },

  resendWrap: { alignItems: 'center', marginTop: 16 },
  resendText: {},
  resendAction: { fontWeight: '600' },
});
