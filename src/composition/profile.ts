import { ProfileCommands } from '../application/profile/ProfileCommands';
import type { ProfileRepository } from '../application/ports/profile/ProfileRepository';
import { toIsoDateOfBirth } from '../application/profile/profileValidation';
import { runtimeConfig } from '../config/runtime';
import { ExpoProfileImageCapability } from '../infrastructure/profile/ExpoProfileImageCapability';
import { refreshMemberSession } from './member';

import { USE_FASTAPI_BACKEND, FASTAPI_BASE_URL } from '../config/flags';

function buildProfileRepository(): ProfileRepository {
  if (USE_FASTAPI_BACKEND) {
    const { firebaseAuth } = require('../config/firebase');
    const { FastApiProfileRepository } = require(
      '../infrastructure/profile/FastApiProfileRepository'
    );
    return new FastApiProfileRepository(
      firebaseAuth,
      FASTAPI_BASE_URL,
      toIsoDateOfBirth,
    );
  }
  if (runtimeConfig.mode === 'local_emulator') {
    const { firebaseLocalAuth } = require('../config/firebaseLocal');
    const { FastApiProfileRepository } = require(
      '../infrastructure/profile/FastApiProfileRepository'
    );
    return new FastApiProfileRepository(
      firebaseLocalAuth,
      runtimeConfig.backendBaseUrl,
      toIsoDateOfBirth,
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
  (runtimeConfig.mode === 'local_emulator' || USE_FASTAPI_BACKEND)
    ? refreshMemberSession
    : undefined,
);
