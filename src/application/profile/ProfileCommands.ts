import type { ProfileImageCapability } from '../ports/profile/ProfileImageCapability';
import type { ProfileRepository } from '../ports/profile/ProfileRepository';
import type { ProfileUpdates } from './ProfileData';

export class ProfileCommands {
  private readonly repository: ProfileRepository;
  private readonly imageCapability: ProfileImageCapability;
  private readonly onProfileCompleted?: () => void | Promise<void>;

  constructor(
    repository: ProfileRepository,
    imageCapability: ProfileImageCapability,
    onProfileCompleted?: () => void | Promise<void>,
  ) {
    this.repository = repository;
    this.imageCapability = imageCapability;
    this.onProfileCompleted = onProfileCompleted;
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

  async completeCurrent(fullName: string, dateOfBirth: string) {
    await this.repository.completeCurrent(fullName.trim(), dateOfBirth);
    await this.onProfileCompleted?.();
  }

  pickImage() {
    return this.imageCapability.pickSquareImage();
  }
}
