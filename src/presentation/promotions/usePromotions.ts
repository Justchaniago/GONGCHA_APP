import { useEffect, useState } from 'react';

import type { ObservePromotions } from '../../application/promotions/ObservePromotions';
import type {
  Promotion,
  PromotionType,
} from '../../application/promotions/Promotion';

export function usePromotions(
  observePromotions: ObservePromotions,
  type: PromotionType,
): Promotion[] {
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  useEffect(
    () => observePromotions.execute(type, setPromotions),
    [observePromotions, type],
  );

  return promotions;
}
