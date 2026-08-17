export interface RewardDisplayItem {
  id: string;
  code?: string;
  title: string;
  description: string;
  pointsRequired: number;
  pointsRequiredLabel: string;
  imageUrl?: string;
  category?: string;
  canAfford: boolean;
  actionLabel: string;
}

export interface VoucherDisplayItem {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: string;
  value: number;
  formattedExpiry: string;
  status: 'active' | 'used' | 'expired';
  qrPayload: string;
}

export interface RewardsViewModel {
  availableLeavesLabel: string;
  pendingLeavesLabel: string;
  availableLeavesValue: number;
  catalogItems: RewardDisplayItem[];
  activeVouchers: VoucherDisplayItem[];
  historyVouchers: VoucherDisplayItem[];
}

import { TFunction } from 'i18next';

export function buildLocalRewardsViewModel(
  t: TFunction,
  summary: any,
  catalog: any[],
  vouchers: any[],
): RewardsViewModel {
  const points = summary?.availableLeaves ?? 0;
  const pending = 0; // pending_leaves not supported yet

  const catalogItems: RewardDisplayItem[] = (catalog || []).map((c) => {
    const required = c.pointsRequired ?? c.pointsrequired ?? 0;
    const canAfford = points >= required;
    const diff = required - points;
    const code = c.code || c.id;
    return {
      id: c.id,
      code,
      title: t(`catalog.rewards.${code}.title`, { defaultValue: c.title }),
      description: t(`catalog.rewards.${code}.description`, { defaultValue: c.description || '' }),
      pointsRequired: required,
      pointsRequiredLabel: `${required.toLocaleString('id-ID')} Leaves`,
      imageUrl: c.imageUrl,
      category: c.category,
      canAfford,
      actionLabel: canAfford ? t('common.redeem') : `${diff.toLocaleString('id-ID')} Leaves Lagi`,
    };
  });

  const activeVouchers: VoucherDisplayItem[] = [];
  const historyVouchers: VoucherDisplayItem[] = [];

  (vouchers || []).forEach((v) => {
    const item: VoucherDisplayItem = {
      id: v.id,
      code: v.code,
      title: v.title,
      description: v.description || 'Voucher promo Gong Cha.',
      discountType: v.discountType || 'fixed',
      value: v.value || 0,
      formattedExpiry: v.formattedExpiry || 'Berlaku s/d 31 Des 2026',
      status: v.status || 'active',
      qrPayload: v.code,
    };
    if (item.status === 'active') {
      activeVouchers.push(item);
    } else {
      historyVouchers.push(item);
    }
  });

  return {
    availableLeavesLabel: `${points.toLocaleString('id-ID')} Leaves`,
    pendingLeavesLabel: `${pending.toLocaleString('id-ID')} Pending`,
    availableLeavesValue: points,
    catalogItems,
    activeVouchers,
    historyVouchers,
  };
}
