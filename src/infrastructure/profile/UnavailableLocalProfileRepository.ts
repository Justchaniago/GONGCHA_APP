import type { ProfileRepository } from '../../application/ports/profile/ProfileRepository';
import type { ProfileUpdates } from '../../application/profile/ProfileData';

export class UnavailableLocalProfileRepository
  implements ProfileRepository
{
  private readonly hasIdentity: () => boolean;

  constructor(hasIdentity: () => boolean) {
    this.hasIdentity = hasIdentity;
  }

  hasCurrentIdentity() {
    return this.hasIdentity();
  }

  async getCurrent() {
    return null;
  }

  async updateCurrent(_updates: ProfileUpdates): Promise<void> {
    throw new Error('local_profile_api_unavailable');
  }

  async completeCurrent(
    _fullName: string,
    _dateOfBirth: string,
  ): Promise<void> {
    throw new Error('local_profile_api_unavailable');
  }
}
