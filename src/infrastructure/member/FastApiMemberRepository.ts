import type { Auth } from 'firebase/auth';

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
) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

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
      .catch(() => {
        if (active) onError();
      });
    return () => {
      active = false;
    };
  }

  private async load(uid: string): Promise<LegacyMemberDocument> {
    const user = this.auth.currentUser;
    if (!user || user.uid !== uid) {
      throw new Error('member_api_identity_mismatch');
    }
    const token = await user.getIdToken();
    const headers = { Authorization: `Bearer ${token}` };
    const bootstrap = await this.fetcher(
      `${this.baseUrl}/api/v1/member/bootstrap`,
      { method: 'POST', headers },
    );
    if (!bootstrap.ok) {
      throw new Error('member_api_bootstrap_failed');
    }
    const current = await this.fetcher(
      `${this.baseUrl}/api/v1/member/me`,
      { method: 'GET', headers },
    );
    if (!current.ok) {
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
