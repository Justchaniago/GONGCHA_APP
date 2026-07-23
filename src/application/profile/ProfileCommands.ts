import type { ProfileImageCapability } from '../ports/profile/ProfileImageCapability';
import type { ProfileRepository } from '../ports/profile/ProfileRepository';
import type { ProfileUpdates } from './ProfileData';

export class ProfileCommands {
  private readonly repository: ProfileRepository;
  private readonly imageCapability: ProfileImageCapability;

  constructor(
    repository: ProfileRepository,
    imageCapability: ProfileImageCapability,
  ) {
    this.repository = repository;
    this.imageCapability = imageCapability;
  }

  getCurrent() {
    return this.repository.getCurrent();
  }

  hasCurrentIdentity() {
    return this.repository.hasCurrentIdentity();
  }

  updateCurrent(updates: ProfileUpdates) {
    return this.repository.updateCurrent(updates);
  }

  completeCurrent(fullName: string, dateOfBirth: string) {
    return this.repository.completeCurrent(fullName.trim(), dateOfBirth);
  }

  pickImage() {
    return this.imageCapability.pickSquareImage();
  }
}
