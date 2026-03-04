import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Keyboard,
  Platform,
} from 'react-native';
import { X } from 'lucide-react-native';

interface BioDataModalProps {
  visible: boolean;
  onSubmit: (data: { name: string; dateOfBirth: string }) => Promise<void>;
  onSkip: () => void;
  initialName?: string;
}

export default function BioDataModal({
  visible,
  onSubmit,
  onSkip,
  initialName = '',
}: BioDataModalProps) {
  const [name, setName] = useState(initialName);
  const [dob, setDob] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDobChange = (text: string) => {
    const d = text.replace(/\D/g, '').slice(0, 8);
    if (d.length <= 2) {
      setDob(d);
      return;
    }
    if (d.length <= 4) {
      setDob(`${d.slice(0, 2)}/${d.slice(2)}`);
      return;
    }
    setDob(`${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Nama diperlukan', 'Masukkan nama lengkap kamu.');
      return;
    }
    if (!dob.trim()) {
      Alert.alert('Tanggal lahir diperlukan', 'Masukkan tanggal lahir kamu (DD/MM/YYYY).');
      return;
    }
    if (dob.replace(/\D/g, '').length !== 8) {
      Alert.alert('Format tanggal tidak valid', 'Gunakan format DD/MM/YYYY.');
      return;
    }

    try {
      setIsSubmitting(true);
      Keyboard.dismiss();
      await onSubmit({ name: name.trim(), dateOfBirth: dob });
    } catch (error: any) {
      Alert.alert('Gagal', String(error?.message || 'Coba lagi nanti.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    Keyboard.dismiss();
    onSkip();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ width: 40 }} />
          <Text style={styles.headerTitle}>Lengkapi Biodata</Text>
          <TouchableOpacity
            onPress={handleSkip}
            style={styles.closeButton}
          >
            <X size={24} color="#1A1A1A" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subtitle}>
            Kami perlu beberapa informasi untuk melengkapi profilmu
          </Text>

          {/* Full Name Field */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Nama Lengkap</Text>
            <View style={styles.textInputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Masukkan nama lengkap"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
                editable={!isSubmitting}
              />
            </View>
          </View>

          {/* Date of Birth Field */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Tanggal Lahir</Text>
            <View style={styles.textInputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="DD/MM/YYYY"
                placeholderTextColor="#9CA3AF"
                value={dob}
                onChangeText={handleDobChange}
                keyboardType="number-pad"
                maxLength={10}
                editable={!isSubmitting}
              />
            </View>
          </View>

          {/* Info Text */}
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              💡 Informasi ini akan membantu kami memberikan pengalaman yang lebih personal.
            </Text>
          </View>
        </ScrollView>

        {/* Actions */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.skipButton, isSubmitting && { backgroundColor: '#F3F4F6' }]}
            onPress={handleSkip}
            disabled={isSubmitting}
          >
            <Text style={[styles.skipButtonText, isSubmitting && { color: '#9CA3AF' }]}>
              Nanti Saja
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && { backgroundColor: '#E5E7EB' }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={[styles.submitButtonText, isSubmitting && { color: '#9CA3AF' }]}>
              {isSubmitting ? 'Menyimpan...' : 'Simpan'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEFDFB',
    paddingTop: Platform.OS === 'ios' ? 12 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  closeButton: {
    width: 40,
    alignItems: 'center',
    padding: 8,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 32,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 32,
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
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
    paddingHorizontal: 14,
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
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  skipButton: {
    flex: 1,
    height: 50,
    backgroundColor: '#FFF',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#B91C2F',
  },
  skipButtonText: {
    color: '#B91C2F',
    fontWeight: '600',
    fontSize: 16,
  },
  submitButton: {
    flex: 1,
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
