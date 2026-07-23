import type { PendingMemberRepository } from '../../application/ports/member/PendingMemberRepository';
import { TransactionService } from '../../services/TransactionService';

export class LegacyPendingMemberRepository
  implements PendingMemberRepository
{
  observe(
    uid: string,
    onSummary: Parameters<PendingMemberRepository['observe']>[1],
  ): () => void {
    return TransactionService.subscribeToPendingTransactionSummary(
      uid,
      onSummary,
    );
  }
}
