import type {
  LocationPermissionStatus,
  UserPosition,
} from '../../stores/Store';

export interface LocationSnapshot {
  permission: LocationPermissionStatus;
  position: UserPosition | null;
}

export interface LocationCapability {
  resolveForegroundPosition(): Promise<LocationSnapshot>;
}
