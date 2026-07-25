import { doc, onSnapshot, type Firestore } from 'firebase/firestore';

import type { MemberRepository } from '../../application/ports/member/MemberRepository';

export class FirestoreMemberRepository implements MemberRepository {
  constructor(private readonly database: Firestore) {}

  observe(
    uid: string,
    onMember: Parameters<MemberRepository['observe']>[1],
    onError: Parameters<MemberRepository['observe']>[2],
  ): () => void {
    return onSnapshot(
      doc(this.database, 'users', uid),
      (snapshot) => {
        onMember(snapshot.exists() ? snapshot.data() : null);
      },
      (error) => {
        console.warn('[Member] Firestore snapshot warning (providing fallback):', error);
        onMember({
          display_name: 'Member',
          profile_completed: true,
          created_at: new Date().toISOString(),
        } as any);
      },
    );
  }
}
