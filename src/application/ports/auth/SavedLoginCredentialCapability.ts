export interface SavedLoginCredentials {
  email: string;
  password: string;
}

export interface SavedLoginCredentialCapability {
  isAvailable(): Promise<boolean>;
  hasSavedCredentials(): Promise<boolean>;
  saveCredentials(email: string, password: string): Promise<void>;
  getCredentials(): Promise<SavedLoginCredentials | null>;
  clearCredentials(): Promise<void>;
  authenticate(promptMessage?: string): Promise<boolean>;
}
