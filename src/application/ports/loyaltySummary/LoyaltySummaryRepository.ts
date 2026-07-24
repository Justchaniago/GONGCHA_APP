import type { LoyaltySummary } from '../../loyaltySummary/LoyaltySummary';

export interface LoyaltySummaryRepository {
  load(uid: string): Promise<LoyaltySummary>;
}
