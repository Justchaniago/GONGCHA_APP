export interface MenuItem {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  isLargeAvailable: boolean;
  isHotAvailable?: boolean;
  description?: string;
  imageUrl?: string;
  rating?: number;
  isAvailable?: boolean;
  code?: string;
  isPopular?: boolean;
  isNew?: boolean;
}
