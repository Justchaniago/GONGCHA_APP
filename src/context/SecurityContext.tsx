import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, AppStateStatus, Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

import { useMember } from './MemberContext';
import SecurityModal, { SecurityModalMode } from '../components/SecurityModal';
import { DEFAULT_SECURITY_SETTINGS, SecuritySettings, SecurityStorage } from '../services/SecurityStorage';

type SensitiveAction = 'member_card' | 'redeem' | 'voucher' | 'app_unlock';

interface SecurityContextType {
  loading: boolean;
  pinEnabled: boolean;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  appLockEnabled: boolean;
  openSecuritySettings: () => void;
  ensureVerified: (action: SensitiveAction) => Promise<boolean>;
}

const SecurityContext = createContext<SecurityContextType>({
  loading: true,
  pinEnabled: false,
  biometricAvailable: false,
  biometricEnabled: false,
  appLockEnabled: true,
  openSecuritySettings: () => {},
  ensureVerified: async () => true,
});

function getActionCopy(action: SensitiveAction) {
  switch (action) {
    case 'member_card':
      return {
        title: 'Protect your member QR',
        description: 'A quick verification helps make sure your member QR is only opened by you.',
      };
    case 'redeem':
      return {
        title: 'Protect point redemption',
        description: 'Verification helps prevent available points from being redeemed without your approval.',
      };
    case 'voucher':
      return {
        title: 'Protect voucher usage',
        description: 'Voucher QR should only be shown after you verify it is really you.',
      };
    case 'app_unlock':
    default:
      return {
        title: 'Unlock your member app',
        description: 'After the app has been idle for a few minutes, it will ask for your PIN or biometrics again.',
      };
  }
}

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { member, isAuthenticated } = useMember();
  const securityScope = member?.uid ?? 'guest';
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SecuritySettings>(DEFAULT_SECURITY_SETTINGS);
  const [hasPin, setHasPin] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<SecurityModalMode>('settings');
  const [pinInput, setPinInput] = useState('');
  const [pinDraft, setPinDraft] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [currentAction, setCurrentAction] = useState<SensitiveAction>('app_unlock');

  const lastBackgroundAtRef = useRef<number | null>(null);
  const pendingResolverRef = useRef<((result: boolean) => void) | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const initialLockCheckedRef = useRef(false);

  const pinEnabled = hasPin;

  const completePending = useCallback((result: boolean) => {
    if (pendingResolverRef.current) {
      pendingResolverRef.current(result);
      pendingResolverRef.current = null;
    }
  }, []);

  const markSessionUnlocked = useCallback(async () => {
    await SecurityStorage.setLastUnlockAt(securityScope, Date.now());
  }, [securityScope]);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setPinInput('');
    setPinError(null);
    setSubmitLoading(false);
  }, []);

  const refreshBiometricAvailability = useCallback(async () => {
    try {
      const [hasHardware, isEnrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      setBiometricAvailable(hasHardware && isEnrolled);
    } catch {
      setBiometricAvailable(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapSecurity() {
      try {
        const [storedSettings, storedHasPin] = await Promise.all([
          SecurityStorage.loadSettings(securityScope),
          SecurityStorage.hasPin(securityScope),
          refreshBiometricAvailability(),
        ]);

        if (!isMounted) {
          return;
        }

        setSettings(storedSettings);
        setHasPin(storedHasPin);

        if (
          isAuthenticated &&
          storedHasPin &&
          storedSettings.appLockEnabled &&
          !initialLockCheckedRef.current
        ) {
          initialLockCheckedRef.current = true;
          setCurrentAction('app_unlock');
          setModalMode('unlock');
          setPinInput('');
          setPinError(null);
          setModalVisible(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    bootstrapSecurity();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, refreshBiometricAvailability, securityScope]);

  useEffect(() => {
    if (!isAuthenticated) {
      closeModal();
      completePending(false);
      setSettings(DEFAULT_SECURITY_SETTINGS);
      setHasPin(false);
      initialLockCheckedRef.current = false;
      return;
    }

    const subscription = AppState.addEventListener('change', async (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      if (nextState === 'background' || nextState === 'inactive') {
        lastBackgroundAtRef.current = Date.now();
        return;
      }

      if (nextState === 'active' && (previousState === 'background' || previousState === 'inactive')) {
        if (!pinEnabled || !settings.appLockEnabled) {
          return;
        }

        const backgroundAt = lastBackgroundAtRef.current ?? 0;
        const elapsed = Date.now() - backgroundAt;
        const lastUnlockAt = await SecurityStorage.getLastUnlockAt(securityScope);
        const sessionFresh = lastUnlockAt > 0 && Date.now() - lastUnlockAt < settings.gracePeriodMs;

        if (elapsed >= settings.gracePeriodMs && !sessionFresh) {
          setCurrentAction('app_unlock');
          setModalMode('unlock');
          setPinInput('');
          setPinError(null);
          setModalVisible(true);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [closeModal, completePending, isAuthenticated, pinEnabled, securityScope, settings.appLockEnabled, settings.gracePeriodMs]);

  const attemptBiometric = useCallback(async () => {
    if (!biometricAvailable || !settings.biometricEnabled) {
      return false;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Verify to continue',
      cancelLabel: 'Use PIN',
      fallbackLabel: 'Use PIN',
      disableDeviceFallback: false,
    });

    if (result.success) {
      await markSessionUnlocked();
      closeModal();
      completePending(true);
      return true;
    }

    return false;
  }, [biometricAvailable, closeModal, completePending, markSessionUnlocked, settings.biometricEnabled]);

  const ensureVerified = useCallback(
    async (action: SensitiveAction) => {
      if (!pinEnabled) {
        return true;
      }

      const lastUnlockAt = await SecurityStorage.getLastUnlockAt(securityScope);
      if (lastUnlockAt > 0 && Date.now() - lastUnlockAt < settings.gracePeriodMs) {
        return true;
      }

      setCurrentAction(action);

      if (settings.biometricEnabled && biometricAvailable) {
        const biometricSuccess = await attemptBiometric();
        if (biometricSuccess) {
          return true;
        }
      }

      setPinInput('');
      setPinError(null);
      setModalMode('unlock');
      setModalVisible(true);

      return new Promise<boolean>((resolve) => {
        pendingResolverRef.current = resolve;
      });
    },
    [attemptBiometric, biometricAvailable, pinEnabled, securityScope, settings.biometricEnabled, settings.gracePeriodMs]
  );

  const persistSettings = useCallback(async (nextSettings: SecuritySettings) => {
    setSettings(nextSettings);
    await SecurityStorage.saveSettings(securityScope, nextSettings);
  }, [securityScope]);

  const openSecuritySettings = useCallback(() => {
    if (!member?.uid) {
      Alert.alert('Please wait', 'Your member profile is still loading. Try again in a moment.');
      return;
    }
    setCurrentAction('member_card');
    setPinInput('');
    setPinError(null);
    setModalMode('settings');
    setModalVisible(true);
  }, [member?.uid]);

  const handleBack = useCallback(() => {
    setPinInput('');
    setPinError(null);

    if (modalMode === 'confirm') {
      setModalMode('setup');
      return;
    }

    if (modalMode === 'changeNew') {
      setModalMode('changeCurrent');
      return;
    }

    if (modalMode === 'changeCurrent' || modalMode === 'disable' || modalMode === 'setup') {
      setModalMode('settings');
      return;
    }
  }, [modalMode]);

  const handleClose = useCallback(() => {
    if (modalMode === 'unlock' && currentAction === 'app_unlock') {
      return;
    }

    closeModal();
    completePending(false);
  }, [closeModal, completePending, currentAction, modalMode]);

  const handleSubmitPin = useCallback(async () => {
    if (!member?.uid) {
      setPinError('Your member profile is still loading. Please try again.');
      return;
    }

    if (pinInput.length < 6) {
      setPinError('Your PIN must be 6 digits.');
      return;
    }

    setSubmitLoading(true);
    setPinError(null);

    try {
      if (modalMode === 'setup') {
        setPinDraft(pinInput);
        setPinInput('');
        setModalMode('confirm');
        return;
      }

      if (modalMode === 'confirm') {
        if (pinInput !== pinDraft) {
          setPinError('The confirmation PIN does not match. Please try again.');
          return;
        }

        await SecurityStorage.setPin(securityScope, pinInput);
        const savedHasPin = await SecurityStorage.hasPin(securityScope);
        const savedPinIsVerifiable = await SecurityStorage.verifyPin(securityScope, pinInput);
        if (!savedHasPin || !savedPinIsVerifiable) {
          setPinError('We could not save your PIN on this device. Please try again.');
          return;
        }
        const nextSettings = {
          ...settings,
          pinEnabled: true,
          biometricEnabled: biometricAvailable ? settings.biometricEnabled : false,
        };
        await persistSettings(nextSettings);
        setHasPin(savedHasPin);
        await markSessionUnlocked();
        setPinDraft('');
        setPinInput('');
        setPinError(null);
        setCurrentAction('member_card');
        setModalMode('settings');
        setModalVisible(true);
        Alert.alert(
          'PIN enabled',
          biometricAvailable
            ? 'Your Security PIN is now active on this device. You can enable biometric unlock from the Security screen.'
            : 'Your Security PIN is now active on this device.',
        );
        return;
      }

      if (modalMode === 'changeCurrent') {
        const isValidCurrentPin = await SecurityStorage.verifyPin(securityScope, pinInput);
        if (!isValidCurrentPin) {
          setPinError('Your current PIN does not match.');
          return;
        }
        setPinDraft(pinInput);
        setPinInput('');
        setModalMode('changeNew');
        return;
      }

      if (modalMode === 'changeNew') {
        await SecurityStorage.setPin(securityScope, pinInput);
        const savedHasPin = await SecurityStorage.hasPin(securityScope);
        const savedPinIsVerifiable = await SecurityStorage.verifyPin(securityScope, pinInput);
        if (!savedHasPin || !savedPinIsVerifiable) {
          setPinError('We could not save your new PIN on this device. Please try again.');
          return;
        }
        await markSessionUnlocked();
        setHasPin(savedHasPin);
        setPinDraft('');
        setPinInput('');
        setPinError(null);
        setCurrentAction('member_card');
        setModalMode('settings');
        setModalVisible(true);
        Alert.alert('PIN updated', 'Your security PIN has been updated.');
        return;
      }

      if (modalMode === 'disable') {
        const isValidCurrentPin = await SecurityStorage.verifyPin(securityScope, pinInput);
        if (!isValidCurrentPin) {
          setPinError('The PIN you entered does not match.');
          return;
        }

        await SecurityStorage.clearPin(securityScope);
        const nextSettings = {
          ...settings,
          pinEnabled: false,
          biometricEnabled: false,
        };
        await persistSettings(nextSettings);
        setHasPin(false);
        setPinDraft('');
        setPinInput('');
        setPinError(null);
        setCurrentAction('member_card');
        setModalMode('settings');
        setModalVisible(true);
        Alert.alert('PIN disabled', 'PIN protection has been turned off on this device.');
        return;
      }

      const isValid = await SecurityStorage.verifyPin(securityScope, pinInput);
      if (!isValid) {
        setPinError('Incorrect PIN. Please try again.');
        return;
      }

      await markSessionUnlocked();
      closeModal();
      completePending(true);
    } catch {
      setPinError('We could not update your PIN right now. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  }, [
    member?.uid,
    biometricAvailable,
    closeModal,
    completePending,
    markSessionUnlocked,
    modalMode,
    persistSettings,
    pinDraft,
    pinInput,
    securityScope,
    settings,
  ]);

  const handleUseBiometric = useCallback(async () => {
    const success = await attemptBiometric();
    if (!success) {
      setPinError('Biometric verification did not go through. You can still continue with your PIN.');
    }
  }, [attemptBiometric]);

  const handleToggleBiometric = useCallback(
    async (value: boolean) => {
      if (value && !biometricAvailable) {
        Alert.alert('Biometric unavailable', 'This device does not have biometric unlock ready yet.');
        return;
      }

      const nextSettings = {
        ...settings,
        biometricEnabled: value,
      };
      await persistSettings(nextSettings);
    },
    [biometricAvailable, persistSettings, settings]
  );

  const handleToggleAppLock = useCallback(
    async (value: boolean) => {
      const nextSettings = {
        ...settings,
        appLockEnabled: value,
      };
      await persistSettings(nextSettings);
    },
    [persistSettings, settings]
  );

  const settingsCopy = useMemo(
    () => ({
      title: 'Protect vouchers and points',
      description: 'Turn on a PIN to protect redemptions, voucher access, your member card, and app unlock on this device.',
    }),
    []
  );

  return (
    <SecurityContext.Provider
      value={{
        loading,
        pinEnabled,
        biometricAvailable,
        biometricEnabled: settings.biometricEnabled && biometricAvailable,
        appLockEnabled: settings.appLockEnabled,
        openSecuritySettings,
        ensureVerified,
      }}
    >
      {children}
      <SecurityModal
        visible={modalVisible}
        mode={modalMode}
        pinValue={pinInput}
        loading={submitLoading}
        error={pinError}
        settingsTitle={settingsCopy.title}
        settingsDescription={settingsCopy.description}
        pinEnabled={pinEnabled}
        biometricEnabled={settings.biometricEnabled && biometricAvailable}
        biometricAvailable={biometricAvailable}
        appLockEnabled={settings.appLockEnabled}
        canDismiss={modalMode !== 'unlock' || currentAction !== 'app_unlock'}
        canGoBack={modalMode === 'confirm' || modalMode === 'changeNew' || modalMode === 'changeCurrent' || modalMode === 'disable' || modalMode === 'setup'}
        onClose={handleClose}
        onBack={handleBack}
        onPinChange={setPinInput}
        onSubmitPin={handleSubmitPin}
        onUseBiometric={handleUseBiometric}
        onBeginSetup={() => {
          setPinInput('');
          setPinError(null);
          setPinDraft('');
          setModalMode('setup');
        }}
        onBeginChangePin={() => {
          setPinInput('');
          setPinError(null);
          setModalMode('changeCurrent');
        }}
        onBeginDisablePin={() => {
          setPinInput('');
          setPinError(null);
          setModalMode('disable');
        }}
        onToggleBiometric={handleToggleBiometric}
        onToggleAppLock={handleToggleAppLock}
      />
    </SecurityContext.Provider>
  );
};

export function useSecurity() {
  return useContext(SecurityContext);
}
