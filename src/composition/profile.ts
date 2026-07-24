import { ProfileCommands } from '../application/profile/ProfileCommands';
import type { ProfileRepository } from '../application/ports/profile/ProfileRepository';
import { runtimeConfig } from '../config/runtime';
import { ExpoProfileImageCapability } from '../infrastructure/profile/ExpoProfileImageCapability';

function buildProfileRepository(): ProfileRepository {
  if (runtimeConfig.mode === 'local_emulator') {
    const { firebaseLocalAuth } = require('../config/firebaseLocal');
    const { UnavailableLocalProfileRepository } = require(
      '../infrastructure/profile/UnavailableLocalProfileRepository'
    );
    return new UnavailableLocalProfileRepository(
      () => Boolean(firebaseLocalAuth.currentUser),
    );
  }
  const { firebaseAuth, firestoreDb } = require('../config/firebase');
  const { FirestoreProfileRepository } = require(
    '../infrastructure/profile/FirestoreProfileRepository'
  );
  return new FirestoreProfileRepository(firebaseAuth, firestoreDb);
}

export const profileCommands = new ProfileCommands(
  buildProfileRepository(),
  new ExpoProfileImageCapability(),
);
