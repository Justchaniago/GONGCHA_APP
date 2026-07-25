import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { Calendar, Check, Gift, Sparkles } from 'lucide-react-native';

export default function BentoDailyCheckIn() {
  const [checkedDays, setCheckedDays] = useState<boolean[]>([true, true, true, false, false, false, false]);
  const [todayChecked, setTodayChecked] = useState<boolean>(false);

  const handleCheckIn = () => {
    if (todayChecked) return;

    // Simulate checking in for Day 4 (index 3)
    const updated = [...checkedDays];
    updated[3] = true;
    setCheckedDays(updated);
    setTodayChecked(true);

    Alert.alert(
      'Check-in Berhasil! 🎉',
      'Kamu telah menyelesaikan check-in hari ke-4. Kumpulkan 3 hari lagi untuk topping gratis!',
      [{ text: 'Keren!' }]
    );
  };

  const currentStreak = checkedDays.filter(Boolean).length;

  return (
    <View style={styles.container}>
      {/* HEADER SECTION */}
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <View style={styles.iconBg}>
            <Calendar size={14} color="#B91C2F" />
          </View>
          <Text style={styles.headerTitle}>Daily Check-In</Text>
        </View>
        <View style={styles.streakPill}>
          <Sparkles size={10} color="#D4A853" fill="#D4A853" />
          <Text style={styles.streakText}>{currentStreak}/7 Hari</Text>
        </View>
      </View>

      {/* CORE BODY */}
      <View style={styles.body}>
        <Text style={styles.subtitle}>
          Klaim <Text style={styles.boldText}>Topping Gratis 🧋</Text> setiap kelipatan 7 hari check-in berturut-turut!
        </Text>

        {/* PROGRESS TRACKER bubbles */}
        <View style={styles.bubblesRow}>
          {checkedDays.map((checked, index) => {
            const isLastDay = index === 6;
            
            return (
              <View key={index} style={styles.dayColumn}>
                <View 
                  style={[
                    styles.bubble,
                    checked && styles.bubbleChecked,
                    isLastDay && styles.bubbleGift,
                    isLastDay && checked && styles.bubbleGiftClaimed,
                  ]}
                >
                  {checked ? (
                    <Check size={12} color="#FFFFFF" strokeWidth={3} />
                  ) : isLastDay ? (
                    <Gift size={14} color="#D4A853" strokeWidth={2.5} />
                  ) : (
                    <Text style={styles.bubbleDayNum}>{index + 1}</Text>
                  )}
                </View>
                <Text style={styles.dayLabel}>H{index + 1}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* BOTTOM ACTION BUTTON */}
      <TouchableOpacity
        style={[styles.actionBtn, todayChecked && styles.actionBtnDisabled]}
        activeOpacity={0.85}
        onPress={handleCheckIn}
        disabled={todayChecked}
      >
        <Text style={[styles.actionBtnText, todayChecked && styles.actionBtnTextDisabled]}>
          {todayChecked ? 'Sudah Check-In Hari Ini ✓' : 'Check-In Sekarang ⚡'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0E8E2',
    shadowColor: '#2A1F1F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    marginTop: 14,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBg: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: 'rgba(185, 28, 47, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2A1F1F',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  streakText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  body: {
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 12,
    color: '#7C6E68',
    lineHeight: 18,
    marginBottom: 14,
  },
  boldText: {
    fontWeight: '700',
    color: '#B91C2F',
  },
  bubblesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  dayColumn: {
    alignItems: 'center',
    gap: 4,
  },
  bubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FAF8F5',
    borderWidth: 1.5,
    borderColor: '#EFECE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubbleChecked: {
    backgroundColor: '#166534',
    borderColor: '#166534',
  },
  bubbleGift: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
  },
  bubbleGiftClaimed: {
    backgroundColor: '#D4A853',
    borderColor: '#D4A853',
  },
  bubbleDayNum: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A08F88',
  },
  dayLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#A08F88',
  },
  actionBtn: {
    backgroundColor: '#B91C2F',
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B91C2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  actionBtnDisabled: {
    backgroundColor: '#F3EFEA',
    shadowOpacity: 0,
    elevation: 0,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  actionBtnTextDisabled: {
    color: '#A08F88',
  },
});
