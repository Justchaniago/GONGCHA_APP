import type { MenuItem } from '../../../application/menu/MenuItem';

function isMenuItem(value: unknown): value is MenuItem {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const item = value as Partial<MenuItem>;
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.category === 'string' &&
    typeof item.basePrice === 'number' &&
    Number.isFinite(item.basePrice) &&
    typeof item.isLargeAvailable === 'boolean'
  );
}

export function decodeMenuItems(serialized: string | null): MenuItem[] {
  if (!serialized) {
    return [];
  }

  try {
    const value: unknown = JSON.parse(serialized);
    return Array.isArray(value) && value.every(isMenuItem) ? value : [];
  } catch {
    return [];
  }
}

export function decodeSyncTime(serialized: string | null): number {
  if (!serialized) {
    return 0;
  }

  const value = Number(serialized);
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}
