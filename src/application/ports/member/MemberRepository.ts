import type { LegacyMemberDocument } from '../../member/MemberData';

export interface MemberRepository {
  observe(
    uid: string,
    onMember: (document: LegacyMemberDocument | null) => void,
    onError: () => void,
  ): () => void;
}
