import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Keyboard,
  Platform,
  SafeAreaView,
  TouchableWithoutFeedback,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { doc, setDoc } from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../config/firebase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type RootStackParamList = {
  ProfileCompletion: undefined;
  MainApp: undefined;
};

type ProfileCompletionScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ProfileCompletion'>;

export default function ProfileCompletionScreen() {
  const navigation = useNavigation<ProfileCompletionScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate inputs
  const isFormValid = useMemo(() => {
    const isNameValid = fullName.trim().length > 0;
    const isDobValid = dateOfBirth.replace(/\D/g, '').length === 8;
    return isNameValid && isDobValid;
  }, [fullName, dateOfBirth]);

  const handleDobChange = (text: string) => {
    const d = text.replace(/\D/g, '').slice(0, 8);
    if (d.length <= 2) {
      setDateOfBirth(d);
      return;
    }
    if (d.length <= 4) {
      setDateOfBirth(`${d.slice(0, 2)}/${d.slice(2)}`);
      return;
    }
    setDateOfBirth(`${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`);
  };

  const handleCompleteProfile = async () => {
    if (!isFormValid) return; // Prevent action if invalid

    const user = firebaseAuth.currentUser;
    if (!user) {
      Alert.alert('Error', 'User tidak ditemukan. Silakan login ulang.');
      return;
    }

    try {
      setIsSubmitting(true);
      Keyboard.dismiss();

      // Update user profile di Firestore
      await setDoc(
        doc(firestoreDb, 'users', user.uid),
        {
          name: fullName.trim(),
          dateOfBirth: dateOfBirth,
          profileComplete: true, 
        },
        { merge: true }
      );

      // FORCE REFRESH: Reload user to ensure token and claims are updated immediately
      // This helps trigger any listeners listening to token changes
      await user.getIdToken(true);
      
      // UX: Keep loading state active indefinitely upon success
      // The AppNavigator will unmount this screen once it sees member.profileComplete = true
      // So the user just sees "Menyimpan..." until the Home Screen appears.
      
    } catch (error: any) {
      Alert.alert('Gagal', String(error?.message || 'Coba lagi nanti.'));
      setIsSubmitting(false); // Only stop loading on error
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled" 
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerSection}>
            <Text style={styles.emoji}>👤</Text>
            <Text style={styles.title}>Lengkapi Profil Kamu</Text>
            <Text style={styles.subtitle}>
              Kami perlu beberapa informasi untuk menyelesaikan setup akun kamu
            </Text>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            {/* Full Name Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Nama Lengkap</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Masukkan nama lengkap"
                placeholderTextColor="#9CA3AF"
                value={fullName}
                onChangeText={setFullName}
                editable={!isSubmitting}
              />
            </View>

            {/* Date of Birth Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Tanggal Lahir</Text>
              <TextInput
                style={styles.textInput}
                placeholder="DD/MM/YYYY"
                placeholderTextColor="#9CA3AF"
                value={dateOfBirth}
                onChangeText={handleDobChange}
                keyboardType="number-pad"
                maxLength={10}
                editable={!isSubmitting}
              />
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                💡 Informasi ini membantu kami memberikan pengalaman yang lebih personal dan sesuai dengan kebutuhan kamu.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Action Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.submitButton, 
              (!isFormValid || isSubmitting) && { backgroundColor: '#E5E7EB' }
            ]}
            onPress={handleCompleteProfile}
            disabled={!isFormValid || isSubmitting}
          >
            <Text style={[
              styles.submitButtonText, 
              (!isFormValid || isSubmitting) && { color: '#9CA3AF' }
            ]}>
              {isSubmitting ? 'Menyimpan...' : 'Lanjut ke Dashboard'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFDFB',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  emoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  formSection: {
    marginBottom: 40,
  },
  fieldGroup: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  textInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 54,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 16,
    color: '#1A1A1A',
  },
  infoBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  infoText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  submitButton: {
    height: 50,
    backgroundColor: '#B91C2F',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
});
