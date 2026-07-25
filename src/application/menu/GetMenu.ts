import type { MenuRepository } from '../ports/menu/MenuRepository';
import type { MenuItem } from './MenuItem';

export interface MenuSnapshot {
  items: MenuItem[];
  stale: boolean;
}

export interface MenuItemDisplay {
  id: string;
  name: string;
  description: string;
  price: number;
  formattedPrice: string;
  category: string;
  imageUrl?: string;
  isPopular: boolean;
  isNew: boolean;
  tags: string[];
}

export interface MenuCategoryDisplay {
  id: string;
  name: string;
  count: number;
}

export interface MenuViewModel {
  categories: MenuCategoryDisplay[];
  items: MenuItemDisplay[];
}

export function visibleMenuByName(items: readonly MenuItem[]): MenuItem[] {
  return items
    .filter((item) => item.isAvailable !== false)
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function buildMenuViewModel(
  rawItems: MenuItem[],
  selectedCategory?: string
): MenuViewModel {
  const visibleItems = visibleMenuByName(rawItems);

  const mappedItems: MenuItemDisplay[] = visibleItems.map((item) => {
    const formattedPrice = `Rp ${item.basePrice.toLocaleString('id-ID')}`;
    return {
      id: item.id,
      name: item.name,
      description: item.description || 'Enjoy our signature drink made with premium ingredients.',
      price: item.basePrice,
      formattedPrice,
      category: item.category,
      imageUrl: item.imageUrl,
      isPopular: !!(item as any).isPopular || (item.rating !== undefined && item.rating >= 4.8),
      isNew: !!(item as any).isNew,
      tags: (item as any).tags || (item.isHotAvailable ? ['ICE', 'HOT'] : ['ICE']),
    };
  });

  const normalizeCategory = (cat: string): string => {
    const lower = cat.toLowerCase().replace(/\s+/g, '');
    if (lower === 'milktea') return 'Milk Tea';
    if (
      lower === 'creativetea' ||
      lower === 'creativemix' ||
      lower === 'signature' ||
      lower === 'matcha' ||
      lower === 'mint' ||
      lower === 'brownsugar'
    ) {
      return 'Creative Tea';
    }
    if (lower === 'brewedtea') return 'Brewed Tea';
    if (lower === 'coffee') return 'Coffee';
    if (lower === 'topping') return 'Topping';
    return cat;
  };

  const targetCategoryIds = ['Semua', 'Milk Tea', 'Creative Tea', 'Brewed Tea', 'Coffee', 'Topping'];

  const counts: Record<string, number> = {};
  targetCategoryIds.forEach((id) => {
    counts[id] = 0;
  });

  counts['Semua'] = mappedItems.length;

  mappedItems.forEach((item) => {
    const norm = normalizeCategory(item.category);
    if (counts[norm] !== undefined) {
      counts[norm]++;
    } else {
      counts[norm] = (counts[norm] || 0) + 1;
    }
  });

  const categoriesList: MenuCategoryDisplay[] = targetCategoryIds.map((id) => ({
    id,
    name: id,
    count: counts[id] || 0,
  }));

  Object.keys(counts).forEach((key) => {
    if (!targetCategoryIds.includes(key)) {
      categoriesList.push({
        id: key,
        name: key,
        count: counts[key],
      });
    }
  });

  let filteredItems = mappedItems;
  if (selectedCategory && selectedCategory !== 'Semua' && selectedCategory !== 'All') {
    filteredItems = mappedItems.filter((item) => {
      const norm = normalizeCategory(item.category);
      return norm === selectedCategory || item.category === selectedCategory;
    });
  }

  return {
    categories: categoriesList,
    items: filteredItems,
  };
}

export class GetMenu {
  private readonly repository: MenuRepository;

  constructor(repository: MenuRepository) {
    this.repository = repository;
  }

  async execute(): Promise<MenuSnapshot> {
    const snapshot = await this.repository.load();
    return {
      items: visibleMenuByName(snapshot.items),
      stale: snapshot.stale,
    };
  }
}
