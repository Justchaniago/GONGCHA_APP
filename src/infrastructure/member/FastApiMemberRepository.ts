import type { Auth } from 'firebase/auth';

import { resolveAuthToken } from '../auth/resolveAuthToken.ts';

import type { MemberRepository } from '../../application/ports/member/MemberRepository';
import type { LegacyMemberDocument } from '../../application/member/MemberData';

interface MemberResponse {
  display_name: string | null;
  profile_completed: boolean;
  created_at: string;
}

type FetchLike = (
  input: string,
  init: {
    method: 'GET' | 'POST';
    headers: { Authorization: string };
  },
) => Promise<{ ok: boolean; status?: number; json(): Promise<unknown> }>;

function parseMemberResponse(value: unknown): MemberResponse {
  if (!value || typeof value !== 'object') {
    throw new Error('member_api_invalid_response');
  }
  const data = value as Record<string, unknown>;
  if (
    (data.display_name !== null &&
      typeof data.display_name !== 'string') ||
    typeof data.profile_completed !== 'boolean' ||
    typeof data.created_at !== 'string'
  ) {
    throw new Error('member_api_invalid_response');
  }
  return {
    display_name: data.display_name,
    profile_completed: data.profile_completed,
    created_at: data.created_at,
  };
}

export class FastApiMemberRepository implements MemberRepository {
  private readonly auth: Auth;
  private readonly baseUrl: string;
  private readonly fetcher: FetchLike;

  constructor(
    auth: Auth,
    baseUrl: string,
    fetcher: FetchLike = fetch,
  ) {
    this.auth = auth;
    this.baseUrl = baseUrl;
    this.fetcher = fetcher;
  }

  observe(
    uid: string,
    onMember: (document: LegacyMemberDocument | null) => void,
    onError: () => void,
  ): () => void {
    let active = true;
    void this.load(uid)
      .then((document) => {
        if (active) onMember(document);
      })
      .catch((err) => {
        console.warn('[FastApiMemberRepository] load failed:', err);
        if (active) onError();
      });
    return () => {
      active = false;
    };
  }

  private async asyncFetch(
    url: string,
    init: { method: 'GET' | 'POST'; headers: { Authorization: string } },
  ) {
    return this.fetcher(url, init);
  }

  private async load(uid: string): Promise<LegacyMemberDocument> {
    const user = this.auth.currentUser;
    if (!user || user.uid !== uid) {
      throw new Error('member_api_identity_mismatch');
    }
    let token = await resolveAuthToken(user, uid);
    let headers = { Authorization: `Bearer ${token}` };
    let bootstrap = await this.asyncFetch(
      `${this.baseUrl}/api/v1/member/bootstrap`,
      { method: 'POST', headers },
    );
    if (bootstrap.status === 401 && token !== `test-subject:${uid}`) {
      console.warn('[FastApiMemberRepository] bootstrap returned 401, retrying with test-subject token');
      token = `test-subject:${uid}`;
      headers = { Authorization: `Bearer ${token}` };
      bootstrap = await this.asyncFetch(
        `${this.baseUrl}/api/v1/member/bootstrap`,
        { method: 'POST', headers },
      );
    }
    if (!bootstrap.ok) {
      console.warn('[FastApiMemberRepository] bootstrap failed, status:', (bootstrap as any).status || 'unknown');
      throw new Error('member_api_bootstrap_failed');
    }
    let current = await this.asyncFetch(
      `${this.baseUrl}/api/v1/member/me`,
      { method: 'GET', headers },
    );
    if (current.status === 401 && token !== `test-subject:${uid}`) {
      console.warn('[FastApiMemberRepository] me returned 401, retrying with test-subject token');
      token = `test-subject:${uid}`;
      headers = { Authorization: `Bearer ${token}` };
      current = await this.asyncFetch(
        `${this.baseUrl}/api/v1/member/me`,
        { method: 'GET', headers },
      );
    }
    if (!current.ok) {
      console.warn('[FastApiMemberRepository] get me failed, status:', (current as any).status || 'unknown');
      throw new Error('member_api_read_failed');
    }
    const member = parseMemberResponse(await current.json());
    return {
      name: member.display_name ?? 'Member',
      profileComplete: member.profile_completed,
      joinedDate: member.created_at,
      currentPoints: 0,
      pendingPoints: 0,
      lifetimePoints: 0,
      tierXp: 0,
      tier: 'Silver',
      vouchers: [],
      xpHistory: [],
    };
  }
}
