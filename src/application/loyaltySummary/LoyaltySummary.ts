export type CandidateTierCode =
  | 'LOVER'
  | 'MASTER'
  | 'AMBASSADOR'
  | 'LEGEND';

export interface LoyaltySummaryTier {
  code: CandidateTierCode;
  displayName: string;
  currentThreshold: number;
  nextCode: CandidateTierCode | null;
  nextDisplayName: string | null;
  nextThreshold: number | null;
  remaining: number;
  progressPercent: number;
}

export interface LoyaltySummary {
  availableLeaves: number;
  qualifyingLeaves: number;
  pending: {
    state: 'unsupported';
    leaves: null;
  };
  tier: LoyaltySummaryTier;
  policyVersion: 'gongcha-tier-candidate-v1';
}

export type LoyaltySummaryState =
  | {
      phase: 'idle' | 'loading' | 'error';
      summary: null;
      refreshing: false;
      error: 'summary_load_failed' | null;
    }
  | {
      phase: 'ready';
      summary: LoyaltySummary;
      refreshing: boolean;
      error: 'summary_refresh_failed' | null;
    };

export const EMPTY_LOYALTY_SUMMARY_STATE: LoyaltySummaryState = {
  phase: 'idle',
  summary: null,
  refreshing: false,
  error: null,
};
