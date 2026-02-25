import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
  Animated,
  Keyboard,
  Alert,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Eye, EyeOff } from 'lucide-react-native';

// 🔥 PENGGANTI THEME CONTEXT
import { colors } from '../theme/colorTokens';
import { AuthService } from '../services/AuthService';
import { UserService } from '../services/UserService';
import { firebaseAuth } from '../config/firebase';

type RootStackParamList = {
  Login: { initialStep?: 'phone' | 'otp' };
  MainApp: undefined;
};

type LoginScreenRouteProp = RouteProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<LoginScreenRouteProp>();
  const isCompact = width < 360;
  const logoSize = isCompact ? 88 : 100;
  const sheetPadding = isCompact ? 18 : 24;
  const otpBoxWidth = isCompact ? 44 : 50;
  const otpBoxHeight = isCompact ? 54 : 60;
  const dynamicLogoTop = insets.top + (Platform.OS === 'ios' ? 12 : 8);
  const dynamicSheetBottomPadding = Math.max(insets.bottom + 16, 24);

  // ─── Method & Step State ──────────────────────────────────────────────────
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  const [step, setStep] = useState<'phone' | 'otp'>(route.params?.initialStep || 'phone');

  // ─── Phone State ──────────────────────────────────────────────────────────
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [resendTimer, setResendTimer] = useState(30);
  const [verifying, setVerifying] = useState(false);
  const otpRefs = useRef<Array<TextInput | null>>([null, null, null, null]);

  // ─── Email State ──────────────────────────────────────────────────────────
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false);

  // ─── Animation ────────────────────────────────────────────────────────────
  const contentOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (step === 'otp') startResendTimer();
  }, [step]);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const startResendTimer = () => {
    setResendTimer(30);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  };

  const animateFade = (callback: () => void) => {
    Animated.timing(contentOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      callback();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setTimeout(() => {
        Animated.timing(contentOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      }, 50);
    });
  };

  // ─── Phone Handlers ───────────────────────────────────────────────────────
  const handleGetOtp = () => {
    if (phoneNumber.length < 9) return;
    Keyboard.dismiss();
    animateFade(() => {
      setStep('otp');
      setTimeout(() => otpRefs.current[0]?.focus(), 200);
    });
    startResendTimer();
  };

  const handleBackToPhone = () => {
    Keyboard.dismiss();
    animateFade(() => { setStep('phone'); setOtp(['', '', '', '']); });
  };

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp]; newOtp[index] = text; setOtp(newOtp);
    if (text && index < 3) otpRefs.current[index + 1]?.focus();
  };

  const handleVerify = async () => {
    if (otp.join('').length !== 4) return;
    setVerifying(true);
    try {
      let userProfileRaw = await UserService.getUserProfile();
      let userProfile: import('../types/types').UserProfile | null = null;
      if (userProfileRaw && typeof userProfileRaw === 'object' && 'name' in userProfileRaw && 'phoneNumber' in userProfileRaw) {
        userProfile = userProfileRaw as import('../types/types').UserProfile;
      }
      if (!userProfile) {
        const currentUser = firebaseAuth.currentUser;
        if (currentUser) {
          const fallbackPhone = currentUser.phoneNumber || currentUser.email?.split('@')[0] || phoneNumber;
          const fallbackName = currentUser.displayName || fallbackPhone || 'Member';
          if (
            userProfile && typeof userProfile === 'object' &&
            'name' in userProfile && 'phoneNumber' in userProfile &&
            ((userProfile as any).name !== fallbackName || (userProfile as any).phoneNumber !== fallbackPhone)
          ) {
            await UserService.updateProfile({ name: fallbackName, phoneNumber: fallbackPhone });
          }
        } else {
          throw new Error('User Auth tidak ditemukan setelah login.');
        }
      }
    } catch (err) {
      Alert.alert('Login gagal', err && typeof err === 'object' && 'message' in err
        ? (err as any).message : String(err));
    } finally {
      setVerifying(false);
    }
  };

  // ─── Email Handlers ───────────────────────────────────────────────────────
  const handleEmailLogin = async () => {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      Alert.alert('Form tidak lengkap', 'Masukkan email dan password kamu.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail.trim())) {
      Alert.alert('Email tidak valid', 'Masukkan format email yang benar.');
      return;
    }
    try {
      setIsEmailSubmitting(true);
      await AuthService.loginWithEmail(loginEmail.trim(), loginPassword);
    } catch (error: any) {
      const message = String(error?.message || 'Login gagal.');
      if (message.includes('auth/invalid-credential') || message.includes('auth/wrong-password') || message.includes('auth/user-not-found'))
        Alert.alert('Login gagal', 'Email atau password salah. Periksa kembali.');
      else if (message.includes('auth/too-many-requests'))
        Alert.alert('Terlalu banyak percobaan', 'Coba lagi nanti atau reset password.');
      else if (message.includes('auth/network-request-failed'))
        Alert.alert('Login gagal', 'Tidak bisa terhubung ke Firebase. Cek koneksi internet kamu.');
      else Alert.alert('Login gagal', message);
    } finally {
      setIsEmailSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = loginEmail.trim();
    if (!email) { Alert.alert('Masukkan email', 'Isi email kamu di atas terlebih dahulu.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { Alert.alert('Email tidak valid', 'Masukkan format email yang benar.'); return; }
    try {
      await AuthService.sendPasswordReset(email);
      Alert.alert('Email terkirim! 📧', `Link reset password dikirim ke ${email}. Cek inbox atau spam.`);
    } catch (error: any) {
      const message = String(error?.message || '');
      if (message.includes('auth/user-not-found')) Alert.alert('Email tidak terdaftar', 'Tidak ada akun dengan email ini.');
      else Alert.alert('Gagal', message);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <StatusBar style="light" />

        <Image
          source={require('../../assets/images/welcome1.webp')}
          style={[styles.backgroundImage, { width, height }]}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={[styles.gradientOverlay, { height: height * 0.6 }]}
          pointerEvents="none"
        />

        <View style={[styles.logoSection, { top: dynamicLogoTop }]}>
          <Image
            source={require('../../assets/images/logo1.webp')}
            style={[styles.logoImage, { width: logoSize, height: logoSize }]}
            resizeMode="contain"
          />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}
          style={styles.keyboardView}
        >
          <View style={[
            styles.bottomSheet,
            {
              padding: sheetPadding,
              paddingTop: 12,
              paddingBottom: dynamicSheetBottomPadding,
              minHeight: height * 0.52,
              backgroundColor: colors.surface.card, // Fallback warna solid putih
            },
          ]}>
            <View style={styles.sheetHeader}>
              <View style={[styles.dragIndicator, { backgroundColor: colors.border.medium }]} />
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={styles.sheetScrollContent}
            >
              <Animated.View style={{ opacity: contentOpacity }}>

                {/* ── OTP step ── */}
                {step === 'otp' ? (
                  <>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <TouchableOpacity onPress={handleBackToPhone} style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 16, color: colors.text.secondary }}>← Back to number</Text>
                      </TouchableOpacity>
                      {/* 🔥 Tombol Theme Dihapus */}
                    </View>

                    <Text style={[styles.header, { color: colors.text.primary }]}>Verify Phone</Text>
                    <Text style={[styles.subtext, { color: colors.text.secondary }]}>Code sent to +62 {phoneNumber}</Text>

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
                              backgroundColor: digit ? '#FFF5F5' : colors.background.tertiary,
                              borderColor: digit ? colors.brand.primary : colors.border.light,
                              color: colors.text.primary,
                            },
                          ]}
                          keyboardType="number-pad"
                          maxLength={1}
                          value={digit}
                          onChangeText={text => handleOtpChange(text, index)}
                        />
                      ))}
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.primaryButton,
                        { backgroundColor: otp.join('').length < 4 || verifying ? '#FCA5A5' : colors.brand.primary }, // Hardcode warna merah redup kalau disabled
                      ]}
                      onPress={handleVerify}
                      disabled={otp.join('').length < 4 || verifying}
                    >
                      <Text style={[styles.primaryButtonText, { color: '#FFF' }]}>
                        {verifying ? 'Verifying...' : 'Verify & Login'}
                      </Text>
                    </TouchableOpacity>

                    <View style={{ alignItems: 'center', marginTop: 16 }}>
                      {resendTimer > 0 ? (
                        <Text style={{ color: colors.text.tertiary }}>
                          Resend in 00:{resendTimer.toString().padStart(2, '0')}
                        </Text>
                      ) : (
                        <TouchableOpacity onPress={() => startResendTimer()}>
                          <Text style={{ color: colors.brand.primary, fontWeight: '600' }}>Resend Code</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </>
                ) : (
                  <>
                    {/* ── Header Tanpa Theme Toggle ── */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={[styles.header, { color: colors.text.primary, marginBottom: 0 }]}>Welcome Back</Text>
                    </View>

                    <Text style={[styles.subtext, { color: colors.text.secondary }]}>
                      {loginMethod === 'phone' ? 'Enter your mobile number to continue' : 'Sign in with your email'}
                    </Text>

                    {/* ── Phone method ── */}
                    {loginMethod === 'phone' && (
                      <>
                        <View style={[
                          styles.phoneInputContainer,
                          { backgroundColor: colors.background.tertiary, borderColor: colors.border.light },
                        ]}>
                          <View style={[styles.countryCodeBox, { borderRightColor: colors.border.light }]}>
                            <Text style={{ fontSize: 18 }}>🇮🇩</Text>
                            <Text style={[styles.countryCodeText, { color: colors.text.primary }]}>+62</Text>
                          </View>
                          <TextInput
                            style={[styles.phoneInput, { color: colors.text.primary }]}
                            placeholder="812 3456 7890"
                            placeholderTextColor={colors.text.tertiary}
                            keyboardType="number-pad"
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
                          />
                        </View>
                        <TouchableOpacity
                          style={[
                            styles.primaryButton,
                            { backgroundColor: phoneNumber.length < 9 ? '#FCA5A5' : colors.brand.primary },
                          ]}
                          onPress={handleGetOtp}
                          disabled={phoneNumber.length < 9}
                        >
                          <Text style={[styles.primaryButtonText, { color: '#FFF' }]}>Get OTP</Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {/* ── Email method ── */}
                    {loginMethod === 'email' && (
                      <>
                        <View style={[styles.emailInputContainer, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]}>
                          <TextInput
                            style={[styles.phoneInput, { color: colors.text.primary }]}
                            placeholder="Email address"
                            placeholderTextColor={colors.text.tertiary}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            value={loginEmail}
                            onChangeText={setLoginEmail}
                          />
                        </View>
                        <View style={[styles.emailInputContainer, { backgroundColor: colors.background.tertiary, borderColor: colors.border.light }]}>
                          <TextInput
                            style={[styles.phoneInput, { color: colors.text.primary, flex: 1 }]}
                            placeholder="Password"
                            placeholderTextColor={colors.text.tertiary}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                            value={loginPassword}
                            onChangeText={setLoginPassword}
                          />
                          <TouchableOpacity
                            onPress={() => setShowPassword(v => !v)}
                            style={{ paddingHorizontal: 14 }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            {showPassword
                              ? <EyeOff size={18} color={colors.text.tertiary} />
                              : <Eye size={18} color={colors.text.tertiary} />}
                          </TouchableOpacity>
                        </View>
                        <TouchableOpacity onPress={handleForgotPassword} style={{ alignSelf: 'flex-end', marginBottom: 16 }}>
                          <Text style={{ color: colors.brand.primary, fontSize: 13, fontWeight: '500' }}>Forgot password?</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.primaryButton,
                            { backgroundColor: isEmailSubmitting ? '#FCA5A5' : colors.brand.primary },
                          ]}
                          onPress={handleEmailLogin}
                          disabled={isEmailSubmitting}
                        >
                          <Text style={[styles.primaryButtonText, { color: '#FFF' }]}>
                            {isEmailSubmitting ? 'Signing in...' : 'Login'}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {/* ── Method toggle ── */}
                    <View style={styles.dividerRow}>
                      <View style={[styles.dividerLine, { backgroundColor: colors.border.light }]} />
                      <Text style={[styles.dividerText, { color: colors.text.tertiary }]}>or</Text>
                      <View style={[styles.dividerLine, { backgroundColor: colors.border.light }]} />
                    </View>
                    <TouchableOpacity
                      style={styles.methodToggleButton}
                      onPress={() => animateFade(() => setLoginMethod(m => m === 'phone' ? 'email' : 'phone'))}
                    >
                      <Text style={[styles.methodToggleText, { color: colors.text.secondary }]}>
                        {loginMethod === 'phone' ? 'Continue with email instead' : 'Continue with phone instead'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

              </Animated.View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backgroundImage: { position: 'absolute', top: 0, left: 0 },
  gradientOverlay: { position: 'absolute', bottom: 0, width: '100%' },
  logoSection: { position: 'absolute', alignSelf: 'center' },
  logoImage: {},
  keyboardView: { flex: 1, justifyContent: 'flex-end' },
  bottomSheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 20,
  },
  sheetHeader: { alignItems: 'center', paddingVertical: 10, marginBottom: 10 },
  sheetScrollContent: { paddingBottom: 12 },
  dragIndicator: { width: 40, height: 4, borderRadius: 2 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtext: { fontSize: 15, marginBottom: 24 },

  phoneInputContainer: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, borderWidth: 1, height: 52, marginBottom: 20,
  },
  emailInputContainer: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, borderWidth: 1, height: 52, marginBottom: 12,
  },
  countryCodeBox: { flexDirection: 'row', paddingHorizontal: 14, borderRightWidth: 1, gap: 6, alignItems: 'center' },
  countryCodeText: { fontSize: 16, fontWeight: '600' },
  phoneInput: { flex: 1, fontSize: 16, paddingHorizontal: 14 },

  otpContainer: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 24 },
  otpBox: { borderRadius: 12, borderWidth: 1, textAlign: 'center', fontSize: 24, fontWeight: 'bold' },

  primaryButton: { height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  primaryButtonText: { fontWeight: '600', fontSize: 16 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 12, fontSize: 13 },

  methodToggleButton: { alignItems: 'center', paddingVertical: 2 },
  methodToggleText: { fontSize: 14, fontWeight: '500' },
});