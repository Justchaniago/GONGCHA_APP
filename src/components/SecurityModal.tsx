import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  ActivityIndicator,
  Easing,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Delete,
  Fingerprint,
  Lock,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react-native';

export type SecurityModalMode =
  | 'settings'
  | 'setup'
  | 'confirm'
  | 'unlock'
  | 'changeCurrent'
  | 'changeNew'
  | 'disable';

export interface SecurityModalProps {
  visible: boolean;
  mode: SecurityModalMode;
  pinValue: string;
  loading?: boolean;
  error?: string | null;
  settingsTitle?: string;
  settingsDescription?: string;
  pinEnabled: boolean;
  biometricEnabled: boolean;
  biometricAvailable: boolean;
  appLockEnabled: boolean;
  canDismiss: boolean;
  canGoBack: boolean;
  onClose: () => void;
  onBack: () => void;
  onPinChange: (value: string) => void;
  onSubmitPin: () => void;
  onUseBiometric: () => void;
  onBeginSetup: () => void;
  onBeginChangePin: () => void;
  onBeginDisablePin: () => void;
  onToggleBiometric: (value: boolean) => void;
  onToggleAppLock: (value: boolean) => void;
}

function getCopy(mode: SecurityModalMode) {
  switch (mode) {
    case 'setup':
      return {
        step: 'Step 1 of 2',
        eyebrow: 'Security PIN',
        title: 'Create a 6-digit PIN',
        body: 'Use this PIN before redeeming points, opening your member QR, and using vouchers.',
        action: 'Continue',
        helper: 'Your PIN helps protect redemption and voucher access on this device.',
      };
    case 'confirm':
      return {
        step: 'Step 2 of 2',
        eyebrow: 'Confirm PIN',
        title: 'Enter the same PIN again',
        body: 'Repeat the 6 digits you just created so we can save them safely.',
        action: 'Save PIN',
        helper: 'This second step helps make sure your PIN was entered correctly.',
      };
    case 'changeCurrent':
      return {
        step: 'Step 1 of 2',
        eyebrow: 'Change PIN',
        title: 'Enter your current PIN',
        body: 'We will verify your existing PIN before you can choose a new one.',
        action: 'Continue',
        helper: 'This keeps someone else from changing your PIN without permission.',
      };
    case 'changeNew':
      return {
        step: 'Step 2 of 2',
        eyebrow: 'Change PIN',
        title: 'Create a new PIN',
        body: 'Choose 6 digits that are easy for you to remember and hard for others to guess.',
        action: 'Update PIN',
        helper: 'Your new PIN will replace the current one on this device.',
      };
    case 'disable':
      return {
        step: 'Confirm',
        eyebrow: 'Disable PIN',
        title: 'Confirm your PIN',
        body: 'Enter your active PIN to turn off this protection on the current device.',
        action: 'Disable PIN',
        helper: 'Biometric unlock will also be turned off when the PIN is disabled.',
      };
    case 'unlock':
    default:
      return {
        step: 'Protected action',
        eyebrow: 'Security Check',
        title: 'Verify it is really you',
        body: 'Use your PIN or biometrics before this sensitive action can continue.',
        action: 'Unlock',
        helper: 'Pending points still need validation before they become redeemable.',
      };
  }
}

const KEYPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

const KEYPAD_GAP = 10;

