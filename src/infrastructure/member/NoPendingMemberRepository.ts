import type { PendingMemberRepository } from '../../application/ports/member/PendingMemberRepository';

export class NoPendingMemberRepository
  implements PendingMemberRepository
{
  observe(
    _uid: string,
    onSummary: Parameters<PendingMemberRepository['observe']>[1],
  ): () => void {
    onSummary({
      loaded: true,
      pendingCount: 0,
      pendingPoints: 0,
    });
    return () => {};
  }
}
