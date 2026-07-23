import {
  EMPTY_PENDING_SUMMARY,
  applyPendingSummary,
  buildMemberData,
} from '../application/member/memberProjection';
import { MemberSessionController } from '../application/session/MemberSessionController';
import { isEligibleSession } from '../application/session/sessionRules';
import { firebaseAuth, firestoreDb } from '../config/firebase';
import { FirestoreMemberRepository } from '../infrastructure/member/FirestoreMemberRepository';
import { LegacyPendingMemberRepository } from '../infrastructure/member/LegacyPendingMemberRepository';
import { FirebaseSessionGateway } from '../infrastructure/session/FirebaseSessionGateway';
import { useMemberSession as useMemberSessionController } from '../presentation/member/useMemberSession';

const memberSessionController = new MemberSessionController(
  new FirebaseSessionGateway(firebaseAuth),
  new FirestoreMemberRepository(firestoreDb),
  new LegacyPendingMemberRepository(),
  isEligibleSession,
  buildMemberData,
  applyPendingSummary,
  EMPTY_PENDING_SUMMARY,
);

export function useMemberSession() {
  return useMemberSessionController(memberSessionController);
}
