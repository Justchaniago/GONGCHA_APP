export type LoyaltyActivityEventType =
  | 'earn'
  | 'refund_reversal'
  | 'redemption';

export interface LoyaltyActivityItem {
  activityId: string;
  eventType: LoyaltyActivityEventType;
  pointsDelta: number;
  status: 'posted';
  activityAt: string;
  externalOrderReference: string | null;
}

export interface LoyaltyActivityPage {
  items: LoyaltyActivityItem[];
  nextCursor: string | null;
}

export type PendingAvailability = 'loading' | 'unsupported' | 'error';

export type LoyaltyActivityPhase = 'idle' | 'loading' | 'ready' | 'error';

export interface LoyaltyActivityState {
  phase: LoyaltyActivityPhase;
  items: LoyaltyActivityItem[];
  nextCursor: string | null;
  pendingAvailability: PendingAvailability;
  refreshing: boolean;
  loadingMore: boolean;
  pageError: 'activity_load_failed' | 'activity_pagination_failed' | null;
}

export const EMPTY_LOYALTY_ACTIVITY_STATE: LoyaltyActivityState = {
  phase: 'idle',
  items: [],
  nextCursor: null,
  pendingAvailability: 'loading',
  refreshing: false,
  loadingMore: false,
  pageError: null,
};
