import type { PromotionRepository } from '../ports/promotions/PromotionRepository';
import type { Promotion, PromotionType } from './Promotion';

export function activePromotionsByType(
  promotions: readonly Promotion[],
  type: PromotionType,
  nowEpochMilliseconds: number,
): Promotion[] {
  return promotions
    .filter(
      (promotion) =>
        promotion.type === type &&
        promotion.isActive &&
        (promotion.startAt === null ||
          nowEpochMilliseconds >= promotion.startAt) &&
        (promotion.endAt === null || nowEpochMilliseconds <= promotion.endAt),
    )
    .sort((left, right) => left.order - right.order);
}

export class ObservePromotions {
  private readonly repository: PromotionRepository;
  private readonly now: () => number;

  constructor(repository: PromotionRepository, now: () => number = Date.now) {
    this.repository = repository;
    this.now = now;
  }

  execute(
    type: PromotionType,
    onUpdate: (promotions: Promotion[]) => void,
  ): () => void {
    return this.repository.observe(
      (promotions) => {
        onUpdate(activePromotionsByType(promotions, type, this.now()));
      },
      () => {
        onUpdate([]);
      },
    );
  }
}
