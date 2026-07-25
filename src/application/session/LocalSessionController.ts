import { FASTAPI_BASE_URL } from '../../config/flags.ts';

export interface FastApiAuthResponse {
  accessToken: string;
  tokenType: string;
  memberUid: string;
}

export interface FastApiMemberProfile {
  uid: string;
  phone: string;
  displayName: string;
  createdAt: string;
}

export interface FastApiLoyaltySummary {
  memberUid: string;
  tier: string;
  availableLeaves: number;
  qualifyingLeaves: number;
}

export async function loginLocalMember(
  phone: string,
  passCode: string,
  baseUrl = FASTAPI_BASE_URL
): Promise<FastApiAuthResponse> {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, passCode }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Login failed with status ${response.status}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token || data.accessToken || 'mock-jwt-token',
    tokenType: data.token_type || data.tokenType || 'bearer',
    memberUid: data.member_uid || data.memberUid || 'mem-101',
  };
}

export async function getLocalMemberProfile(
  token: string,
  baseUrl = FASTAPI_BASE_URL
): Promise<FastApiMemberProfile> {
  const response = await fetch(`${baseUrl}/api/v1/members/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch member profile: ${response.status}`);
  }

  const data = await response.json();
  return {
    uid: data.uid || data.id || 'mem-101',
    phone: data.phone || '',
    displayName: data.display_name || data.displayName || 'Gong Cha Member',
    createdAt: data.created_at || data.createdAt || new Date().toISOString(),
  };
}

export async function getLocalMemberSummary(
  memberUid: string,
  baseUrl = FASTAPI_BASE_URL
): Promise<FastApiLoyaltySummary> {
  const response = await fetch(`${baseUrl}/api/v1/members/${memberUid}/summary`);

  if (!response.ok) {
    throw new Error(`Failed to fetch loyalty summary: ${response.status}`);
  }

  const data = await response.json();
  return {
    memberUid: data.member_uid || data.memberUid || memberUid,
    tier: data.tier || 'SILVER',
    availableLeaves: data.available_leaves ?? data.availableLeaves ?? 0,
    qualifyingLeaves: data.qualifying_leaves ?? data.qualifyingLeaves ?? 0,
  };
}
