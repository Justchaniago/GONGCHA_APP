import type {
  Promotion,
  PromotionType,
} from '../../application/promotions/Promotion';

type FirestorePromotionData = Record<string, unknown>;

function toEpochMilliseconds(value: unknown): number | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const toMillis = (value as { toMillis?: unknown }).toMillis;
  if (typeof toMillis !== 'function') {
    return null;
  }

  const epochMilliseconds = toMillis.call(value);
  return typeof epochMilliseconds === 'number' &&
    Number.isFinite(epochMilliseconds)
    ? epochMilliseconds
    : null;
}

export function mapFirestorePromotion(
  id: string,
  data: FirestorePromotionData,
): Promotion {
  const type: PromotionType =
    data.type === 'modal_ad' ? 'modal_ad' : 'carousel';

  return {
    id,
    type,
    title: typeof data.title === 'string' ? data.title : '',
    imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : '',
    order:
      typeof data.order === 'number' && Number.isFinite(data.order)
        ? data.order
        : 0,
    isActive: data.isActive === true,
    startAt: toEpochMilliseconds(data.startDate),
    endAt: toEpochMilliseconds(data.endDate),
  };
}
