import type { Auth } from 'firebase/auth';

import type {
  LoyaltyActivityRepository,
} from '../../application/ports/loyaltyActivity/LoyaltyActivityRepository';
import type {
  LoyaltyActivityEventType,
  LoyaltyActivityItem,
  LoyaltyActivityPage,
} from '../../application/loyaltyActivity/LoyaltyActivity';

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

const LOCAL_BACKEND_PATTERN =
  /^http:\/\/(?:127\.0\.0\.1|10\.0\.2\.2):8000$/;
const ACTIVITY_ID_PATTERN = /^la_[0-9a-f]{64}$/;
const CURSOR_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const EVENT_TYPES = new Set<LoyaltyActivityEventType>([
  'earn',
  'refund_reversal',
  'redemption',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const keys = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return (
    keys.length === sortedExpected.length &&
    keys.every((key, index) => key === sortedExpected[index])
  );
}

function isValidTimestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) &&
    Number.isFinite(Date.parse(value))
  );
}

function parseActivityItem(value: unknown): LoyaltyActivityItem {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      'activity_id',
      'event_type',
      'points_delta',
      'status',
      'activity_at',
      'external_order_reference',
      'total_minor',
      'currency',
    ])
  ) {
    throw new Error('loyalty_activity_invalid_response');
  }
  const eventType = value.event_type;
  if (
    typeof value.activity_id !== 'string' ||
    !ACTIVITY_ID_PATTERN.test(value.activity_id) ||
    typeof eventType !== 'string' ||
    !EVENT_TYPES.has(eventType as LoyaltyActivityEventType) ||
    !Number.isSafeInteger(value.points_delta) ||
    value.points_delta === 0 ||
    value.status !== 'posted' ||
    !isValidTimestamp(value.activity_at)
  ) {
    throw new Error('loyalty_activity_invalid_response');
  }

  const purchaseContext = [
    value.external_order_reference,
    value.total_minor,
    value.currency,
  ];
  const absent = purchaseContext.every((item) => item === null);
  const complete =
    typeof value.external_order_reference === 'string' &&
    value.external_order_reference.length > 0 &&
    Number.isSafeInteger(value.total_minor) &&
    (value.total_minor as number) >= 0 &&
    typeof value.currency === 'string' &&
    /^[A-Z]{3}$/.test(value.currency);
  if (!absent && !complete) {
    throw new Error('loyalty_activity_invalid_response');
  }

  return {
    activityId: value.activity_id,
    eventType: eventType as LoyaltyActivityEventType,
    pointsDelta: value.points_delta as number,
    status: 'posted',
    activityAt: value.activity_at,
    externalOrderReference: value.external_order_reference as string | null,
  };
}

export function parseLoyaltyActivityPage(value: unknown): LoyaltyActivityPage {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ['items', 'next_cursor']) ||
    !Array.isArray(value.items) ||
    !(
      value.next_cursor === null ||
      (typeof value.next_cursor === 'string' &&
        CURSOR_PATTERN.test(value.next_cursor))
    )
  ) {
    throw new Error('loyalty_activity_invalid_response');
  }
  return {
    items: value.items.map(parseActivityItem),
    nextCursor: value.next_cursor,
  };
}

export function parsePendingAvailability(value: unknown): 'unsupported' {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      'state',
      'pending_count',
      'pending_points',
    ]) ||
    value.state !== 'unsupported' ||
    value.pending_count !== null ||
    value.pending_points !== null
  ) {
    throw new Error('loyalty_activity_invalid_pending_response');
  }
  return 'unsupported';
}

function responseError(status?: number): Error {
  if (status === 401 || status === 403) {
    return new Error('loyalty_activity_session_expired');
  }
  if (status === 400 || status === 404 || status === 409 || status === 422) {
    return new Error('loyalty_activity_request_rejected');
  }
  return new Error('loyalty_activity_unavailable');
}

export class FastApiLoyaltyActivityRepository
  implements LoyaltyActivityRepository
{
  private readonly auth: Auth;
  private readonly baseUrl: string;
  private readonly fetcher: FetchLike;

  constructor(auth: Auth, baseUrl: string, fetcher: FetchLike = fetch) {
    if (!LOCAL_BACKEND_PATTERN.test(baseUrl)) {
      throw new Error('loyalty_activity_backend_not_local');
    }
    this.auth = auth;
    this.baseUrl = baseUrl;
    this.fetcher = fetcher;
  }

  async loadPage(
    uid: string,
    cursor?: string,
    limit = 20,
  ): Promise<LoyaltyActivityPage> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
      throw new Error('loyalty_activity_limit_invalid');
    }
    if (cursor !== undefined && !CURSOR_PATTERN.test(cursor)) {
      throw new Error('loyalty_activity_cursor_invalid');
    }
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    const value = await this.getJson(
      uid,
      `/api/v1/member/loyalty-activity?${params.toString()}`,
    );
    try {
      return parseLoyaltyActivityPage(value);
    } catch {
      throw new Error('loyalty_activity_invalid_response');
    }
  }

  async loadPending(uid: string): Promise<'unsupported'> {
    const value = await this.getJson(
      uid,
      '/api/v1/member/pending-summary',
    );
    try {
      return parsePendingAvailability(value);
    } catch {
      throw new Error('loyalty_activity_invalid_pending_response');
    }
  }

  private async getJson(uid: string, path: string): Promise<unknown> {
    const user = this.auth.currentUser;
    if (!user || user.uid !== uid) {
      throw new Error('loyalty_activity_identity_mismatch');
    }
    let token: string;
    try {
      token = await user.getIdToken();
    } catch {
      throw new Error('loyalty_activity_auth_failed');
    }
    let response: JsonResponse;
    try {
      response = await this.fetcher(`${this.baseUrl}${path}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      throw new Error('loyalty_activity_unavailable');
    }
    if (!response.ok) {
      throw responseError(response.status);
    }
    try {
      return await response.json();
    } catch {
      throw new Error('loyalty_activity_invalid_response');
    }
  }
}
