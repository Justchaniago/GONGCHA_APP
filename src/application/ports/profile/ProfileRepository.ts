import type {
  ProfileData,
  ProfileUpdates,
} from '../../profile/ProfileData';

export interface ProfileRepository {
  hasCurrentIdentity(): boolean;
  getCurrent(): Promise<ProfileData | null>;
  updateCurrent(updates: ProfileUpdates): Promise<void>;
  completeCurrent(fullName: string, dateOfBirth: string): Promise<void>;
}
