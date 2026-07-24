import type { MemberRepository } from '../ports/member/MemberRepository';
import type { PendingMemberRepository } from '../ports/member/PendingMemberRepository';
import type { SessionGateway } from '../ports/session/SessionGateway';
import type {
  LegacyMemberDocument,
  MemberData,
  PendingMemberSummary,
} from '../member/MemberData';
import type { SessionIdentity, SessionPhase } from './Session';

export interface MemberSessionState {
  phase: SessionPhase;
  member: MemberData | null;
}

export type ProjectMember = (
  identity: SessionIdentity,
  document: LegacyMemberDocument | null,
  pendingSummary: PendingMemberSummary,
) => MemberData;

export type ApplyPendingSummary = (
  member: MemberData,
  summary: PendingMemberSummary,
) => MemberData;

export class MemberSessionController {
  private state: MemberSessionState = {
    phase: 'restoring',
    member: null,
  };
  private readonly listeners = new Set<(state: MemberSessionState) => void>();
  private readonly sessionGateway: SessionGateway;
  private readonly memberRepository: MemberRepository;
  private readonly pendingRepository: PendingMemberRepository;
  private readonly isEligible: (identity: SessionIdentity) => boolean;
  private readonly projectMember: ProjectMember;
  private readonly applyPending: ApplyPendingSummary;
  private readonly emptyPendingSummary: PendingMemberSummary;
  private sessionUnsubscribe: (() => void) | null = null;
  private memberUnsubscribe: (() => void) | null = null;
  private pendingUnsubscribe: (() => void) | null = null;
  private sessionGeneration = 0;
  private generation = 0;
  private latestPendingSummary: PendingMemberSummary;
  private currentIdentity: SessionIdentity | null = null;

  constructor(
    sessionGateway: SessionGateway,
    memberRepository: MemberRepository,
    pendingRepository: PendingMemberRepository,
    isEligible: (identity: SessionIdentity) => boolean,
    projectMember: ProjectMember,
    applyPending: ApplyPendingSummary,
    emptyPendingSummary: PendingMemberSummary,
  ) {
    this.sessionGateway = sessionGateway;
    this.memberRepository = memberRepository;
    this.pendingRepository = pendingRepository;
    this.isEligible = isEligible;
    this.projectMember = projectMember;
    this.applyPending = applyPending;
    this.emptyPendingSummary = emptyPendingSummary;
    this.latestPendingSummary = { ...emptyPendingSummary };
  }

  getState(): MemberSessionState {
    return this.state;
  }

  observe(listener: (state: MemberSessionState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    if (this.listeners.size === 1) {
      this.start();
    }

    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.stop();
      }
    };
  }

  refreshMember(): Promise<void> {
    const identity = this.currentIdentity;
    if (!identity || !this.isEligible(identity)) {
      return Promise.reject(new Error('member_refresh_unauthenticated'));
    }

    const previousState = this.state;
    const generation = ++this.generation;
    this.stopMemberObservers();
    this.latestPendingSummary = { ...this.emptyPendingSummary };

    return new Promise((resolve, reject) => {
      let settled = false;
      const timeout = setTimeout(() => {
        fail(new Error('member_refresh_timeout'));
      }, 10_000);

      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (error) reject(error);
        else resolve();
      };

      const fail = (error: Error) => {
        if (generation === this.generation) {
          this.generation += 1;
          this.stopMemberObservers();
          this.publish(previousState);
        }
        finish(error);
      };

      this.memberUnsubscribe = this.memberRepository.observe(
        identity.uid,
        (document) => {
          if (generation !== this.generation) return;
          const member = this.projectMember(
            identity,
            document,
            this.latestPendingSummary,
          );
          if (!member.profileComplete) {
            fail(new Error('member_refresh_not_converged'));
            return;
          }
          this.publish({ phase: 'ready', member });
          finish();
        },
        () => fail(new Error('member_refresh_failed')),
      );
      this.pendingUnsubscribe = this.pendingRepository.observe(
        identity.uid,
        (summary) => {
          if (generation === this.generation) {
            this.latestPendingSummary = summary;
          }
        },
      );
    });
  }

  private start() {
    const sessionGeneration = ++this.sessionGeneration;
    this.publish({ phase: 'restoring', member: null });
    this.sessionUnsubscribe = this.sessionGateway.observe(
      (identity) => {
        if (sessionGeneration === this.sessionGeneration) {
          this.handleIdentity(identity);
        }
      },
      () => {
        if (sessionGeneration === this.sessionGeneration) {
          this.handleSessionError();
        }
      },
    );
  }

  private stop() {
    this.sessionGeneration += 1;
    this.generation += 1;
    this.stopMemberObservers();
    this.sessionUnsubscribe?.();
    this.sessionUnsubscribe = null;
    this.currentIdentity = null;
    this.state = { phase: 'restoring', member: null };
  }

  private handleIdentity(identity: SessionIdentity | null) {
    this.currentIdentity = identity;
    const generation = ++this.generation;
    this.stopMemberObservers();
    this.latestPendingSummary = { ...this.emptyPendingSummary };

    if (!identity || !this.isEligible(identity)) {
      this.publish({ phase: 'anonymous', member: null });
      return;
    }

    this.publish({ phase: 'loading-member', member: null });
    this.memberUnsubscribe = this.memberRepository.observe(
      identity.uid,
      (document) => {
        if (generation !== this.generation) {
          return;
        }
        const member = this.projectMember(
          identity,
          document,
          this.latestPendingSummary,
        );
        this.publish({
          phase: member.profileComplete ? 'ready' : 'needs-profile',
          member,
        });
      },
      () => {
        if (generation === this.generation) {
          this.handleMemberError();
        }
      },
    );
    this.pendingUnsubscribe = this.pendingRepository.observe(
      identity.uid,
      (summary) => {
        if (generation !== this.generation) {
          return;
        }
        this.latestPendingSummary = summary;
        if (this.state.member) {
          const member = this.applyPending(this.state.member, summary);
          this.publish({
            phase: member.profileComplete ? 'ready' : 'needs-profile',
            member,
          });
        }
      },
    );
  }

  private handleSessionError() {
    this.currentIdentity = null;
    this.generation += 1;
    this.stopMemberObservers();
    this.publish({ phase: 'error', member: null });
  }

  private handleMemberError() {
    this.generation += 1;
    this.stopMemberObservers();
    this.publish({ phase: 'error', member: null });
  }

  private stopMemberObservers() {
    this.memberUnsubscribe?.();
    this.pendingUnsubscribe?.();
    this.memberUnsubscribe = null;
    this.pendingUnsubscribe = null;
  }

  private publish(state: MemberSessionState) {
    this.state = state;
    this.listeners.forEach((listener) => listener(state));
  }
}
