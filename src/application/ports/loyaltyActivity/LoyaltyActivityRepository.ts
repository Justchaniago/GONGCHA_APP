import type {
  LoyaltyActivityPage,
} from '../../loyaltyActivity/LoyaltyActivity';

export interface LoyaltyActivityRepository {
  loadPage(
    uid: string,
    cursor?: string,
    limit?: number,
  ): Promise<LoyaltyActivityPage>;

  loadPending(uid: string): Promise<'unsupported'>;
}
