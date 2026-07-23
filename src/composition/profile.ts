import { ProfileCommands } from '../application/profile/ProfileCommands';
import { firebaseAuth, firestoreDb } from '../config/firebase';
import { ExpoProfileImageCapability } from '../infrastructure/profile/ExpoProfileImageCapability';
import { FirestoreProfileRepository } from '../infrastructure/profile/FirestoreProfileRepository';

export const profileCommands = new ProfileCommands(
  new FirestoreProfileRepository(firebaseAuth, firestoreDb),
  new ExpoProfileImageCapability(),
);
