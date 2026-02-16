import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MockBackend } from '../services/MockBackend';
import { UserProfile } from '../types/types';

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    (async () => {
      const user = await MockBackend.getUser();
      setProfile(user);
    })();
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      await MockBackend.updateUserProfile(profile);
      Alert.alert('Success', 'Profile updated!');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return <View style={styles.center}><Text>Loading...</Text></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Edit Profile</Text>
      <TextInput
        style={styles.input}
        value={profile.name}
        onChangeText={name => setProfile({ ...profile, name })}
        placeholder="Name"
      />
      <TextInput
        style={styles.input}
        value={profile.phoneNumber}
        onChangeText={phoneNumber => setProfile({ ...profile, phoneNumber })}
        placeholder="Phone Number"
        keyboardType="phone-pad"
      />
      <TextInput
        style={styles.input}
        value={profile.email || ''}
        onChangeText={email => setProfile({ ...profile, email })}
        placeholder="Email"
        keyboardType="email-address"
      />
      <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Save'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#FFF8F0' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, color: '#2A1F1F' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16, backgroundColor: '#FFF' },
  button: { backgroundColor: '#B91C2F', padding: 16, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
