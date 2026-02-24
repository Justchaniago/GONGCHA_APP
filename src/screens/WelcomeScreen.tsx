import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  Platform,
  TextInput,
  Animated,
  Keyboard,
  Alert,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Eye, EyeOff } from 'lucide-react-native';
import OtpVerificationSection from '../components/OtpVerificationSection';
import { AuthService } from '../services/AuthService';
import { firebaseAuth } from '../config/firebase';
import { getGreeting } from '../utils/greetingHelper';

type RootStackParamList = {
  Welcome: undefined;
  Login: { initialStep?: 'phone' | 'otp' };
  MainApp: undefined;
};

type WelcomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Welcome'>;

const WELCOME_KEYBOARD_SHIFT_MULTIPLIER = 1.0;
const OTP_AUTH_PASSWORD = 'GongCha@123';

export default function WelcomeScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<WelcomeScreenNavigationProp>();
  const isCompact = width < 360;
  const logoSize = isCompact ? 104 : 120;
  const sheetPadding = isCompact ? 18 : 24;
  const sheetHiddenOffset = Math.max(400, height * 0.52);

  // ─── View & Method State ──────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<
    'initial' | 'login_form' | 'login_otp' | 'signup_form' | 'signup_otp'
  >('initial');
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  const [signupMethod, setSignupMethod] = useState<'phone' | 'email'>('phone');

  // ─── Phone Login State ────────────────────────────────────────────────────
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loginOtp, setLoginOtp] = useState(['', '', '', '']);
  const [loginResendTimer, setLoginResendTimer] = useState(30);

  // ─── Email Login State ────────────────────────────────────────────────────
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isEmailLoginSubmitting, setIsEmailLoginSubmitting] = useState(false);

  // ─── Phone Signup State ───────────────────────────────────────────────────
  const [signupName, setSignupName] = useState('');
  const [signupDob, setSignupDob] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupOtp, setSignupOtp] = useState(['', '', '', '']);
  const [signupResendTimer, setSignupResendTimer] = useState(30);

  // ─── Email Signup State ───────────────────────────────────────────────────
  const [signupEmailName, setSignupEmailName] = useState('');
  const [signupEmailAddress, setSignupEmailAddress] = useState('');
  const [signupEmailPassword, setSignupEmailPassword] = useState('');
  const [signupEmailConfirm, setSignupEmailConfirm] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirm, setShowSignupConfirm] = useState(false);
  const [isEmailSignupSubmitting, setIsEmailSignupSubmitting] = useState(false);

  // ─── OTP Auth State ───────────────────────────────────────────────────────
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [authProgressMessage, setAuthProgressMessage] = useState('');

  // ─── Animated Values ──────────────────────────────────────────────────────
  const getStartedOpacity = useRef(new Animated.Value(1)).current;
  const getStartedTranslateY = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(sheetHiddenOffset)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const keyboardShift = useRef(new Animated.Value(0)).current;
  const loginOtpRefs = useRef<Array<TextInput | null>>([null, null, null, null]);
  const loginTimerRef = useRef<NodeJS.Timeout | null>(null);
  const signupOtpRefs = useRef<Array<TextInput | null>>([null, null, null, null]);
  const signupTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

  const isOtpMode = viewMode === 'login_otp' || viewMode === 'signup_otp';
  const dynamicLogoTop = insets.top + (Platform.OS === 'ios' ? 60 : 40);
  const dynamicGetStartedBottom = Math.max(insets.bottom + 20, 32);
  const dynamicSheetBottomPadding =
    Math.max(insets.bottom + 16, 20) +
    (isOtpMode ? 12 : 0) +
    (isKeyboardVisible ? 18 : 0);

  const getDynamicLoginShift = (keyboardHeight: number) => {
    const isSmallScreen = height < 750;
    const isOtp = isOtpMode;
    const platformFactor = Platform.OS === 'ios'
      ? (isOtp ? 1.02 : 0.95) : (isOtp ? 0.84 : 0.76);
    const iosBonus = Platform.OS === 'ios' ? (isOtp ? 42 : 34) : 0;
    const rawShift = keyboardHeight * platformFactor - height * 0.14 + (isSmallScreen ? 24 : 10) + iosBonus;
    const minShift = isOtp ? 74 : 58;
    const maxShift = Platform.OS === 'ios'
      ? Math.min(height * (isOtp ? 0.44 : 0.39), isOtp ? 300 : 255)
      : Math.min(height * (isOtp ? 0.34 : 0.3), isOtp ? 210 : 180);
    return -clamp(rawShift * WELCOME_KEYBOARD_SHIFT_MULTIPLIER, minShift, maxShift);
  };

  // ─── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      if (user) navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      if (!['login_form', 'login_otp', 'signup_form', 'signup_otp'].includes(viewMode)) return;
      setIsKeyboardVisible(true);
      Animated.timing(keyboardShift, {
        toValue: getDynamicLoginShift(event.endCoordinates?.height ?? 0),
        duration: Platform.OS === 'ios' ? 250 : 200,
        useNativeDriver: true,
      }).start();
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
      Animated.timing(keyboardShift, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? 250 : 200,
        useNativeDriver: true,
      }).start();
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, [keyboardShift, viewMode]);

  useEffect(() => {
    return () => {
      if (loginTimerRef.current) clearInterval(loginTimerRef.current);
      if (signupTimerRef.current) clearInterval(signupTimerRef.current);
    };
  }, []);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const animateTransition = (callback: () => void) => {
    contentOpacity.stopAnimation();
    contentOpacity.setValue(1);
    requestAnimationFrame(() => { callback(); });
  };

  const generateDemoOtp = () => `${Math.floor(1000 + Math.random() * 9000)}`;

  const normalizePhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\s/g, '');
    if (/^\d+$/.test(cleaned)) return cleaned.replace(/^0+/, '') || '8123456789';
    return cleaned || '8123456789';
  };

  const mapPhoneToEmail = (phone: string) =>
    `${normalizePhoneNumber(phone)}@gongcha-id.app`;

  const startResendTimer = (
    timerRef: React.MutableRefObject<NodeJS.Timeout | null>,
    setTimer: React.Dispatch<React.SetStateAction<number>>,
  ) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimer(30);
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) { if (timerRef.current) clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleOtpDigitChange = (
    text: string, index: number,
    otpState: string[], setOtpState: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<Array<TextInput | null>>,
  ) => {
    const digit = text.replace(/\D/g, '').slice(0, 1);
    const next = [...otpState]; next[index] = digit; setOtpState(next);
    if (digit && index < 3) refs.current[index + 1]?.focus();
  };

  const handleDobChange = (text: string) => {
    const d = text.replace(/\D/g, '').slice(0, 8);
    if (d.length <= 2) { setSignupDob(d); return; }
    if (d.length <= 4) { setSignupDob(`${d.slice(0, 2)}/${d.slice(2)}`); return; }
    setSignupDob(`${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`);
  };

  // ─── Navigation ───────────────────────────────────────────────────────────
  const handleGetStarted = () => {
    Animated.parallel([
      Animated.timing(getStartedOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(getStartedTranslateY, { toValue: -30, duration: 250, useNativeDriver: true }),
      Animated.spring(sheetTranslateY, { toValue: 0, friction: 9, tension: 65, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setViewMode('login_form'), 50);
  };

  const handleBackToSelection = () => {
    Keyboard.dismiss();
    animateTransition(() => {
      setPhoneNumber(''); setLoginOtp(['', '', '', '']); setLoginResendTimer(30);
      if (loginTimerRef.current) clearInterval(loginTimerRef.current);
      setSignupName(''); setSignupDob(''); setSignupPhone('');
      setSignupOtp(['', '', '', '']); setSignupResendTimer(30);
      if (signupTimerRef.current) clearInterval(signupTimerRef.current);
      setLoginEmail(''); setLoginPassword('');
      setSignupEmailName(''); setSignupEmailAddress('');
      setSignupEmailPassword(''); setSignupEmailConfirm('');
      setLoginMethod('phone'); setSignupMethod('phone');

      Animated.parallel([
        Animated.timing(getStartedOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(getStartedTranslateY, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(sheetTranslateY, { toValue: sheetHiddenOffset, duration: 250, useNativeDriver: true }),
      ]).start(() => {
        setViewMode('initial');
        sheetTranslateY.setValue(sheetHiddenOffset);
        getStartedOpacity.setValue(1);
        getStartedTranslateY.setValue(0);
      });
    });
  };

  const handleCloseSheet = () => {
    Keyboard.dismiss();
    if (['login_form', 'login_otp', 'signup_form', 'signup_otp'].includes(viewMode)) {
      handleBackToSelection();
    } else {
      Animated.parallel([
        Animated.timing(getStartedOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(getStartedTranslateY, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(sheetTranslateY, { toValue: sheetHiddenOffset, duration: 300, useNativeDriver: true }),
      ]).start(() => setViewMode('initial'));
    }
  };

  // ─── Phone Login ──────────────────────────────────────────────────────────
  const handleGetOtp = () => {
    if (!phoneNumber.trim()) setPhoneNumber('8123456789');
    Alert.alert('OTP Demo (Login)', `Kode OTP demo: ${generateDemoOtp()}\nUntuk trial, isi sembarang 4 digit juga bisa.`);
    Keyboard.dismiss();
    setLoginOtp(['', '', '', '']);
    animateTransition(() => setViewMode('login_otp'));
    startResendTimer(loginTimerRef, setLoginResendTimer);
    setTimeout(() => loginOtpRefs.current[0]?.focus(), 120);
  };

  const handleLoginOtpBack = () => {
    Keyboard.dismiss();
    if (loginTimerRef.current) clearInterval(loginTimerRef.current);
    animateTransition(() => setViewMode('login_form'));
  };

  const handleLoginOtpVerify = async () => {
    if (loginOtp.join('').length < 4) { Alert.alert('OTP belum lengkap', 'Masukkan 4 digit OTP.'); return; }
    const email = mapPhoneToEmail(phoneNumber);
    try {
      setIsAuthSubmitting(true);
      setAuthProgressMessage('Signing in securely...');
      await AuthService.login(email, OTP_AUTH_PASSWORD);
      navigation.navigate('MainApp');
    } catch (error: any) {
      const message = String(error?.message || 'Login gagal.');
      if (message.includes('timed out')) Alert.alert('Koneksi bermasalah', 'Request terlalu lama. Cek internet.');
      else if (message.includes('User profile not found') || message.includes('auth/invalid-credential')) Alert.alert('Akun tidak ditemukan', 'Nomor belum terdaftar. Silakan Sign Up.');
      else if (message.includes('auth/network-request-failed')) Alert.alert('Login gagal', 'Cek koneksi internet kamu.');
      else Alert.alert('Login gagal', message);
    } finally {
      setIsAuthSubmitting(false);
      setAuthProgressMessage('');
    }
  };

  const handleLoginResend = () => {
    Alert.alert('Resend OTP (Login)', `Kode OTP baru: ${generateDemoOtp()}`);
    startResendTimer(loginTimerRef, setLoginResendTimer);
  };

  // ─── Email Login ──────────────────────────────────────────────────────────
  const handleEmailLogin = async () => {
    if (!loginEmail.trim() || !loginPassword.trim()) { Alert.alert('Form tidak lengkap', 'Masukkan email dan password.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail.trim())) { Alert.alert('Email tidak valid', 'Masukkan format email yang benar.'); return; }
    try {
      setIsEmailLoginSubmitting(true);
      await AuthService.loginWithEmail(loginEmail.trim(), loginPassword);
      navigation.navigate('MainApp');
    } catch (error: any) {
      const message = String(error?.message || 'Login gagal.');
      if (message.includes('auth/invalid-credential') || message.includes('auth/wrong-password') || message.includes('auth/user-not-found'))
        Alert.alert('Login gagal', 'Email atau password salah.');
      else if (message.includes('auth/too-many-requests'))
        Alert.alert('Terlalu banyak percobaan', 'Coba lagi nanti atau reset password.');
      else if (message.includes('auth/network-request-failed'))
        Alert.alert('Login gagal', 'Cek koneksi internet kamu.');
      else Alert.alert('Login gagal', message);
    } finally {
      setIsEmailLoginSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = loginEmail.trim();
    if (!email) { Alert.alert('Masukkan email', 'Isi email kamu di atas terlebih dahulu.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { Alert.alert('Email tidak valid', 'Masukkan format email yang benar.'); return; }
    try {
      await AuthService.sendPasswordReset(email);
      Alert.alert('Email terkirim! 📧', `Link reset dikirim ke ${email}. Cek inbox atau spam.`);
    } catch (error: any) {
      const message = String(error?.message || '');
      if (message.includes('auth/user-not-found')) Alert.alert('Email tidak terdaftar', 'Tidak ada akun dengan email ini.');
      else Alert.alert('Gagal', message);
    }
  };

  // ─── Signup Navigation ────────────────────────────────────────────────────
  const handleOpenSignUp = () => { Keyboard.dismiss(); animateTransition(() => setViewMode('signup_form')); };
  const handleBackToLoginForm = () => { Keyboard.dismiss(); animateTransition(() => setViewMode('login_form')); };

  // ─── Phone Signup ─────────────────────────────────────────────────────────
  const handleSignUpGetOtp = () => {
    if (!signupName.trim()) setSignupName('User Trial');
    if (!signupDob.trim()) setSignupDob('01/01/2000');
    if (!signupPhone.trim()) setSignupPhone('8123456789');
    Alert.alert('OTP Demo (Sign Up)', `Kode OTP demo: ${generateDemoOtp()}\nUntuk trial, isi sembarang 4 digit juga bisa.`);
    Keyboard.dismiss();
    setSignupOtp(['', '', '', '']);
    animateTransition(() => setViewMode('signup_otp'));
    startResendTimer(signupTimerRef, setSignupResendTimer);
    setTimeout(() => signupOtpRefs.current[0]?.focus(), 120);
  };

  const handleSignupOtpBack = () => {
    Keyboard.dismiss();
    if (signupTimerRef.current) clearInterval(signupTimerRef.current);
    animateTransition(() => setViewMode('signup_form'));
  };

  const handleSignupOtpVerify = async () => {
    if (signupOtp.join('').length < 4) { Alert.alert('OTP belum lengkap', 'Masukkan 4 digit OTP.'); return; }
    const normalizedPhone = normalizePhoneNumber(signupPhone);
    const email = mapPhoneToEmail(normalizedPhone);
    const profileName = signupName.trim() || 'User Trial';
    try {
      setIsAuthSubmitting(true);
      setAuthProgressMessage('Creating account...');
      await AuthService.register(email, OTP_AUTH_PASSWORD, profileName, normalizedPhone);
      navigation.navigate('MainApp');
    } catch (error: any) {
      const message = String(error?.message || 'Registrasi gagal.');
      if (message.includes('timed out')) Alert.alert('Koneksi bermasalah', 'Request terlalu lama. Cek internet.');
      else if (message.includes('auth/email-already-in-use')) {
        try {
          setAuthProgressMessage('Account exists, signing in...');
          await AuthService.login(email, OTP_AUTH_PASSWORD);
          navigation.navigate('MainApp'); return;
        } catch { Alert.alert('Registrasi gagal', 'Akun sudah ada tapi tidak bisa login. Coba lagi nanti.'); }
      } else if (message.includes('auth/network-request-failed')) Alert.alert('Registrasi gagal', 'Cek koneksi internet kamu.');
      else Alert.alert('Registrasi gagal', message);
    } finally {
      setIsAuthSubmitting(false);
      setAuthProgressMessage('');
    }
  };

  const handleSignupResend = () => {
    Alert.alert('Resend OTP (Sign Up)', `Kode OTP baru: ${generateDemoOtp()}`);
    startResendTimer(signupTimerRef, setSignupResendTimer);
  };

  // ─── Email Signup ─────────────────────────────────────────────────────────
  const handleEmailSignup = async () => {
    if (!signupEmailName.trim()) { Alert.alert('Nama diperlukan', 'Masukkan nama lengkap kamu.'); return; }
    if (!signupEmailAddress.trim()) { Alert.alert('Email diperlukan', 'Masukkan alamat email kamu.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupEmailAddress.trim())) { Alert.alert('Email tidak valid', 'Masukkan format email yang benar.'); return; }
    if (signupEmailPassword.length < 6) { Alert.alert('Password terlalu pendek', 'Password minimal 6 karakter.'); return; }
    if (signupEmailPassword !== signupEmailConfirm) { Alert.alert('Password tidak cocok', 'Konfirmasi password tidak sesuai.'); return; }
    try {
      setIsEmailSignupSubmitting(true);
      await AuthService.registerWithEmail(signupEmailAddress.trim(), signupEmailPassword, signupEmailName.trim());
      navigation.navigate('MainApp');
    } catch (error: any) {
      const message = String(error?.message || 'Registrasi gagal.');
      if (message.includes('auth/email-already-in-use')) Alert.alert('Email sudah terdaftar', 'Silakan login atau gunakan email lain.');
      else if (message.includes('auth/network-request-failed')) Alert.alert('Registrasi gagal', 'Cek koneksi internet kamu.');
      else Alert.alert('Registrasi gagal', message);
    } finally {
      setIsEmailSignupSubmitting(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>

        {/* Background Image */}
        <View style={{ flex: 1, position: 'absolute', width: '100%', height: '100%' }}>
          <Image
            source={require('../../assets/images/welcome1.webp')}
            style={{ flex: 1, width: undefined, height: undefined }}
            resizeMode="cover"
          />
        </View>

        {/* Logo */}
        <View style={[styles.logoSection, { top: dynamicLogoTop }]}>
          <Image
            source={require('../../assets/images/logo1.webp')}
            style={[styles.logoImage, { width: logoSize, height: logoSize }]}
            resizeMode="contain"
          />
        </View>

        <TouchableOpacity
          style={[styles.gradientOverlay, { height: height * 0.5 }]}
          activeOpacity={1}
          onPress={Keyboard.dismiss}
        >
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
            locations={[0, 0.4, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        </TouchableOpacity>

        {/* Get Started Button */}
        <Animated.View
          style={[
            styles.getStartedWrapper,
            { bottom: dynamicGetStartedBottom, opacity: getStartedOpacity, transform: [{ translateY: getStartedTranslateY }] },
          ]}
          pointerEvents={viewMode === 'initial' ? 'auto' : 'none'}
        >
          <TouchableOpacity style={styles.getStartedButton} onPress={handleGetStarted} activeOpacity={0.8}>
            <Text style={styles.getStartedText}>Get started</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Bottom Sheet */}
        <Animated.View
          style={[
            styles.bottomSheetContainer,
            { transform: [{ translateY: Animated.add(sheetTranslateY, keyboardShift) }] },
          ]}
        >
          <View style={[styles.bottomSheetContent, { padding: sheetPadding, paddingTop: 12, paddingBottom: dynamicSheetBottomPadding }]}>

            <TouchableOpacity style={styles.sheetHeader} onPress={handleCloseSheet} activeOpacity={0.6}>
              <View style={styles.dragIndicator} />
            </TouchableOpacity>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={styles.sheetScrollContent}
            >
              <Animated.View key={viewMode} style={{ opacity: contentOpacity }}>

                {/* ══ LOGIN FORM ══ */}
                {viewMode === 'login_form' && (
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                      <TouchableOpacity onPress={handleBackToSelection} style={{ padding: 4, marginRight: 8 }}>
                        <Text style={{ fontSize: 20, color: '#1A1A1A' }}>←</Text>
                      </TouchableOpacity>
                      <View>
                        <Text style={styles.formTitle}>{getGreeting()}</Text>
                        <Text style={styles.formSubtext}>
                          {loginMethod === 'phone' ? 'Enter mobile number to continue' : 'Sign in with your email'}
                        </Text>
                      </View>
                    </View>

                    {loginMethod === 'phone' ? (
                      <>
                        <View style={styles.phoneInputContainer}>
                          <View style={styles.countryCodeBox}>
                            <Text style={{ fontSize: 18 }}>🇮🇩</Text>
                            <Text style={styles.countryCodeText}>+62</Text>
                          </View>
                          <TextInput
                            style={styles.phoneInput}
                            placeholder="812 3456 7890"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="default"
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
                          />
                        </View>
                        <TouchableOpacity style={styles.primaryButton} onPress={handleGetOtp}>
                          <Text style={styles.primaryButtonText}>Get OTP</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <View style={styles.textInputContainer}>
                          <TextInput
                            style={styles.phoneInput}
                            placeholder="Email address"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            value={loginEmail}
                            onChangeText={setLoginEmail}
                          />
                        </View>
                        <View style={styles.textInputContainer}>
                          <TextInput
                            style={[styles.phoneInput, { flex: 1 }]}
                            placeholder="Password"
                            placeholderTextColor="#9CA3AF"
                            secureTextEntry={!showLoginPassword}
                            autoCapitalize="none"
                            value={loginPassword}
                            onChangeText={setLoginPassword}
                          />
                          <TouchableOpacity
                            onPress={() => setShowLoginPassword(v => !v)}
                            style={{ paddingHorizontal: 14 }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            {showLoginPassword
                              ? <EyeOff size={18} color="#9CA3AF" />
                              : <Eye size={18} color="#9CA3AF" />}
                          </TouchableOpacity>
                        </View>
                        <TouchableOpacity onPress={handleForgotPassword} style={{ alignSelf: 'flex-end', marginBottom: 16 }}>
                          <Text style={{ color: '#B91C2F', fontSize: 13, fontWeight: '500' }}>Forgot password?</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.primaryButton, isEmailLoginSubmitting && { backgroundColor: '#E5E7EB' }]}
                          onPress={handleEmailLogin}
                          disabled={isEmailLoginSubmitting}
                        >
                          <Text style={[styles.primaryButtonText, isEmailLoginSubmitting && { color: '#9CA3AF' }]}>
                            {isEmailLoginSubmitting ? 'Signing in...' : 'Login'}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {/* Method toggle */}
                    <View style={styles.dividerRow}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>or</Text>
                      <View style={styles.dividerLine} />
                    </View>
                    <TouchableOpacity
                      style={styles.methodToggleButton}
                      onPress={() => setLoginMethod(m => m === 'phone' ? 'email' : 'phone')}
                    >
                      <Text style={styles.methodToggleText}>
                        {loginMethod === 'phone' ? 'Continue with email instead' : 'Continue with phone instead'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.signUpButton, { marginTop: 10 }]} onPress={handleOpenSignUp}>
                      <Text style={styles.signUpButtonText}>Sign Up</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* ══ SIGNUP FORM ══ */}
                {viewMode === 'signup_form' && (
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                      <TouchableOpacity onPress={handleBackToLoginForm} style={{ padding: 4, marginRight: 8 }}>
                        <Text style={{ fontSize: 20, color: '#1A1A1A' }}>←</Text>
                      </TouchableOpacity>
                      <View>
                        <Text style={styles.formTitle}>Create Account</Text>
                        <Text style={styles.formSubtext}>
                          {signupMethod === 'phone' ? 'Fill a few details to continue' : 'Sign up with your email'}
                        </Text>
                      </View>
                    </View>

                    {signupMethod === 'phone' ? (
                      <>
                        <View style={styles.textInputContainer}>
                          <TextInput style={styles.phoneInput} placeholder="Full name" placeholderTextColor="#9CA3AF" value={signupName} onChangeText={setSignupName} />
                        </View>
                        <View style={styles.textInputContainer}>
                          <TextInput style={styles.phoneInput} placeholder="Date of birth (DD/MM/YYYY)" placeholderTextColor="#9CA3AF" value={signupDob} onChangeText={handleDobChange} keyboardType="number-pad" maxLength={10} />
                        </View>
                        <View style={styles.phoneInputContainer}>
                          <View style={styles.countryCodeBox}>
                            <Text style={{ fontSize: 18 }}>🇮🇩</Text>
                            <Text style={styles.countryCodeText}>+62</Text>
                          </View>
                          <TextInput style={styles.phoneInput} placeholder="812 3456 7890" placeholderTextColor="#9CA3AF" keyboardType="default" value={signupPhone} onChangeText={setSignupPhone} />
                        </View>
                        <TouchableOpacity style={styles.primaryButton} onPress={handleSignUpGetOtp}>
                          <Text style={styles.primaryButtonText}>Get OTP</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <View style={styles.textInputContainer}>
                          <TextInput style={styles.phoneInput} placeholder="Full name" placeholderTextColor="#9CA3AF" autoCapitalize="words" value={signupEmailName} onChangeText={setSignupEmailName} />
                        </View>
                        <View style={styles.textInputContainer}>
                          <TextInput style={styles.phoneInput} placeholder="Email address" placeholderTextColor="#9CA3AF" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} value={signupEmailAddress} onChangeText={setSignupEmailAddress} />
                        </View>
                        <View style={styles.textInputContainer}>
                          <TextInput
                            style={[styles.phoneInput, { flex: 1 }]}
                            placeholder="Password (min. 6 characters)"
                            placeholderTextColor="#9CA3AF"
                            secureTextEntry={!showSignupPassword}
                            autoCapitalize="none"
                            value={signupEmailPassword}
                            onChangeText={setSignupEmailPassword}
                          />
                          <TouchableOpacity onPress={() => setShowSignupPassword(v => !v)} style={{ paddingHorizontal: 14 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            {showSignupPassword ? <EyeOff size={18} color="#9CA3AF" /> : <Eye size={18} color="#9CA3AF" />}
                          </TouchableOpacity>
                        </View>
                        <View style={styles.textInputContainer}>
                          <TextInput
                            style={[styles.phoneInput, { flex: 1 }]}
                            placeholder="Confirm password"
                            placeholderTextColor="#9CA3AF"
                            secureTextEntry={!showSignupConfirm}
                            autoCapitalize="none"
                            value={signupEmailConfirm}
                            onChangeText={setSignupEmailConfirm}
                          />
                          <TouchableOpacity onPress={() => setShowSignupConfirm(v => !v)} style={{ paddingHorizontal: 14 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            {showSignupConfirm ? <EyeOff size={18} color="#9CA3AF" /> : <Eye size={18} color="#9CA3AF" />}
                          </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                          style={[styles.primaryButton, isEmailSignupSubmitting && { backgroundColor: '#E5E7EB' }]}
                          onPress={handleEmailSignup}
                          disabled={isEmailSignupSubmitting}
                        >
                          <Text style={[styles.primaryButtonText, isEmailSignupSubmitting && { color: '#9CA3AF' }]}>
                            {isEmailSignupSubmitting ? 'Creating account...' : 'Create Account'}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}

                    <View style={styles.dividerRow}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>or</Text>
                      <View style={styles.dividerLine} />
                    </View>
                    <TouchableOpacity style={styles.methodToggleButton} onPress={() => setSignupMethod(m => m === 'phone' ? 'email' : 'phone')}>
                      <Text style={styles.methodToggleText}>
                        {signupMethod === 'phone' ? 'Sign up with email instead' : 'Sign up with phone instead'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* ══ LOGIN OTP ══ */}
                {viewMode === 'login_otp' &&
                  <OtpVerificationSection
                    phone={phoneNumber}
                    otp={loginOtp}
                    otpRefs={loginOtpRefs}
                    onChange={(text, index) => handleOtpDigitChange(text, index, loginOtp, setLoginOtp, loginOtpRefs)}
                    onBack={handleLoginOtpBack}
                    onVerify={handleLoginOtpVerify}
                    verifyLabel={isAuthSubmitting ? 'Processing...' : 'Verify & Login'}
                    progressMessage={authProgressMessage}
                    resendTimer={loginResendTimer}
                    onResend={handleLoginResend}
                    isSubmitting={isAuthSubmitting}
                  />
                }

                {/* ══ SIGNUP OTP ══ */}
                {viewMode === 'signup_otp' &&
                  <OtpVerificationSection
                    phone={signupPhone}
                    otp={signupOtp}
                    otpRefs={signupOtpRefs}
                    onChange={(text, index) => handleOtpDigitChange(text, index, signupOtp, setSignupOtp, signupOtpRefs)}
                    onBack={handleSignupOtpBack}
                    onVerify={handleSignupOtpVerify}
                    verifyLabel={isAuthSubmitting ? 'Processing...' : 'Verify & Create Account'}
                    progressMessage={authProgressMessage}
                    resendTimer={signupResendTimer}
                    onResend={handleSignupResend}
                    isSubmitting={isAuthSubmitting}
                  />
                }

              </Animated.View>
            </ScrollView>
          </View>
        </Animated.View>

      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEFDFB' },
  logoSection: { position: 'absolute', alignSelf: 'center', zIndex: 10 },
  logoImage: {},
  gradientOverlay: { position: 'absolute', bottom: 0, width: '100%' },

  getStartedWrapper: { position: 'absolute', left: 24, right: 24, zIndex: 15 },
  getStartedButton: {
    height: 56, backgroundColor: '#B91C2F', borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  getStartedText: { fontSize: 17, fontWeight: '600', color: '#FFF' },

  bottomSheetContainer: {
    position: 'absolute', bottom: 0, width: '100%',
    backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.2, shadowRadius: 20, elevation: 25, zIndex: 20,
  },
  bottomSheetContent: {},
  sheetScrollContent: { paddingBottom: 10 },
  sheetHeader: { alignItems: 'center', paddingVertical: 10, marginBottom: 10, width: '100%' },
  dragIndicator: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#E5E7EB' },

  formTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A' },
  formSubtext: { fontSize: 13, color: '#6B7280' },

  phoneInputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB',
    borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', height: 54, marginBottom: 20,
  },
  textInputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB',
    borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', height: 54, marginBottom: 12,
  },
  countryCodeBox: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, borderRightWidth: 1, borderRightColor: '#E5E7EB', gap: 6,
  },
  countryCodeText: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  phoneInput: { flex: 1, fontSize: 16, paddingHorizontal: 14, color: '#1A1A1A' },

  primaryButton: { height: 50, backgroundColor: '#B91C2F', borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  primaryButtonText: { color: '#FFF', fontWeight: '600', fontSize: 16 },

  signUpButton: {
    height: 50, backgroundColor: '#FFF', borderRadius: 25,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#B91C2F',
  },
  signUpButtonText: { color: '#B91C2F', fontWeight: '600', fontSize: 16 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { marginHorizontal: 12, fontSize: 13, color: '#9CA3AF' },

  methodToggleButton: { alignItems: 'center', paddingVertical: 2 },
  methodToggleText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
});