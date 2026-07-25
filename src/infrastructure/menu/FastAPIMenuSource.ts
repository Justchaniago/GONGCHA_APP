import type { MenuItem } from '../../application/menu/MenuItem';
import type { MenuSource } from '../../application/ports/menu/MenuSource';
import { FASTAPI_BASE_URL } from '../../config/flags';

export class FastAPIMenuSource implements MenuSource {
  constructor(private readonly baseUrl: string = FASTAPI_BASE_URL) {}

  async loadChanges(_sinceEpochMilliseconds: number): Promise<MenuItem[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/menu`);
      if (!response.ok) {
        throw new Error(`FastAPI menu returned ${response.status}`);
      }
      const categories = await response.json();
      const items: MenuItem[] = [];

      for (const cat of categories) {
        for (const item of cat.items || []) {
          items.push({
            id: item.id || item.code,
            name: item.name || 'Gong Cha Drink',
            category: cat.name || 'Milk Tea',
            basePrice: item.price || item.price_minor || 30000,
            isLargeAvailable: true,
            isHotAvailable: true,
            description: item.description || '',
            imageUrl: item.image_url || item.imageUrl || '',
            rating: 4.8,
            isAvailable: true,
          });
        }
      }
      return items;
    } catch {
      return [];
    }
  }
}
