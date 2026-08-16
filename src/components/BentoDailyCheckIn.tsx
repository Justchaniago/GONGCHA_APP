import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { Calendar } from 'lucide-react-native';
import { firebaseAuth } from '../config/firebase';
import { resolveAuthToken } from '../infrastructure/auth/resolveAuthToken';

const RED      = '#B91C2F';
const RED_L    = '#F9E8E9';
const DARK     = '#1D1D1D';
const NEUTRAL  = '#F5F5F5';
const MUTED    = '#7C6E68';
const BORDER   = '#EFECE7';
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.1.42:8000';

export default function BentoDailyCheckIn() {
  const { t } = useTranslation();
  const [streakCount, setStreakCount] = useState<number>(0);
  const [checkedInToday, setCheckedInToday] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchStatus = async () => {
    try {
      const user = firebaseAuth.currentUser;
      const token = await resolveAuthToken(user, 'test-subject');
      const res = await fetch(`${BACKEND_URL}/api/v1/loyalty/check-in/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStreakCount(data.streak_count);
      setCheckedInToday(data.checked_in_today);
    } catch (e) {
      console.error('Check-in status fetch failed', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleCheckIn = async () => {
    try {
      const user = firebaseAuth.currentUser;
      const token = await resolveAuthToken(user, 'test-subject');
      const res = await fetch(`${BACKEND_URL}/api/v1/loyalty/check-in`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Gagal check-in');
      
      setStreakCount(data.streak_count);
      setCheckedInToday(true);
      Alert.alert(data.reward_unlocked ? 'Selamat!' : 'Berhasil', data.message);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <View style={styles.iconBg}><Calendar size={14} color={RED} /></View>
          <Text style={styles.headerTitle}>Daily Check-In</Text>
        </View>
        <View style={styles.streakPill}><Text style={styles.streakText}>{streakCount}/7 Hari</Text></View>
      </View>
      <View style={styles.body}>
        <Text style={styles.subtitle}>Klaim <Text style={styles.boldText}>Topping Gratis</Text> setiap kelipatan 7 hari check-in berturut-turut.</Text>
      </View>
      <TouchableOpacity
        style={[styles.actionBtn, checkedInToday && styles.actionBtnDisabled]}
        onPress={handleCheckIn}
        disabled={checkedInToday}
      >
        <Text style={[styles.actionBtnText, checkedInToday && styles.actionBtnTextDisabled]}>
          {checkedInToday ? 'Sudah Check-In Hari Ini ✓' : 'Check-In Sekarang'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#FFFFFF', borderRadius: 22, padding: 16, borderWidth: 1, borderColor: BORDER, marginTop: 14, width: '100%' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  titleContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBg: { width: 24, height: 24, borderRadius: 8, backgroundColor: RED_L, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 12, fontWeight: '700', color: DARK },
  streakPill: { backgroundColor: RED_L, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  streakText: { fontSize: 10, fontWeight: '700', color: RED },
  body: { marginBottom: 14 },
  subtitle: { fontSize: 12, color: MUTED, lineHeight: 18 },
  boldText: { fontWeight: '700', color: DARK },
  actionBtn: { backgroundColor: RED, borderRadius: 14, paddingVertical: 11, alignItems: 'center' },
  actionBtnDisabled: { backgroundColor: NEUTRAL },
  actionBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  actionBtnTextDisabled: { color: MUTED },
});
