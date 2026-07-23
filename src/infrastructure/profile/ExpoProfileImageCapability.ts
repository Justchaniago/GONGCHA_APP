import * as ImagePicker from 'expo-image-picker';

import type { ProfileImageCapability } from '../../application/ports/profile/ProfileImageCapability';
import type { PickProfileImageResult } from '../../application/profile/ProfileData';

export class ExpoProfileImageCapability implements ProfileImageCapability {
  async pickSquareImage(): Promise<PickProfileImageResult> {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return { kind: 'permission-denied' };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
      base64: true,
    });
    if (result.canceled || !result.assets?.length) {
      return { kind: 'cancelled' };
    }
    return {
      kind: 'selected',
      dataUri: `data:image/jpeg;base64,${result.assets[0].base64}`,
    };
  }
}
