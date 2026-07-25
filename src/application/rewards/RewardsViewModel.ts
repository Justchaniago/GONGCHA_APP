export interface RewardDisplayItem {
  id: string;
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

export function buildLegacyRewardsViewModel(
  member: any,
  rewards: any[],
  vouchers: any[],
): RewardsViewModel {
  const points = member?.currentPoints ?? member?.points ?? 0;
  const pending = member?.pendingPoints ?? 0;

  const catalogItems: RewardDisplayItem[] = (rewards || []).map((r) => {
    const required = r.pointsrequired ?? r.pointsRequired ?? 0;
    const canAfford = points >= required;
    const diff = required - points;
    return {
      id: r.id,
      title: r.title || 'Reward Gong Cha',
      description: r.description || '',
      pointsRequired: required,
      pointsRequiredLabel: `${required.toLocaleString('id-ID')} Leaves`,
      imageUrl: r.imageUrl,
      category: r.category,
      canAfford,
      actionLabel: canAfford ? 'Tukar' : `${diff.toLocaleString('id-ID')} Leaves Lagi`,
    };
  });

  const activeVouchers: VoucherDisplayItem[] = [];
  const historyVouchers: VoucherDisplayItem[] = [];

  (vouchers || []).forEach((v) => {
    const item: VoucherDisplayItem = {
      id: v.id || v.code,
      code: v.code || 'GC-VOUCHER',
      title: v.title || v.voucherTitle || 'Voucher Gong Cha',
      description: v.description || 'Gunakan saat pemesanan.',
      discountType: v.discountType || 'fixed',
      value: v.value || 0,
      formattedExpiry: v.expiryDate || v.formattedExpiry || 'Berlaku s/d 31 Des 2026',
      status: v.status === 'used' ? 'used' : v.status === 'expired' ? 'expired' : 'active',
      qrPayload: v.code || 'GC-VOUCHER',
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

export function buildLocalRewardsViewModel(
  member: any,
  summary: any,
  catalog: any[],
  vouchers: any[],
): RewardsViewModel {
  const points = summary?.leaves_balance ?? 0;
  const pending = summary?.pending_leaves ?? 0;

  const catalogItems: RewardDisplayItem[] = (catalog || []).map((c) => {
    const required = c.pointsRequired ?? c.pointsrequired ?? 0;
    const canAfford = points >= required;
    const diff = required - points;
    return {
      id: c.id,
      title: c.title,
      description: c.description || '',
      pointsRequired: required,
      pointsRequiredLabel: `${required.toLocaleString('id-ID')} Leaves`,
      imageUrl: c.imageUrl,
      category: c.category,
      canAfford,
      actionLabel: canAfford ? 'Tukar' : `${diff.toLocaleString('id-ID')} Leaves Lagi`,
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
