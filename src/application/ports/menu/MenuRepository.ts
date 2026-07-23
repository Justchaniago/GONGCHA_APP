import type { MenuItem } from '../../menu/MenuItem';

export interface MenuRepositorySnapshot {
  items: MenuItem[];
  stale: boolean;
}

export interface MenuRepository {
  load(): Promise<MenuRepositorySnapshot>;
}
