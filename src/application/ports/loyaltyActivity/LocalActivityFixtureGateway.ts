export interface LocalActivityFixtureGateway {
  createForMember(uid: string): Promise<void>;
}
