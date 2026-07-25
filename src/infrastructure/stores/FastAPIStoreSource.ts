import type { StoreSource } from '../../application/ports/stores/StoreSource';
import type { StoreLoadMode } from '../../application/ports/stores/StoreRepository';
import type { Store } from '../../application/stores/Store';
import { FASTAPI_BASE_URL } from '../../config/flags';

export class FastAPIStoreSource implements StoreSource {
  constructor(private readonly baseUrl: string = FASTAPI_BASE_URL) {}

  async load(
    _mode: StoreLoadMode,
    _sinceEpochMilliseconds: number,
  ): Promise<Store[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/stores`);
      if (!response.ok) {
        throw new Error(`FastAPI stores returned ${response.status}`);
      }
      const data = await response.json();
      return data.map((item: any) => ({
        id: item.id || item.code,
        name: item.name || 'Gong Cha Outlet',
        address: item.address || '',
        phone: item.phone || '',
        operatingHours: item.operating_hours || item.operatingHours || '10:00 - 22:00',
        latitude: item.latitude || 0,
        longitude: item.longitude || 0,
        features: item.features || ['Dine In', 'Takeaway'],
        imageUrl: item.image_url || item.imageUrl || '',
        isOpen: item.isOpen ?? true,
        updatedAtMilliseconds: Date.now(),
      }));
    } catch {
      return [];
    }
  }
}
