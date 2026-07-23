import type { PendingMemberSummary } from '../../member/MemberData';

export interface PendingMemberRepository {
  observe(
    uid: string,
    onSummary: (summary: PendingMemberSummary) => void,
  ): () => void;
}
