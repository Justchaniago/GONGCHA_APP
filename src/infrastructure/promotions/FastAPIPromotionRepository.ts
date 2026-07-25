import type { PromotionRepository } from '../../application/ports/promotions/PromotionRepository';
import type { Promotion } from '../../application/promotions/Promotion';
import { FASTAPI_BASE_URL } from '../../config/flags';

export class FastAPIPromotionRepository implements PromotionRepository {
  constructor(private readonly baseUrl: string = FASTAPI_BASE_URL) {}

  observe(
    onUpdate: (promotions: Promotion[]) => void,
    _onError: () => void,
  ): () => void {
    let isCancelled = false;

    const fetchPromotions = async () => {
      try {
        const response = await fetch(`${this.baseUrl}/api/v1/promotions`);
        if (!response.ok) return;
        const data = await response.json();
        if (isCancelled) return;

        const promotions: Promotion[] = data.map((item: any) => ({
          id: item.id || item.code,
          title: item.title || '',
          subtitle: item.subtitle || '',
          bannerType: item.banner_type || item.bannerType || 'HERO',
          actionUrl: item.action_url || item.actionUrl || '',
          imageUrl: item.image_url || item.imageUrl || '',
          startDate: item.start_at || new Date().toISOString(),
          endDate: item.end_at || new Date(Date.now() + 30 * 86400000).toISOString(),
          isActive: true,
          order: 1,
        }));
        onUpdate(promotions);
      } catch {
        // silent fail closed
      }
    };

    fetchPromotions();
    const interval = setInterval(fetchPromotions, 60000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }
}
