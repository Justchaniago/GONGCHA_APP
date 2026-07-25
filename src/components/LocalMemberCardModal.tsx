import React from 'react';
import {
  buildLocalMemberCardShellViewModel,
  CardAnchor,
} from '../application/memberCardShell/MemberCardShellViewModel';
import { MemberCardShellView } from '../presentation/memberCardShell/MemberCardShellView';

export interface LocalMemberCardModalProps {
  visible: boolean;
  onClose: () => void;
  anchor?: CardAnchor | null;
  member?: any;
  loyaltySummary?: any;
}

export function LocalMemberCardModal({
  visible,
  onClose,
  anchor,
  member,
  loyaltySummary,
}: LocalMemberCardModalProps) {
  const viewModel = buildLocalMemberCardShellViewModel(
    visible,
    anchor ?? null,
    member,
    loyaltySummary
  );

  return <MemberCardShellView viewModel={viewModel} onClose={onClose} />;
}

export default LocalMemberCardModal;
