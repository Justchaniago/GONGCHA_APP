import type { MenuRepository } from '../ports/menu/MenuRepository';
import type { MenuItem } from './MenuItem';

export interface MenuSnapshot {
  items: MenuItem[];
  stale: boolean;
}

export function visibleMenuByName(items: readonly MenuItem[]): MenuItem[] {
  return items
    .filter((item) => item.isAvailable !== false)
    .sort((left, right) => left.name.localeCompare(right.name));
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
