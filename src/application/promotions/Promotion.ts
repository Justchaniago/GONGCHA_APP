export type PromotionType = 'carousel' | 'modal_ad';

export interface Promotion {
  id: string;
  type: PromotionType;
  title: string;
  subtitle?: string;
  imageUrl: string;
  order: number;
  isActive: boolean;
  startAt: number | null;
  endAt: number | null;
}
