import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import { buildLocalMembershipStatusViewModel } from '../application/membershipStatus/MembershipStatusViewModel';
import { createLocalLoyaltySummaryController } from '../composition/loyaltySummary';
import { useMember } from '../context/MemberContext';
import type { LocalStackParamList } from '../navigation/LocalAppNavigator';
import MembershipStatusView from '../presentation/membershipStatus/MembershipStatusView';
import { useLocalLoyaltySummary } from '../presentation/loyaltySummary/useLocalLoyaltySummary';
import { colors } from '../theme/colorTokens';

export default function LocalMembershipStatusScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<LocalStackParamList>>();
  const { member } = useMember();
  const controller = useMemo(
    () => createLocalLoyaltySummaryController(),
    [],
  );
  const state = useLocalLoyaltySummary(controller, member?.uid ?? null);
  const model = useMemo(
    () =>
      state.phase === 'ready'
        ? buildLocalMembershipStatusViewModel(state.summary)
        : null,
    [state],
  );

  if (state.phase === 'idle' || state.phase === 'loading') {
    return (
      <View style={styles.stateRoot}>
        <StatusBar style="dark" />
        <ActivityIndicator color="#B91C2F" />
        <Text style={styles.stateText}>
          Memuat Membership dari backend...
        </Text>
      </View>
    );
  }

  if (state.phase === 'error' || !model) {
    return (
      <View style={styles.stateRoot}>
        <StatusBar style="dark" />
        <Text style={styles.errorTitle}>Membership gagal dimuat</Text>
        <Text style={styles.stateText}>
          Data tidak diganti nilai nol. Periksa local stack lalu coba lagi.
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => void controller.retry()}
        >
          <Text style={styles.retryText}>Coba Lagi</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <MembershipStatusView
      model={model}
      refreshing={state.refreshing}
      onRefresh={() => void controller.refresh()}
      onBack={() => navigation.goBack()}
      onActivityPress={() => navigation.navigate('LocalLoyaltyActivity')}
    />
  );
}

const styles = StyleSheet.create({
  stateRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.primary,
    paddingHorizontal: 28,
  },
  stateText: {
    color: colors.text.secondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 12,
  },
  errorTitle: {
    color: '#B91C1C',
    fontSize: 18,
    fontWeight: '800',
  },
  retryButton: {
    backgroundColor: '#B91C2F',
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 12,
    marginTop: 18,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  backText: {
    color: '#B91C2F',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 18,
  },
});