export default function SecurityModal({
  visible,
  mode,
  pinValue,
  loading = false,
  error,
  settingsTitle,
  settingsDescription,
  pinEnabled,
  biometricEnabled,
  biometricAvailable,
  appLockEnabled,
  canDismiss,
  canGoBack,
  onClose,
  onBack,
  onPinChange,
  onSubmitPin,
  onUseBiometric,
  onBeginSetup,
  onBeginChangePin,
  onBeginDisablePin,
  onToggleBiometric,
  onToggleAppLock,
}: SecurityModalProps) {
  const { width } = useWindowDimensions();
  const copy = useMemo(() => getCopy(mode), [mode]);
  const isSettings = mode === 'settings';

  const horizontalInset = Math.min(Math.max(width * 0.05, 16), 22);
  const keypadButtonSize = Math.min(
    Math.max((width - horizontalInset * 2 - KEYPAD_GAP * 2) / 3, 56),
    78,
  );

  const feedbackCopy = error ?? (loading ? 'Checking your PIN…' : copy.helper);

  const [mounted, setMounted] = useState(visible);
  const pageOpacity = useRef(new Animated.Value(0)).current;
  const pageTranslateY = useRef(new Animated.Value(18)).current;
  const keypadOpacity = useRef(new Animated.Value(0)).current;
  const keypadTranslateY = useRef(new Animated.Value(28)).current;

  const appendDigit = (digit: string) => {
    if (loading || pinValue.length >= 6) return;
    onPinChange(`${pinValue}${digit}`.slice(0, 6));
  };

  const removeDigit = () => {
    if (loading || pinValue.length === 0) return;
    onPinChange(pinValue.slice(0, -1));
  };

  useEffect(() => {
    if (visible) {
      setMounted(true);
      pageOpacity.setValue(0);
      pageTranslateY.setValue(18);
      keypadOpacity.setValue(0);
      keypadTranslateY.setValue(28);

      Animated.parallel([
        Animated.timing(pageOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(pageTranslateY, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(70),
          Animated.parallel([
            Animated.timing(keypadOpacity, {
              toValue: 1,
              duration: 220,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(keypadTranslateY, {
              toValue: 0,
              duration: 260,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start();
      return;
    }

    if (!mounted) return;

    Animated.parallel([
      Animated.timing(keypadOpacity, {
        toValue: 0,
        duration: 140,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(keypadTranslateY, {
        toValue: 18,
        duration: 140,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(pageOpacity, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(pageTranslateY, {
        toValue: 12,
        duration: 180,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [keypadOpacity, keypadTranslateY, mounted, pageOpacity, pageTranslateY, visible]);

  if (!mounted) return null;

  return (
    <Animated.View style={[styles.portalRoot, { opacity: pageOpacity }]} pointerEvents="box-none">
      {isSettings ? (
        <View style={styles.root}>
          <Animated.View style={{ flex: 1, transform: [{ translateY: pageTranslateY }] }}>
            <SafeAreaView edges={['top', 'bottom']} style={[styles.sheet, { paddingHorizontal: horizontalInset }]}>
              <View style={styles.topBar}>
                <View style={styles.topBarSide}>
                  {canGoBack ? (
                    <TouchableOpacity style={styles.navButton} onPress={onBack} activeOpacity={0.82}>
                      <ChevronLeft size={20} color="#201A17" />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.navPlaceholder} />
                  )}
                </View>
                <Text style={styles.topBarTitle}>Security</Text>
                <View style={styles.topBarSide}>
                  {canDismiss ? (
                    <TouchableOpacity style={styles.navButton} onPress={onClose} activeOpacity={0.82}>
                      <X size={18} color="#201A17" />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.navPlaceholder} />
                  )}
                </View>
              </View>

              <LinearGradient
                colors={['#FFF6F1', '#FDF1EA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.settingsHero}
              >
                <View style={styles.settingsHeroTop}>
                  <View style={styles.heroIcon}>
                    <ShieldCheck size={18} color="#B91C2F" />
                  </View>
                  <View style={[styles.stateChip, pinEnabled ? styles.stateChipActive : styles.stateChipIdle]}>
                    <Text style={[styles.stateChipText, pinEnabled ? styles.stateChipTextActive : styles.stateChipTextIdle]}>
                      {pinEnabled ? 'PIN active' : 'PIN off'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.stepLabel}>Manage protection</Text>
                <Text style={[styles.eyebrow, styles.leftAlignedEyebrow]}>Security</Text>
                <Text style={styles.sheetTitle}>{settingsTitle ?? 'Protect vouchers and points'}</Text>
                <Text style={styles.sheetBody}>
                  {settingsDescription ??
                    'Turn on a PIN to protect redemptions, voucher access, and your member card on this device.'}
                </Text>
              </LinearGradient>

              <View style={styles.card}>
                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <Lock size={18} color="#B91C2F" />
                  </View>
                  <View style={styles.infoCopy}>
                    <Text style={styles.infoTitle}>What the PIN protects</Text>
                    <Text style={styles.infoBody}>
                      Redeeming points, showing voucher QR codes, opening your member QR, and unlocking the app after a timeout.
                    </Text>
                  </View>
                </View>

                {!pinEnabled ? (
                  <TouchableOpacity style={styles.primaryButton} onPress={onBeginSetup} activeOpacity={0.86}>
                    <Text style={styles.primaryButtonText}>Create PIN</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <View style={styles.settingRow}>
                      <View style={styles.settingCopy}>
                        <Text style={styles.settingTitle}>App relock</Text>
                        <Text style={styles.settingBody}>
                          Ask for verification again when the app returns after being idle for a few minutes.
                        </Text>
                      </View>
                      <Switch
                        value={appLockEnabled}
                        onValueChange={onToggleAppLock}
                        trackColor={{ true: '#F4A7B3', false: '#D6D3D1' }}
                        thumbColor={appLockEnabled ? '#B91C2F' : '#F5F5F4'}
                      />
                    </View>

                    <View style={styles.settingRow}>
                      <View style={styles.settingCopy}>
                        <Text style={styles.settingTitle}>Biometric unlock</Text>
                        <Text style={styles.settingBody}>
                          {biometricAvailable
                            ? 'Use Face ID or fingerprint for faster verification.'
                            : 'Biometric unlock is not available on this device yet.'}
                        </Text>
                      </View>
                      <Switch
                        value={biometricEnabled}
                        onValueChange={onToggleBiometric}
                        disabled={!biometricAvailable}
                        trackColor={{ true: '#F4A7B3', false: '#D6D3D1' }}
                        thumbColor={biometricEnabled ? '#B91C2F' : '#F5F5F4'}
                      />
                    </View>

                    <TouchableOpacity style={styles.secondaryButton} onPress={onBeginChangePin} activeOpacity={0.86}>
                      <Lock size={16} color="#201A17" />
                      <Text style={styles.secondaryButtonText}>Change PIN</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.textButton} onPress={onBeginDisablePin} activeOpacity={0.86}>
                      <Text style={styles.textButtonText}>Disable PIN on this device</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              <View style={styles.footerHint}>
                <Smartphone size={14} color="#8B6F67" />
                <Text style={styles.footerText}>
                  Pending points remain unavailable until the related transaction is verified.
                </Text>
              </View>
            </SafeAreaView>
          </Animated.View>
        </View>
      ) : (
        <Animated.View style={{ flex: 1, transform: [{ translateY: pageTranslateY }] }}>
          <SafeAreaView
            edges={['top', 'bottom']}
            style={[styles.fullscreenRoot, { paddingHorizontal: horizontalInset }]}
          >
            <View style={styles.topBar}>
              <View style={styles.topBarSide}>
                {canGoBack ? (
                  <TouchableOpacity style={styles.navButton} onPress={onBack} activeOpacity={0.82}>
                    <ChevronLeft size={20} color="#201A17" />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.navPlaceholder} />
                )}
              </View>
              <Text style={styles.topBarTitle}>
                {mode === 'unlock' ? 'Security Check' : 'Security PIN'}
              </Text>
              <View style={styles.topBarSide}>
                {canDismiss ? (
                  <TouchableOpacity style={styles.navButton} onPress={onClose} activeOpacity={0.82}>
                    <X size={18} color="#201A17" />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.navPlaceholder} />
                )}
              </View>
            </View>

            <View style={styles.pinIntro}>
              <View style={styles.pinIntroIcon}>
                {mode === 'unlock'
                  ? <Fingerprint size={20} color="#B91C2F" />
                  : <Lock size={20} color="#B91C2F" />}
              </View>

              <Text style={styles.stepLabel}>{copy.step}</Text>
              <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
              <Text style={styles.pinTitle} numberOfLines={2}>{copy.title}</Text>

              <View style={styles.pinDotsRow}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <View
                    key={index}
                    style={[styles.pinDot, index < pinValue.length && styles.pinDotFilled]}
                  />
                ))}
              </View>
            </View>

            <Animated.View
              style={[
                styles.pinPanel,
                {
                  opacity: keypadOpacity,
                  transform: [{ translateY: keypadTranslateY }],
                },
              ]}
            >
              <View style={styles.pinSheetHandle} />

              <Text
                style={error ? styles.pinSheetErrorText : styles.pinSheetHelperText}
                numberOfLines={2}
              >
                {feedbackCopy}
              </Text>

              <View style={styles.keypadWrap}>
                {KEYPAD_ROWS.map((row) => (
                  <View key={row.join('-')} style={styles.keypadRow}>
                    {row.map((digit) => (
                      <TouchableOpacity
                        key={digit}
                        style={[
                          styles.keypadButton,
                          {
                            width: keypadButtonSize,
                            height: keypadButtonSize,
                            borderRadius: keypadButtonSize / 2,
                          },
                        ]}
                        onPress={() => appendDigit(digit)}
                        activeOpacity={0.82}
                        disabled={loading}
                      >
                        <Text style={styles.keypadButtonText}>{digit}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}

                <View style={styles.keypadRow}>
                  {biometricAvailable && mode === 'unlock' ? (
                    <TouchableOpacity
                      style={[
                        styles.keypadUtilityButton,
                        {
                          width: keypadButtonSize,
                          height: keypadButtonSize,
                          borderRadius: keypadButtonSize / 2,
                        },
                      ]}
                      onPress={onUseBiometric}
                      activeOpacity={0.82}
                      disabled={loading}
                    >
                      <Fingerprint size={22} color="#B91C2F" />
                    </TouchableOpacity>
                  ) : (
                    <View style={{ width: keypadButtonSize, height: keypadButtonSize }} />
                  )}

                  <TouchableOpacity
                    style={[
                      styles.keypadButton,
                      {
                        width: keypadButtonSize,
                        height: keypadButtonSize,
                        borderRadius: keypadButtonSize / 2,
                      },
                    ]}
                    onPress={() => appendDigit('0')}
                    activeOpacity={0.82}
                    disabled={loading}
                  >
                    <Text style={styles.keypadButtonText}>0</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.keypadUtilityButton,
                      {
                        width: keypadButtonSize,
                        height: keypadButtonSize,
                        borderRadius: keypadButtonSize / 2,
                      },
                    ]}
                    onPress={removeDigit}
                    activeOpacity={0.82}
                    disabled={loading || pinValue.length === 0}
                  >
                    <Delete size={20} color={pinValue.length === 0 ? '#D0C4BE' : '#201A17'} />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  styles.fullscreenPrimaryButton,
                  pinValue.length < 6 && styles.primaryButtonDisabled,
                ]}
                onPress={onSubmitPin}
                disabled={pinValue.length < 6 || loading}
                activeOpacity={0.86}
              >
                {loading
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={styles.primaryButtonText}>{copy.action}</Text>}
              </TouchableOpacity>
            </Animated.View>
          </SafeAreaView>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  portalRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    elevation: 999,
  },
  root: {
    flex: 1,
    backgroundColor: '#FFF8F3',
  },
  sheet: {
    backgroundColor: '#FFF8F3',
    flex: 1,
    paddingTop: 10,
    paddingBottom: 24,
    gap: 14,
  },
  settingsHero: {
    borderRadius: 24,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: '#F8DFD8',
  },
  settingsHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateChip: {
    minHeight: 30,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateChipActive: { backgroundColor: '#E8F7EE' },
  stateChipIdle: { backgroundColor: '#F4ECE7' },
  stateChipText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  stateChipTextActive: { color: '#18794E' },
  stateChipTextIdle: { color: '#6B5B54' },
  sheetTitle: {
    fontSize: 27,
    lineHeight: 33,
    fontWeight: '800',
    color: '#1F1A17',
  },
  sheetBody: {
    fontSize: 14,
    lineHeight: 21,
    color: '#6B5B54',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    gap: 16,
    borderWidth: 1,
    borderColor: '#F3E7DE',
  },
  infoRow: {
    flexDirection: 'row',
    gap: 14,
  },
  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCopy: {
    flex: 1,
    gap: 4,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F1A17',
  },
  infoBody: {
    fontSize: 13,
    lineHeight: 19,
    color: '#75645E',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingCopy: {
    flex: 1,
    gap: 3,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F1A17',
  },
  settingBody: {
    fontSize: 12,
    lineHeight: 18,
    color: '#75645E',
  },
  footerHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 2,
  },
  footerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#8B6F67',
  },
  topBar: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  topBarSide: {
    width: 52,
    alignItems: 'flex-start',
  },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: '#201A17',
  },
  navButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFF1EA',
    borderWidth: 1,
    borderColor: '#F1DED4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navPlaceholder: {
    width: 42,
    height: 42,
  },
  stepLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    color: '#8B6F67',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B91C2F',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  leftAlignedEyebrow: {
    textAlign: 'left',
  },
  fullscreenRoot: {
    flex: 1,
    backgroundColor: '#FFF8F3',
  },
  pinIntro: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 12,
    gap: 5,
  },
  pinIntroIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#FFF1EA',
    borderWidth: 1,
    borderColor: '#F2DED3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  pinTitle: {
    marginTop: 4,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: '#1F1A17',
    textAlign: 'center',
    flexShrink: 1,
  },
  pinDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
  },
  pinDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E8DAD0',
  },
  pinDotFilled: {
    backgroundColor: '#B91C2F',
  },
  pinPanel: {
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E2D9',
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 14,
    gap: 10,
    alignItems: 'center',
  },
  pinSheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#E7D9CF',
    marginBottom: 2,
  },
  pinSheetHelperText: {
    minHeight: 32,
    textAlign: 'center',
    color: '#8B6F67',
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  pinSheetErrorText: {
    minHeight: 32,
    textAlign: 'center',
    color: '#B42318',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    paddingHorizontal: 12,
  },
  keypadWrap: {
    gap: KEYPAD_GAP,
    alignItems: 'center',
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: KEYPAD_GAP,
  },
  keypadButton: {
    backgroundColor: '#FFF7F2',
    borderWidth: 1,
    borderColor: '#F1E2D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadButtonText: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
    color: '#201A17',
  },
  keypadUtilityButton: {
    backgroundColor: '#FFF7F2',
    borderWidth: 1,
    borderColor: '#F1E2D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: '#B91C2F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenPrimaryButton: {
    width: '100%',
    marginTop: 2,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#F5ECE6',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#201A17',
  },
  textButton: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  textButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B91C2F',
  },
});
