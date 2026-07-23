import type { MenuItem } from '../../menu/MenuItem';

export interface MenuSource {
  loadChanges(sinceEpochMilliseconds: number): Promise<MenuItem[]>;
}
