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
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  Login: { initialStep?: 'phone' | 'otp' };
  MainApp: undefined;
};

type LoginScreenRouteProp = RouteProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
  const { width, height } = useWindowDimensions();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<LoginScreenRouteProp>();
  const isCompact = width < 360;
  const logoSize = isCompact ? 88 : 100;
  const sheetPadding = isCompact ? 18 : 24;
  const otpBoxWidth = isCompact ? 44 : 50;
  const otpBoxHeight = isCompact ? 54 : 60;

  // State
  // Cek apakah ada parameter dari halaman sebelumnya (WelcomeScreen)
  const [step, setStep] = useState<'phone' | 'otp'>(route.params?.initialStep || 'phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [resendTimer, setResendTimer] = useState(30);
  
  const otpRefs = useRef<Array<TextInput | null>>([null, null, null, null]);
  const contentOpacity = useRef(new Animated.Value(1)).current;

  // Jika masuk langsung mode OTP, jalankan timer
  useEffect(() => {
    if (step === 'otp') {
      startResendTimer();
    }
  }, [step]);

  // Fungsi Timer Sederhana
  const startResendTimer = () => {
    setResendTimer(30);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  };

  // Handler: Pindah ke OTP
  const handleGetOtp = () => {
    if (phoneNumber.length >= 9) {
      Keyboard.dismiss();
      // Start animation FIRST
      Animated.timing(contentOpacity, { 
        toValue: 0, 
        duration: 150, 
        useNativeDriver: true 
      }).start();
      
      // Update state after animation begins
      setTimeout(() => {
        setStep('otp');
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        
        // Fade in after state change
        setTimeout(() => {
          Animated.timing(contentOpacity, { 
            toValue: 1, 
            duration: 200, 
            useNativeDriver: true 
          }).start(() => {
            // Auto focus OTP box pertama
            setTimeout(() => otpRefs.current[0]?.focus(), 100);
          });
        }, 50);
      }, 150);
      
      startResendTimer();
    }
  };


  // Handler: Kembali ke Phone Input
  const handleBackToPhone = () => {
    Keyboard.dismiss();
    Animated.timing(contentOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start();
    setTimeout(() => {
      setStep('phone');
      setOtp(['', '', '', '']);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setTimeout(() => {
        Animated.timing(contentOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      }, 50);
    }, 150);
  };

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    // Auto focus next
    if (text && index < 3) otpRefs.current[index + 1]?.focus();
  };

  const handleVerify = () => {
    if (otp.join('').length === 4) {
      navigation.navigate('MainApp');
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
      <Image source={require('../../assets/images/welcome1.jpg')} style={[styles.backgroundImage, { width, height }]} resizeMode="cover" />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.5)']} style={[styles.gradientOverlay, { height: height * 0.6 }]} pointerEvents="none" />
      
      <View style={styles.logoSection}>
        <Image source={require('../../assets/images/logo1.png')} style={[styles.logoImage, { width: logoSize, height: logoSize }]} resizeMode="contain" />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 28 : 0}
        style={styles.keyboardView}
      >
        <View style={[styles.bottomSheet, { padding: sheetPadding, paddingTop: 12, minHeight: height * 0.52 }]}>
          
          {/* Header Sheet (Bisa di-tap untuk turun jika perlu) */}
          <View style={styles.sheetHeader}>
            <View style={styles.dragIndicator} />
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.sheetScrollContent}
          >
          <Animated.View style={{ opacity: contentOpacity }}>
            
            {step === 'phone' ? (
              // --- FORM PHONE NUMBER ---
              <>
                <Text style={styles.header}>Welcome Back</Text>
                <Text style={styles.subtext}>Enter your mobile number to continue</Text>

                <View style={styles.phoneInputContainer}>
                  <View style={styles.countryCodeBox}>
                    <Text style={{ fontSize: 18 }}>🇮🇩</Text>
                    <Text style={styles.countryCodeText}>+62</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="812 3456 7890"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, phoneNumber.length < 9 && styles.primaryButtonDisabled]}
                  onPress={handleGetOtp}
                  disabled={phoneNumber.length < 9}
                >
                  <Text style={styles.primaryButtonText}>Get OTP</Text>
                </TouchableOpacity>
              </>
            ) : (
              // --- FORM OTP ---
              <>
                <TouchableOpacity onPress={handleBackToPhone} style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 16, color: '#6B7280' }}>← Back to number</Text>
                </TouchableOpacity>

                <Text style={styles.header}>Verify Phone</Text>
                <Text style={styles.subtext}>Code sent to your number</Text>

                <View style={styles.otpContainer}>
                  {otp.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => {
                        otpRefs.current[index] = ref;
                      }}
                      style={[styles.otpBox, { width: otpBoxWidth, height: otpBoxHeight }, digit && styles.otpBoxFilled]}
                      keyboardType="number-pad"
                      maxLength={1}
                      value={digit}
                      onChangeText={text => handleOtpChange(text, index)}
                    />
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, otp.join('').length < 4 && styles.primaryButtonDisabled]}
                  onPress={handleVerify}
                  disabled={otp.join('').length < 4}
                >
                  <Text style={styles.primaryButtonText}>Verify & Login</Text>
                </TouchableOpacity>

                <View style={{ alignItems: 'center', marginTop: 16 }}>
                  {resendTimer > 0 ? (
                    <Text style={{ color: '#9CA3AF' }}>Resend in 00:{resendTimer.toString().padStart(2, '0')}</Text>
                  ) : (
                    <TouchableOpacity onPress={() => startResendTimer()}>
                       <Text style={{ color: '#B91C2F', fontWeight: '600' }}>Resend Code</Text>
                    </TouchableOpacity>
                  )}
                </View>
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
  container: { flex: 1, backgroundColor: '#FEFDFB' },
  backgroundImage: { position: 'absolute', top: 0, left: 0 },
  gradientOverlay: { position: 'absolute', bottom: 0, width: '100%' },
  logoSection: { position: 'absolute', top: 60, alignSelf: 'center' },
  logoImage: {},
  keyboardView: { flex: 1, justifyContent: 'flex-end' },
  bottomSheet: {
    backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingBottom: 40,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 20
  },
  sheetHeader: { alignItems: 'center', paddingVertical: 10, marginBottom: 10 },
  sheetScrollContent: { paddingBottom: 12 },
  dragIndicator: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB' },
  header: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 8 },
  subtext: { fontSize: 15, color: '#6B7280', marginBottom: 24 },
  
  phoneInputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB',
    borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', height: 52, marginBottom: 20
  },
  countryCodeBox: { flexDirection: 'row', paddingHorizontal: 14, borderRightWidth: 1, borderRightColor: '#E5E7EB', gap: 6 },
  countryCodeText: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  phoneInput: { flex: 1, fontSize: 16, paddingHorizontal: 14 },

  otpContainer: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 24 },
  otpBox: { borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', textAlign: 'center', fontSize: 24, fontWeight: 'bold', backgroundColor: '#F9FAFB' },
  otpBoxFilled: { borderColor: '#B91C2F', backgroundColor: '#FFF5F5' },

  primaryButton: { height: 50, backgroundColor: '#B91C2F', borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  primaryButtonDisabled: { backgroundColor: '#E5E7EB' },
  primaryButtonText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
});