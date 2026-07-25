import type { LocationCapability } from '../ports/stores/LocationCapability';
import type {
  StoreLoadMode,
  StoreRepository,
} from '../ports/stores/StoreRepository';
import type {
  LocationPermissionStatus,
  Store,
  UserPosition,
} from './Store';
import { getStoreStatus } from './GetStoreStatus.ts';

export interface StoreDisplayItem {
  id: string;
  name: string;
  address: string;
  distanceLabel?: string;
  isOpen: boolean;
  operatingHours: string;
  phone: string;
  latitude: number;
  longitude: number;
  features: string[];
}

export function buildStoresViewModel(
  rawStores: readonly Store[],
  userLocation?: UserPosition | null,
): StoreDisplayItem[] {
  return rawStores.map((store) => {
    let distanceLabel: string | undefined = undefined;
    if (userLocation) {
      const distance = calculateStoreDistance(userLocation, {
        latitude: store.latitude,
        longitude: store.longitude,
      });
      distanceLabel = `${distance} km`;
    } else if (store.distance !== undefined) {
      distanceLabel = `${store.distance} km`;
    }

    const isOpen = getStoreStatus(store, Date.now()) !== 'closed';

    return {
      id: store.id,
      name: store.name,
      address: store.address,
      distanceLabel,
      isOpen,
      operatingHours: store.openHours,
      phone: (store as any).phone || '+62 21 2345 6789',
      latitude: store.latitude,
      longitude: store.longitude,
      features: (store as any).features || ['Dine-in', 'Takeaway', 'Delivery'],
    };
  });
}

export interface StoresSnapshot {
  stores: Store[];
  permission: LocationPermissionStatus;
  stale: boolean;
}

export function calculateStoreDistance(
  origin: UserPosition,
  destination: UserPosition,
): number {
  const earthRadiusKilometers = 6371;
  const toRadians = (degrees: number) => degrees * (Math.PI / 180);
  const latitudeDelta = toRadians(destination.latitude - origin.latitude);
  const longitudeDelta = toRadians(destination.longitude - origin.longitude);
  const originLatitude = toRadians(origin.latitude);
  const destinationLatitude = toRadians(destination.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  const arc = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return Number((earthRadiusKilometers * arc).toFixed(1));
}

export function visibleOrderedStores(
  stores: readonly Store[],
  position: UserPosition | null,
): Store[] {
  const visible = stores.filter((store) => store.isAvailable !== false);

  if (!position) {
    return visible.sort((left, right) => left.name.localeCompare(right.name));
  }

  return visible
    .map((store) => ({
      ...store,
      distance: calculateStoreDistance(position, {
        latitude: store.latitude,
        longitude: store.longitude,
      }),
    }))
    .sort((left, right) => (left.distance ?? 0) - (right.distance ?? 0));
}

export function visibleCachedStores(stores: readonly Store[]): Store[] {
  return stores.filter((store) => store.isAvailable !== false);
}

export class GetStores {
  private readonly repository: StoreRepository;
  private readonly location: LocationCapability;

  constructor(repository: StoreRepository, location: LocationCapability) {
    this.repository = repository;
    this.location = location;
  }

  async execute(mode: StoreLoadMode): Promise<StoresSnapshot> {
    const location = await this.location.resolveForegroundPosition();
    const snapshot = await this.repository.load(mode);

    return {
      stores: snapshot.stale
        ? visibleCachedStores(snapshot.stores)
        : visibleOrderedStores(snapshot.stores, location.position),
      permission: location.permission,
      stale: snapshot.stale,
    };
  }
}
