import React from 'react';
import { useTranslation } from 'react-i18next';
import { useMember } from '../context/MemberContext';
import {
  buildLegacyMemberCardShellViewModel,
  buildLocalMemberCardShellViewModel,
} from '../application/memberCardShell/MemberCardShellViewModel';
import { MemberCardShellView } from '../presentation/memberCardShell/MemberCardShellView';
import { USE_FASTAPI_BACKEND } from '../config/flags';
import { localLoyaltySummaryController } from '../composition/loyaltySummary';
import { useLocalLoyaltySummary } from '../presentation/loyaltySummary/useLocalLoyaltySummary';

export default function MemberCardModal() {
  const { t } = useTranslation();
  const { isCardVisible, hideCard, anchor, member } = useMember();

  const { summary } = useLocalLoyaltySummary(localLoyaltySummaryController, member?.uid ?? null);

  const viewModel = USE_FASTAPI_BACKEND
    ? buildLocalMemberCardShellViewModel(isCardVisible, anchor, member, summary)
    : buildLegacyMemberCardShellViewModel(isCardVisible, anchor, member);

  return <MemberCardShellView viewModel={viewModel} onClose={hideCard} />;
}
