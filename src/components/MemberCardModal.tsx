import React from 'react';
import { useMember } from '../context/MemberContext';
import { buildLegacyMemberCardShellViewModel } from '../application/memberCardShell/MemberCardShellViewModel';
import { MemberCardShellView } from '../presentation/memberCardShell/MemberCardShellView';

export default function MemberCardModal() {
  const { isCardVisible, hideCard, anchor, member } = useMember();

  const viewModel = buildLegacyMemberCardShellViewModel(isCardVisible, anchor, member);

  return <MemberCardShellView viewModel={viewModel} onClose={hideCard} />;
}
