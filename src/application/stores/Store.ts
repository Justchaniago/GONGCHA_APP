export type StoreStatusOverride = 'open' | 'closed' | 'almost_close';

export interface Store {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  openHours: string;
  statusOverride?: StoreStatusOverride;
  distance?: number;
  isAvailable?: boolean;
}

export interface UserPosition {
  latitude: number;
  longitude: number;
}

export type LocationPermissionStatus = 'granted' | 'denied' | 'undetermined';
