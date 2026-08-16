import { firebaseAuth } from '../../config/firebase';
import { FASTAPI_BASE_URL } from '../../config/flags';

export interface RewardCatalogItem {
  id: string;
  title: string;
  description: string;
  pointsrequired: number;
  imageUrl: string;
  category: string;
  isActive: boolean;
  isRedeemable: boolean;
}

export interface RedeemResult {
  success: boolean;
  duplicate: boolean;
  voucher: {
    id: string;
    code: string;
    title: string;
    status: string;
    expiresAt: string | null;
  };
  newBalance: number;
}

export const FastAPIRewardsRepository = {
  async listRewards(baseUrl = FASTAPI_BASE_URL): Promise<RewardCatalogItem[]> {
    const res = await fetch(`${baseUrl}/api/v1/rewards`);
    if (!res.ok) throw new Error(`rewards fetch failed: ${res.status}`);
    return res.json();
  },

  async redeemReward(
    rewardId: string,
    commandId: string,
    baseUrl = FASTAPI_BASE_URL,
  ): Promise<RedeemResult> {
    const user = firebaseAuth.currentUser;
    if (!user) throw new Error('not_authenticated');
    const token = await user.getIdToken();

    const res = await fetch(`${baseUrl}/api/v1/member/redeem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reward_id: rewardId, command_id: commandId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const code = err?.detail?.code || `redeem_failed_${res.status}`;
      throw new Error(code);
    }
    return res.json();
  },
};
