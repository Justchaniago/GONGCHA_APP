export interface PromotionDisplayItem {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  bannerType: 'hero' | 'card' | 'modal';
  actionUrl?: string;
  formattedPeriod: string;
  active: boolean;
}

export interface PromotionsViewModel {
  heroBanners: PromotionDisplayItem[];
  activeCards: PromotionDisplayItem[];
  promoModalBanner: PromotionDisplayItem | null;
}

function formatPeriod(start: any, end: any): string {
  const parseDate = (val: any): Date | null => {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (typeof val === 'number') return new Date(val);
    if (typeof val === 'string') {
      const parsed = Date.parse(val);
      return isNaN(parsed) ? null : new Date(parsed);
    }
    if (typeof val === 'object') {
      if (typeof val.toMillis === 'function') {
        return new Date(val.toMillis());
      }
      if (typeof val.seconds === 'number') {
        return new Date(val.seconds * 1000);
      }
    }
    return null;
  };

  const startDate = parseDate(start);
  const endDate = parseDate(end);

  if (!startDate && !endDate) {
    return 'Always Active';
  }

  const formatSingleDate = (d: Date): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  };

  if (startDate && endDate) {
    return `${formatSingleDate(startDate)} - ${formatSingleDate(endDate)}`;
  } else if (startDate) {
    return `From ${formatSingleDate(startDate)}`;
  } else {
    return `Until ${formatSingleDate(endDate!)}`;
  }
}

export function buildLegacyPromotionsViewModel(rawPromos: any[]): PromotionsViewModel {
  const items: PromotionDisplayItem[] = (rawPromos || []).map((promo) => {
    if (typeof promo.bannerType === 'string') {
      return {
        id: promo.id || '',
        title: promo.title || '',
        subtitle: promo.subtitle || '',
        imageUrl: promo.imageUrl || '',
        bannerType: promo.bannerType,
        actionUrl: promo.actionUrl,
        formattedPeriod: promo.formattedPeriod || formatPeriod(promo.startAt, promo.endAt),
        active: typeof promo.active === 'boolean' ? promo.active : (promo.isActive !== false),
      };
    }

    const bannerType = promo.type === 'modal_ad' ? 'modal' : 'hero';
    const active = typeof promo.isActive === 'boolean' ? promo.isActive : true;
    return {
      id: promo.id || '',
      title: promo.title || '',
      subtitle: promo.subtitle || '',
      imageUrl: promo.imageUrl || '',
      bannerType,
      actionUrl: promo.actionUrl,
      formattedPeriod: formatPeriod(promo.startAt || promo.startDate, promo.endAt || promo.endDate),
      active,
    };
  });

  const heroBanners = items.filter(item => item.bannerType === 'hero' && item.active);
  const activeCards = items.filter(item => item.bannerType === 'card' && item.active);
  const modalBanners = items.filter(item => item.bannerType === 'modal' && item.active);
  const promoModalBanner = modalBanners.length > 0 ? modalBanners[0] : null;

  return {
    heroBanners,
    activeCards,
    promoModalBanner,
  };
}

export function buildLocalPromotionsViewModel(rawPromos: any[]): PromotionsViewModel {
  const items: PromotionDisplayItem[] = (rawPromos || []).map((promo) => {
    const bannerType = promo.bannerType || (promo.type === 'modal_ad' ? 'modal' : 'hero');
    const active = typeof promo.active === 'boolean' ? promo.active : (promo.isActive !== false);
    return {
      id: promo.id || '',
      title: promo.title || '',
      subtitle: promo.subtitle || '',
      imageUrl: promo.imageUrl || '',
      bannerType,
      actionUrl: promo.actionUrl,
      formattedPeriod: promo.formattedPeriod || formatPeriod(promo.startAt || promo.startDate, promo.endAt || promo.endDate),
      active,
    };
  });

  const heroBanners = items.filter(item => item.bannerType === 'hero' && item.active);
  const activeCards = items.filter(item => item.bannerType === 'card' && item.active);
  const modalBanners = items.filter(item => item.bannerType === 'modal' && item.active);
  const promoModalBanner = modalBanners.length > 0 ? modalBanners[0] : null;

  return {
    heroBanners,
    activeCards,
    promoModalBanner,
  };
}
