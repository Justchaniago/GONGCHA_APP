import type { Store } from '../../../application/stores/Store';

function isStore(value: unknown): value is Store {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const store = value as Partial<Store>;
  return (
    typeof store.id === 'string' &&
    typeof store.name === 'string' &&
    typeof store.address === 'string' &&
    typeof store.latitude === 'number' &&
    Number.isFinite(store.latitude) &&
    typeof store.longitude === 'number' &&
    Number.isFinite(store.longitude) &&
    typeof store.openHours === 'string'
  );
}

export function decodeStores(serialized: string | null): Store[] {
  if (!serialized) {
    return [];
  }

  try {
    const value: unknown = JSON.parse(serialized);
    return Array.isArray(value) && value.every(isStore) ? value : [];
  } catch {
    return [];
  }
}

export function decodeStoreSyncTime(serialized: string | null): number {
  if (!serialized) {
    return 0;
  }

  const value = Number(serialized);
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}
