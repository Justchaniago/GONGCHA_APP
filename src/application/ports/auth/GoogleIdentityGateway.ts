export interface GoogleIdentityGateway {
  configure(): void;
  signIn(): Promise<void>;
  linkCurrentAccount(): Promise<void>;
  signOut(): Promise<void>;
}
