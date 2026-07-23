import type { Store } from '../../stores/Store';
import type { StoreLoadMode } from './StoreRepository';

export interface StoreSource {
  load(mode: StoreLoadMode, sinceEpochMilliseconds: number): Promise<Store[]>;
}
