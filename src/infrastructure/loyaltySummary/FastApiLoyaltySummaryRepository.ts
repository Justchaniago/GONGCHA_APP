import type { Auth, User } from 'firebase/auth';

import type {
  CandidateTierCode,
  LoyaltySummary,
} from '../../application/loyaltySummary/LoyaltySummary';
import type { LoyaltySummaryRepository } from '../../application/ports/loyaltySummary/LoyaltySummaryRepository';

type JsonResponse = {
  ok: boolean;
  status?: number;
  json(): Promise<unknown>;
};

type FetchLike = (
  input: string,
  init: {
    method: 'GET';
    headers: { Authorization: string };
  },
) => Promise<JsonResponse>;

const LOCAL_BACKEND_PATTERN = /^https?:\/\/.+/;
const TIER_CODES = new Set<CandidateTierCode>([
  'LOVER',
  'MASTER',
  'AMBASSADOR',
  'LEGEND',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const keys = Object.keys(value).sort();
  const expectedKeys = [...expected].sort();
  return (
    keys.length === expectedKeys.length &&
    keys.every((key, index) => key === expectedKeys[index])
  );
}

function isSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value);
}

function parseTierCode(value: unknown): CandidateTierCode | null {
  return typeof value === 'string' &&
    TIER_CODES.has(value as CandidateTierCode)
    ? (value as CandidateTierCode)
    : null;
}

export function parseLoyaltySummary(value: unknown): LoyaltySummary {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      'available_leaves',
      'qualifying_leaves',
      'pending',
      'tier',
      'policy_version',
    ]) ||
    !isSafeInteger(value.available_leaves) ||
    !isSafeInteger(value.qualifying_leaves) ||
    value.qualifying_leaves < 0 ||
    value.policy_version !== 'gongcha-tier-candidate-v1' ||
    !isRecord(value.pending) ||
    !hasExactKeys(value.pending, ['state', 'leaves']) ||
    value.pending.state !== 'unsupported' ||
    value.pending.leaves !== null ||
    !isRecord(value.tier) ||
    !hasExactKeys(value.tier, [
      'code',
      'display_name',
      'current_threshold',
      'next_code',
      'next_display_name',
      'next_threshold',
      'remaining',
      'progress_percent',
    ])
  ) {
    throw new Error('loyalty_summary_invalid_response');
  }

  const code = parseTierCode(value.tier.code);
  const nextCode =
    value.tier.next_code === null
      ? null
      : parseTierCode(value.tier.next_code);
  const nextValues = [
    value.tier.next_code,
    value.tier.next_display_name,
    value.tier.next_threshold,
  ];
  const hasNoNext = nextValues.every((item) => item === null);
  const hasCompleteNext =
    nextCode !== null &&
    typeof value.tier.next_display_name === 'string' &&
    value.tier.next_display_name.length > 0 &&
    isSafeInteger(value.tier.next_threshold) &&
    value.tier.next_threshold >= 0;

  if (
    code === null ||
    typeof value.tier.display_name !== 'string' ||
    value.tier.display_name.length === 0 ||
    !isSafeInteger(value.tier.current_threshold) ||
    value.tier.current_threshold < 0 ||
    (!hasNoNext && !hasCompleteNext) ||
    !isSafeInteger(value.tier.remaining) ||
    value.tier.remaining < 0 ||
    !isSafeInteger(value.tier.progress_percent) ||
    value.tier.progress_percent < 0 ||
    value.tier.progress_percent > 100
  ) {
    throw new Error('loyalty_summary_invalid_response');
  }

  return {
    availableLeaves: value.available_leaves,
    qualifyingLeaves: value.qualifying_leaves,
    pending: { state: 'unsupported', leaves: null },
    tier: {
      code,
      displayName: value.tier.display_name,
      currentThreshold: value.tier.current_threshold,
      nextCode,
      nextDisplayName: value.tier.next_display_name as string | null,
      nextThreshold: value.tier.next_threshold as number | null,
      remaining: value.tier.remaining,
      progressPercent: value.tier.progress_percent,
    },
    policyVersion: 'gongcha-tier-candidate-v1',
  };
}

function responseError(status?: number): Error {
  if (status === 401 || status === 403) {
    return new Error('loyalty_summary_session_expired');
  }
  if (status === 400 || status === 404 || status === 409 || status === 422) {
    return new Error('loyalty_summary_request_rejected');
  }
  return new Error('loyalty_summary_unavailable');
}

export class FastApiLoyaltySummaryRepository
  implements LoyaltySummaryRepository
{
  private readonly auth: Auth;
  private readonly baseUrl: string;
  private readonly fetcher: FetchLike;

  constructor(auth: Auth, baseUrl: string, fetcher: FetchLike = fetch) {
    if (!LOCAL_BACKEND_PATTERN.test(baseUrl)) {
      throw new Error('loyalty_summary_backend_not_local');
    }
    this.auth = auth;
    this.baseUrl = baseUrl;
    this.fetcher = fetcher;
  }

  async load(uid: string): Promise<LoyaltySummary> {
    const user = this.auth.currentUser;
    if (!user || user.uid !== uid) {
      throw new Error('loyalty_summary_identity_mismatch');
    }

    let token: string;
    try {
      token = await user.getIdToken();
    } catch {
      throw new Error('loyalty_summary_auth_failed');
    }
    this.assertIdentityCurrent(uid, user);

    let response: JsonResponse;
    try {
      response = await this.fetcher(
        `${this.baseUrl}/api/v1/member/loyalty-summary`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        },
      );
    } catch {
      throw new Error('loyalty_summary_unavailable');
    }
    this.assertIdentityCurrent(uid, user);
    if (!response.ok) throw responseError(response.status);

    let value: unknown;
    try {
      value = await response.json();
    } catch {
      throw new Error('loyalty_summary_invalid_response');
    }
    this.assertIdentityCurrent(uid, user);
    return parseLoyaltySummary(value);
  }

  private assertIdentityCurrent(uid: string, user: User): void {
    if (this.auth.currentUser !== user || user.uid !== uid) {
      throw new Error('loyalty_summary_identity_changed');
    }
  }
}
