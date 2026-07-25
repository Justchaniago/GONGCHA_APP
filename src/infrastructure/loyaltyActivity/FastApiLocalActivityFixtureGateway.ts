import type { Auth } from 'firebase/auth';

import type { LocalActivityFixtureGateway } from '../../application/ports/loyaltyActivity/LocalActivityFixtureGateway';

type FetchLike = (
  input: string,
  init: {
    method: 'POST';
    headers: { Authorization: string };
  },
) => Promise<{
  ok: boolean;
  status?: number;
  json(): Promise<unknown>;
}>;

const LOCAL_BACKEND_PATTERN = /^https?:\/\/.+/;
const FIXTURE_STATUSES = new Set([
  'created',
  'replayed',
  'converged',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseFixtureResponse(value: unknown): void {
  if (!isRecord(value)) {
    throw new Error('local_activity_fixture_invalid_response');
  }
  const keys = Object.keys(value).sort();
  if (
    keys.length !== 2 ||
    keys[0] !== 'activity_count' ||
    keys[1] !== 'status' ||
    typeof value.status !== 'string' ||
    !FIXTURE_STATUSES.has(value.status) ||
    value.activity_count !== 4
  ) {
    throw new Error('local_activity_fixture_invalid_response');
  }
}

function responseError(status?: number): Error {
  if (status === 401 || status === 403) {
    return new Error('local_activity_fixture_session_expired');
  }
  if (status === 404) {
    return new Error('local_activity_fixture_route_unavailable');
  }
  if (status === 400 || status === 409 || status === 422) {
    return new Error('local_activity_fixture_rejected');
  }
  return new Error('local_activity_fixture_unavailable');
}

export class FastApiLocalActivityFixtureGateway
  implements LocalActivityFixtureGateway
{
  private readonly auth: Auth;
  private readonly baseUrl: string;
  private readonly fetcher: FetchLike;

  constructor(auth: Auth, baseUrl: string, fetcher: FetchLike = fetch) {
    if (!LOCAL_BACKEND_PATTERN.test(baseUrl)) {
      throw new Error('local_activity_fixture_backend_not_local');
    }
    this.auth = auth;
    this.baseUrl = baseUrl;
    this.fetcher = fetcher;
  }

  async createForMember(uid: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user || user.uid !== uid) {
      throw new Error('local_activity_fixture_identity_mismatch');
    }

    let token: string;
    try {
      token = await user.getIdToken();
    } catch {
      throw new Error('local_activity_fixture_auth_failed');
    }
    this.assertIdentityCurrent(uid, user);

    let response: {
      ok: boolean;
      status?: number;
      json(): Promise<unknown>;
    };
    try {
      response = await this.fetcher(
        `${this.baseUrl}/__local__/fixtures/member-activity`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
      );
    } catch {
      throw new Error('local_activity_fixture_unavailable');
    }
    this.assertIdentityCurrent(uid, user);
    if (!response.ok) throw responseError(response.status);
    try {
      parseFixtureResponse(await response.json());
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'local_activity_fixture_invalid_response'
      ) {
        throw error;
      }
      throw new Error('local_activity_fixture_invalid_response');
    }
  }

  private assertIdentityCurrent(uid: string, user: Auth['currentUser']): void {
    if (!user || this.auth.currentUser !== user || user.uid !== uid) {
      throw new Error('local_activity_fixture_identity_changed');
    }
  }
}
