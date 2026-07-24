import {
  EMPTY_PENDING_SUMMARY,
  applyPendingSummary,
  buildMemberData,
} from '../application/member/memberProjection';
import { MemberSessionController } from '../application/session/MemberSessionController';
import { isEligibleSession } from '../application/session/sessionRules';
import type { MemberRepository } from '../application/ports/member/MemberRepository';
import type { PendingMemberRepository } from '../application/ports/member/PendingMemberRepository';
import type { SessionGateway } from '../application/ports/session/SessionGateway';
import { runtimeConfig } from '../config/runtime';
import { FirebaseSessionGateway } from '../infrastructure/session/FirebaseSessionGateway';
import { useMemberSession as useMemberSessionController } from '../presentation/member/useMemberSession';

function buildSessionDependencies(): {
  session: SessionGateway;
  member: MemberRepository;
  pending: PendingMemberRepository;
} {
  if (runtimeConfig.mode === 'local_emulator') {
    const { firebaseLocalAuth } = require('../config/firebaseLocal');
    const { FastApiMemberRepository } = require(
      '../infrastructure/member/FastApiMemberRepository'
    );
    const { NoPendingMemberRepository } = require(
      '../infrastructure/member/NoPendingMemberRepository'
    );
    return {
      session: new FirebaseSessionGateway(firebaseLocalAuth),
      member: new FastApiMemberRepository(
        firebaseLocalAuth,
        runtimeConfig.backendBaseUrl,
      ),
      pending: new NoPendingMemberRepository(),
    };
  }
  const { firebaseAuth, firestoreDb } = require('../config/firebase');
  const { FirestoreMemberRepository } = require(
    '../infrastructure/member/FirestoreMemberRepository'
  );
  const { LegacyPendingMemberRepository } = require(
    '../infrastructure/member/LegacyPendingMemberRepository'
  );
  return {
    session: new FirebaseSessionGateway(firebaseAuth),
    member: new FirestoreMemberRepository(firestoreDb),
    pending: new LegacyPendingMemberRepository(),
  };
}

const dependencies = buildSessionDependencies();
const memberSessionController = new MemberSessionController(
  dependencies.session,
  dependencies.member,
  dependencies.pending,
  isEligibleSession,
  buildMemberData,
  applyPendingSummary,
  EMPTY_PENDING_SUMMARY,
);

export function useMemberSession() {
  return useMemberSessionController(memberSessionController);
}
