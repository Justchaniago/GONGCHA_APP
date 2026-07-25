import {
  EMPTY_PENDING_SUMMARY,
  applyPendingSummary,
  buildMemberData,
} from '../application/member/memberProjection';
import { MemberSessionController } from '../application/session/MemberSessionController';
import {
  isEligibleLocalEmulatorSession,
  isEligibleSession,
} from '../application/session/sessionRules';
import type { MemberRepository } from '../application/ports/member/MemberRepository';
import type { PendingMemberRepository } from '../application/ports/member/PendingMemberRepository';
import type { SessionGateway } from '../application/ports/session/SessionGateway';
import { runtimeConfig } from '../config/runtime';
import { FirebaseSessionGateway } from '../infrastructure/session/FirebaseSessionGateway';
import { useMemberSession as useMemberSessionController } from '../presentation/member/useMemberSession';
import { USE_FASTAPI_BACKEND, FASTAPI_BASE_URL } from '../config/flags';

function buildSessionDependencies(): {
  session: SessionGateway;
  member: MemberRepository;
  pending: PendingMemberRepository;
} {
  if (USE_FASTAPI_BACKEND) {
    const { firebaseAuth } = require('../config/firebase');
    const { FastApiMemberRepository } = require(
      '../infrastructure/member/FastApiMemberRepository'
    );
    const { NoPendingMemberRepository } = require(
      '../infrastructure/member/NoPendingMemberRepository'
    );
    return {
      session: new FirebaseSessionGateway(firebaseAuth),
      member: new FastApiMemberRepository(
        firebaseAuth,
        FASTAPI_BASE_URL,
      ),
      pending: new NoPendingMemberRepository(),
    };
  }
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
  (runtimeConfig.mode === 'local_emulator' || USE_FASTAPI_BACKEND)
    ? isEligibleLocalEmulatorSession
    : isEligibleSession,
  buildMemberData,
  applyPendingSummary,
  EMPTY_PENDING_SUMMARY,
);

export function useMemberSession() {
  return useMemberSessionController(memberSessionController);
}

export function refreshMemberSession() {
  return memberSessionController.refreshMember();
}
