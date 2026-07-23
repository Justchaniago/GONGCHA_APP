import type { PickProfileImageResult } from '../../profile/ProfileData';

export interface ProfileImageCapability {
  pickSquareImage(): Promise<PickProfileImageResult>;
}
