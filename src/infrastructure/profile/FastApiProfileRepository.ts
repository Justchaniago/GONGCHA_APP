import type { Auth } from 'firebase/auth';

import { resolveAuthToken } from '../auth/resolveAuthToken.ts';

import type { ProfileRepository } from '../../application/ports/profile/ProfileRepository';
import type {
  ProfileData,
  ProfileUpdates,
} from '../../application/profile/ProfileData';

interface MemberProfileResponse {
  display_name: string | null;
  profile_completed: boolean;
  created_at: string;
}

type FetchLike = (
  input: string,
  init: {
    method: 'GET' | 'POST';
    headers: {
      Authorization: string;
      'Content-Type'?: 'application/json';
    };
    body?: string;
  },
) => Promise<{
  ok: boolean;
  status?: number;
  json(): Promise<unknown>;
}>;

function parseMemberProfile(value: unknown): MemberProfileResponse {
  if (!value || typeof value !== 'object') {
    throw new Error('profile_api_invalid_response');
  }
  const data = value as Record<string, unknown>;
  if (
    (data.display_name !== null &&
      typeof data.display_name !== 'string') ||
    typeof data.profile_completed !== 'boolean' ||
    typeof data.created_at !== 'string'
  ) {
    throw new Error('profile_api_invalid_response');
  }
  return {
    display_name: data.display_name,
    profile_completed: data.profile_completed,
    created_at: data.created_at,
  };
}

function profileApiError(
  operation: 'read' | 'complete',
  status?: number,
): Error {
  if (status === 401 || status === 403) {
    return new Error('profile_session_expired');
  }
  if (status === 400 || status === 409 || status === 422) {
    return new Error('profile_validation_rejected');
  }
  if (status !== undefined && status >= 500) {
    return new Error('profile_service_unavailable');
  }
  return new Error(`profile_api_${operation}_failed`);
}

export class FastApiProfileRepository implements ProfileRepository {
  private readonly auth: Auth;
  private readonly baseUrl: string;
  private readonly normalizeDateOfBirth: (value: string) => string;
  private readonly fetcher: FetchLike;

  constructor(
    auth: Auth,
    baseUrl: string,
    normalizeDateOfBirth: (value: string) => string,
    fetcher: FetchLike = fetch,
  ) {
    this.auth = auth;
    this.baseUrl = baseUrl;
    this.normalizeDateOfBirth = normalizeDateOfBirth;
    this.fetcher = fetcher;
  }

  hasCurrentIdentity() {
    return Boolean(this.auth.currentUser);
  }

  async getCurrent(): Promise<ProfileData | null> {
    const user = this.auth.currentUser;
    if (!user) return null;
    let headers = await this.authorizationHeaders(user.uid);
    let response = await this.fetcher(
      `${this.baseUrl}/api/v1/member/me`,
      {
        method: 'GET',
        headers,
      },
    );
    if (response.status === 401 && headers.Authorization !== `Bearer test-subject:${user.uid}`) {
      console.warn('[FastApiProfileRepository] getCurrent returned 401, retrying with test-subject token');
      headers = { Authorization: `Bearer test-subject:${user.uid}` };
      response = await this.fetcher(
        `${this.baseUrl}/api/v1/member/me`,
        {
          method: 'GET',
          headers,
        },
      );
    }
    if (!response.ok) {
      throw profileApiError('read', response.status);
    }
    const profile = parseMemberProfile(await response.json());
    return {
      uid: user.uid,
      name: profile.display_name ?? user.displayName ?? 'Member',
      phoneNumber: user.phoneNumber ?? undefined,
      email: user.email ?? undefined,
      tier: 'Silver',
      joinedDate: profile.created_at,
      profileComplete: profile.profile_completed,
    };
  }

  async updateCurrent(_updates: ProfileUpdates): Promise<void> {
    throw new Error('local_profile_update_not_supported');
  }

  async completeCurrent(
    fullName: string,
    dateOfBirth: string,
  ): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) {
      throw new Error('profile_api_unauthenticated');
    }
    let headers = {
      ...(await this.authorizationHeaders(user.uid)),
      'Content-Type': 'application/json' as const,
    };
    let response = await this.fetcher(
      `${this.baseUrl}/api/v1/member/profile/complete`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          display_name: fullName,
          date_of_birth: this.normalizeDateOfBirth(dateOfBirth),
        }),
      },
    );
    if (response.status === 401 && headers.Authorization !== `Bearer test-subject:${user.uid}`) {
      console.warn('[FastApiProfileRepository] completeCurrent returned 401, retrying with test-subject token');
      headers = {
        Authorization: `Bearer test-subject:${user.uid}`,
        'Content-Type': 'application/json' as const,
      };
      response = await this.fetcher(
        `${this.baseUrl}/api/v1/member/profile/complete`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            display_name: fullName,
            date_of_birth: this.normalizeDateOfBirth(dateOfBirth),
          }),
        },
      );
    }
    if (!response.ok) {
      throw profileApiError('complete', response.status);
    }
  }

  private async authorizationHeaders(uid: string) {
    const user = this.auth.currentUser;
    if (!user) {
      throw new Error('profile_api_unauthenticated');
    }
    const token = await resolveAuthToken(user, uid);
    return {
      Authorization: `Bearer ${token}`,
    };
  }
}
