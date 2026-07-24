import type { LocalActivityFixtureGateway } from '../ports/loyaltyActivity/LocalActivityFixtureGateway';

type RefreshActivity = () => Promise<void>;
type IsIdentityCurrent = (uid: string) => boolean;

export class LoadLocalActivityFixture {
  private readonly gateway: LocalActivityFixtureGateway;
  private readonly refreshActivity: RefreshActivity;
  private readonly isIdentityCurrent: IsIdentityCurrent;
  private inFlight: Promise<void> | null = null;
  private inFlightUid: string | null = null;

  constructor(
    gateway: LocalActivityFixtureGateway,
    refreshActivity: RefreshActivity,
    isIdentityCurrent: IsIdentityCurrent,
  ) {
    this.gateway = gateway;
    this.refreshActivity = refreshActivity;
    this.isIdentityCurrent = isIdentityCurrent;
  }

  execute(uid: string): Promise<void> {
    if (!uid) {
      return Promise.reject(new Error('local_activity_fixture_identity_required'));
    }
    if (this.inFlight) {
      if (this.inFlightUid !== uid) {
        return Promise.reject(
          new Error('local_activity_fixture_identity_changed'),
        );
      }
      return this.inFlight;
    }

    const request = this.createAndRefresh(uid);
    this.inFlight = request;
    this.inFlightUid = uid;
    const clear = () => {
      if (this.inFlight === request) {
        this.inFlight = null;
        this.inFlightUid = null;
      }
    };
    void request.then(clear, clear);
    return request;
  }

  private async createAndRefresh(uid: string): Promise<void> {
    this.assertIdentityCurrent(uid);
    await this.gateway.createForMember(uid);
    this.assertIdentityCurrent(uid);
    await this.refreshActivity();
    this.assertIdentityCurrent(uid);
  }

  private assertIdentityCurrent(uid: string): void {
    if (!this.isIdentityCurrent(uid)) {
      throw new Error('local_activity_fixture_identity_changed');
    }
  }
}
