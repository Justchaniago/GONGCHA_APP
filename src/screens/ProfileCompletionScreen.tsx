import React, { useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Keyboard,
  SafeAreaView,
  TouchableWithoutFeedback,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, Calendar, ArrowRight, ChevronLeft } from 'lucide-react-native';
import { profileCommands } from '../composition/profile';
import {
  isValidDateOfBirth,
  isValidProfileName,
  PROFILE_NAME_MAX_LENGTH,
} from '../application/profile/profileValidation';
import { colors } from '../theme/colorTokens';

type RootStackParamList = {
  ProfileCompletion: undefined;
  MainApp: undefined;
};

type ProfileCompletionScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ProfileCompletion'>;

export default function ProfileCompletionScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<ProfileCompletionScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  
  const [fullName, setFullName] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<'name' | 'day' | 'month' | 'year' | null>(null);

  const monthInputRef = useRef<TextInput>(null);
  const yearInputRef = useRef<TextInput>(null);

  // Combine into DD/MM/YYYY
  const dateOfBirth = useMemo(() => {
    if (!day || !month || !year) return '';
    const paddedDay = day.padStart(2, '0');
    const paddedMonth = month.padStart(2, '0');
    return `${paddedDay}/${paddedMonth}/${year}`;
  }, [day, month, year]);

  // Validate inputs
  const isFormValid = useMemo(() => {
    return (
      isValidProfileName(fullName) &&
      isValidDateOfBirth(dateOfBirth)
    );
  }, [fullName, dateOfBirth]);

  const showDobError = useMemo(() => {
    const isComplete = day.length === 2 && month.length === 2 && year.length === 4;
    return isComplete && !isValidDateOfBirth(dateOfBirth);
  }, [day, month, year, dateOfBirth]);

  const handleDayChange = (text: string) => {
    const clean = text.replace(/\D/g, '').slice(0, 2);
    setDay(clean);
    if (clean.length === 2) {
      monthInputRef.current?.focus();
    }
  };

  const handleMonthChange = (text: string) => {
    const clean = text.replace(/\D/g, '').slice(0, 2);
    setMonth(clean);
    if (clean.length === 2) {
      yearInputRef.current?.focus();
    }
  };

  const handleYearChange = (text: string) => {
    const clean = text.replace(/\D/g, '').slice(0, 4);
    setYear(clean);
  };

  const handleCompleteProfile = async () => {
    if (!isFormValid) return;

    if (!profileCommands.hasCurrentIdentity()) {
      Alert.alert('Error', 'User tidak ditemukan. Silakan login ulang.');
      return;
    }

    try {
      setIsSubmitting(true);
      Keyboard.dismiss();
      await profileCommands.completeCurrent(fullName, dateOfBirth);
    } catch (error: any) {
      Alert.alert('Gagal', String(error?.message || 'Coba lagi nanti.'));
      setIsSubmitting(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.brand.primary} />
        
        {/* FIXED HEADER (Matching HTML shadow & blur effect) */}
        <View style={[styles.headerBar, { height: 56 + insets.top, paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile Completion</Text>
          <View style={{ width: 44 }} />
        </View>

        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* INTRO BLOCK */}
            <View style={styles.introBlock}>
              <Text style={styles.mainTitle}>Lengkapi Profil</Text>
              <Text style={styles.subtitle}>
                Sedikit lagi untuk menikmati semua keuntungan member.
              </Text>
            </View>

            {/* FORM FIELDS CONTAINER */}
            <View style={styles.formContainer}>
              
              {/* Full Name Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>NAMA LENGKAP</Text>
                <View 
                  style={[
                    styles.glassInputWrapper,
                    focusedField === 'name' && styles.glassInputWrapperActive
                  ]}
                >
                  <User size={20} color="rgba(255, 255, 255, 0.7)" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder={t('profileCompletion.namePlaceholder')}
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={fullName}
                    onChangeText={setFullName}
                    maxLength={PROFILE_NAME_MAX_LENGTH}
                    editable={!isSubmitting}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>

              {/* Date of Birth Field (Splits into 3 glass input fields DD MM YYYY) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>TANGGAL LAHIR</Text>
                <View style={styles.dateInputRow}>
                  
                  {/* Day (DD) */}
                  <View 
                    style={[
                      styles.glassDateInputWrapper,
                      focusedField === 'day' && styles.glassInputWrapperActive,
                      showDobError && styles.glassInputWrapperError
                    ]}
                  >
                    <TextInput
                      style={styles.dateTextInput}
                      placeholder={t('profileCompletion.dayPlaceholder')}
                      placeholderTextColor="rgba(255, 255, 255, 0.4)"
                      value={day}
                      onChangeText={handleDayChange}
                      keyboardType="numeric"
                      maxLength={2}
                      editable={!isSubmitting}
                      onFocus={() => setFocusedField('day')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>

                  {/* Month (MM) */}
                  <View 
                    style={[
                      styles.glassDateInputWrapper,
                      focusedField === 'month' && styles.glassInputWrapperActive,
                      showDobError && styles.glassInputWrapperError
                    ]}
                  >
                    <TextInput
                      ref={monthInputRef}
                      style={styles.dateTextInput}
                      placeholder={t('profileCompletion.monthPlaceholder')}
                      placeholderTextColor="rgba(255, 255, 255, 0.4)"
                      value={month}
                      onChangeText={handleMonthChange}
                      keyboardType="numeric"
                      maxLength={2}
                      editable={!isSubmitting}
                      onFocus={() => setFocusedField('month')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>

                  {/* Year (YYYY) */}
                  <View 
                    style={[
                      styles.glassDateInputWrapperLarge,
                      focusedField === 'year' && styles.glassInputWrapperActive,
                      showDobError && styles.glassInputWrapperError
                    ]}
                  >
                    <TextInput
                      ref={yearInputRef}
                      style={styles.dateTextInput}
                      placeholder={t('profileCompletion.yearPlaceholder')}
                      placeholderTextColor="rgba(255, 255, 255, 0.4)"
                      value={year}
                      onChangeText={handleYearChange}
                      keyboardType="numeric"
                      maxLength={4}
                      editable={!isSubmitting}
                      onFocus={() => setFocusedField('year')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>

                </View>

                {showDobError && (
                  <Text style={styles.errorText}>
                    * Format tanggal lahir tidak valid.
                  </Text>
                )}
              </View>

            </View>

            {/* CONFIRM ACTION BUTTON */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  (!isFormValid || isSubmitting) && styles.confirmButtonDisabled
                ]}
                onPress={handleCompleteProfile}
                disabled={!isFormValid || isSubmitting}
                activeOpacity={0.9}
              >
                <Text style={styles.confirmButtonText}>
                  {isSubmitting ? t('profileCompletion.saving') : t('profileCompletion.confirm')}
                </Text>
                {!isSubmitting && <ArrowRight size={20} color={colors.brand.primary} />}
              </TouchableOpacity>
            </View>

          </ScrollView>
        </SafeAreaView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.brand.primary, // #B91C2F
  },
  safeArea: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(185, 28, 47, 0.95)',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  introBlock: {
    marginBottom: 32,
  },
  mainTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
  },
  formContainer: {
    gap: 20,
    flex: 1,
    justifyContent: 'center',
    marginBottom: 40,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 1,
    marginLeft: 4,
  },
  glassInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  glassInputWrapperActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  glassInputWrapperError: {
    borderColor: '#EF4444',
  },
  inputIcon: {
    marginRight: 4,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    paddingHorizontal: 12,
  },
  dateInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  glassDateInputWrapper: {
    flex: 1,
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassDateInputWrapperLarge: {
    flex: 1.5,
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateTextInput: {
    width: '100%',
    textAlign: 'center',
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  errorText: {
    color: '#FFA7AE',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    paddingLeft: 4,
  },
  buttonContainer: {
    marginTop: 'auto',
  },
  confirmButton: {
    flexDirection: 'row',
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: colors.brand.primary,
    fontWeight: '600',
    fontSize: 16,
  },
});
