import type {
  Store,
  StoreStatusOverride,
} from '../../application/stores/Store';

type LegacyStoreDocument = Record<string, unknown>;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
}

export function mapLegacyStoreDocument(
  id: string,
  data: LegacyStoreDocument,
): Store {
  const rawName =
    data.name ?? data.Name ?? data.storeName ?? data.nama ?? 'Unnamed Store';
  const rawAddress =
    data.address ?? data.Address ?? data.alamat ?? 'Address not available';
  const location = asRecord(data.location);
  const operationalHours = asRecord(data.operationalHours);

  const latitude =
    typeof location?.latitude === 'number'
      ? location.latitude
      : Number(data.latitude || 0);
  const longitude =
    typeof location?.latitude === 'number'
      ? Number(location.longitude || 0)
      : Number(data.longitude || 0);

  const openHours =
    operationalHours?.open && operationalHours.close
      ? `${operationalHours.open} - ${operationalHours.close}`
      : data.openHours || '10:00 - 22:00';
  const statusOverride = ['open', 'closed', 'almost_close'].includes(
    String(data.statusOverride),
  )
    ? (data.statusOverride as StoreStatusOverride)
    : undefined;

  return {
    id,
    name: String(rawName).trim(),
    address: String(rawAddress).trim(),
    latitude,
    longitude,
    openHours: String(openHours).trim(),
    statusOverride,
    isAvailable: data.isAvailable !== false,
  };
}
