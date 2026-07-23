import * as Location from 'expo-location';

import type {
  LocationCapability,
  LocationSnapshot,
} from '../../application/ports/stores/LocationCapability';

export class ExpoLocationCapability implements LocationCapability {
  async resolveForegroundPosition(): Promise<LocationSnapshot> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        return {
          permission:
            status === Location.PermissionStatus.DENIED
              ? 'denied'
              : 'undetermined',
          position: null,
        };
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return {
        permission: 'granted',
        position: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
      };
    } catch {
      return { permission: 'undetermined', position: null };
    }
  }
}
