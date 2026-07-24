import React, { useCallback, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { buildLegacyMembershipStatusViewModel } from '../application/membershipStatus/MembershipStatusViewModel';
import { useMember } from '../context/MemberContext';
import type { RootStackParamList } from '../navigation/AppNavigator';
import MembershipStatusView from '../presentation/membershipStatus/MembershipStatusView';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function MembershipStatusScreen() {
  const navigation = useNavigation<Nav>();
  const { member } = useMember();
  const [refreshing, setRefreshing] = useState(false);
  const model = useMemo(
    () => buildLegacyMembershipStatusViewModel(member),
    [member, refreshing],
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  return (
    <MembershipStatusView
      model={model}
      refreshing={refreshing}
      onRefresh={handleRefresh}
      onBack={() => navigation.goBack()}
    />
  );
}
