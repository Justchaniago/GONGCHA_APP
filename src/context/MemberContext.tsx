import React, { createContext, useContext, useEffect, useState } from 'react';
import { onIdTokenChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../config/firebase';
import { UserVoucher, XpHistoryEntry } from '../types/types';
import { TransactionService, type PendingTransactionSummary } from '../services/TransactionService';

export interface MemberData {
  uid: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  points: number;
  pendingPoints: number;
  tierXp: number;
  tier: 'Silver' | 'Gold' | 'Platinum';
  photoURL?: string;
  joinDate?: string;
  vouchers?: UserVoucher[];
  xpHistory?: XpHistoryEntry[];
  profileComplete?: boolean;
  currentPoints: number;
  lifetimePoints: number;
}

export interface MemberCardAnchor {
  x: number;
  y: number;
  size: number;
}

interface MemberContextType {
  member: MemberData | null;
  loading: boolean;
  isAuthenticated: boolean;
  isCardVisible: boolean;
  anchor: MemberCardAnchor | null;
  showCard: (nextAnchor?: MemberCardAnchor) => void;
  hideCard: () => void;
}

const MemberContext = createContext<MemberContextType>({
  member: null,
  loading: true,
  isAuthenticated: false,
  isCardVisible: false,
  anchor: null,
  showCard: () => {},
  hideCard: () => {},
});

export const MemberProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [member, setMember] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCardVisible, setIsCardVisible] = useState(false);
  const [anchor, setAnchor] = useState<MemberCardAnchor | null>(null);

  useEffect(() => {
    let unsubscribeDoc: (() => void) | undefined;
    let unsubscribePendingSummary: (() => void) | undefined;
    let authUnsubscribed = false;
    let latestPendingSummary: PendingTransactionSummary = {
      loaded: false,
      pendingCount: 0,
      pendingPoints: 0,
    };

    const buildMemberData = (user: any, data?: any): MemberData => {
      if (!data) {
        return {
          uid: user.uid,
          fullName: user.displayName ?? 'Member',
          email: user.email ?? '',
          phoneNumber: user.phoneNumber ?? '',
          points: 0,
          pendingPoints: 0,
          tierXp: 0,
          tier: 'Silver',
          photoURL: user.photoURL ?? '',
          joinDate: '',
          vouchers: [],
          xpHistory: [],
          profileComplete: false,
          currentPoints: 0,
          lifetimePoints: 0,
        };
      }

      const resolvedCurrentPoints = data.currentPoints ?? data.points ?? 0;
      const rawPendingPoints = data.pendingPoints ?? 0;
      const resolvedTierXp = data.tierXp ?? data.lifetimePoints ?? data.xp ?? 0;
      const resolvedLifetimePoints = data.lifetimePoints ?? data.tierXp ?? data.xp ?? 0;
      const resolvedTier = data.tier === 'Gold' || data.tier === 'Platinum' ? data.tier : 'Silver';
      const reconciledPendingPoints = latestPendingSummary.loaded
        ? latestPendingSummary.pendingCount === 0
          ? 0
          : Math.max(0, Math.min(rawPendingPoints, latestPendingSummary.pendingPoints || rawPendingPoints))
        : rawPendingPoints;

      return {
        uid: user.uid,
        fullName: data.fullName ?? data.name ?? 'Member',
        email: data.email ?? user.email ?? '',
        phoneNumber: data.phoneNumber ?? data.phone ?? '',
        points: resolvedCurrentPoints,
        pendingPoints: reconciledPendingPoints,
        tierXp: resolvedTierXp,
        tier: resolvedTier,
        photoURL: data.photoURL ?? '',
        joinDate: data.joinDate ?? data.joinedDate ?? '',
        vouchers: data.vouchers ?? data.activeVouchers ?? [],
        xpHistory: data.xpHistory ?? [],
        profileComplete: typeof data.profileComplete === 'boolean' ? data.profileComplete : false,
        currentPoints: resolvedCurrentPoints,
        lifetimePoints: resolvedLifetimePoints,
      };
    };

    const unsubscribeAuth = onIdTokenChanged(firebaseAuth, (user) => {
      if (authUnsubscribed) return;

      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = undefined;
      }
      if (unsubscribePendingSummary) {
        unsubscribePendingSummary();
        unsubscribePendingSummary = undefined;
      }
      latestPendingSummary = {
        loaded: false,
        pendingCount: 0,
        pendingPoints: 0,
      };

      const isUnverifiedEmailUser =
        user &&
        user.providerData.some((provider) => provider.providerId === 'password') &&
        !user.emailVerified;

      if (user && !isUnverifiedEmailUser) {
        setLoading(true);

        const memberRef = doc(firestoreDb, 'users', user.uid);
        unsubscribeDoc = onSnapshot(
          memberRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              setMember(buildMemberData(user, data));
            } else {
              setMember(buildMemberData(user));
            }
            setLoading(false);
          },
          (error) => {
            console.error('Snapshot error:', error);
            setLoading(false);
          },
        );

        unsubscribePendingSummary = TransactionService.subscribeToPendingTransactionSummary(user.uid, (summary) => {
          latestPendingSummary = summary;
          setMember((currentMember) => {
            if (!currentMember) {
              return currentMember;
            }

            const nextPendingPoints = summary.pendingCount === 0
              ? 0
              : Math.max(0, Math.min(currentMember.pendingPoints ?? 0, summary.pendingPoints || currentMember.pendingPoints));

            if (nextPendingPoints === currentMember.pendingPoints) {
              return currentMember;
            }

            return {
              ...currentMember,
              pendingPoints: nextPendingPoints,
            };
          });
        });
      } else {
        setMember(null);
        setLoading(false);
      }
    });

    return () => {
      authUnsubscribed = true;
      if (unsubscribeDoc) unsubscribeDoc();
      if (unsubscribePendingSummary) unsubscribePendingSummary();
      unsubscribeAuth();
    };
  }, []);

  const showCard = (nextAnchor?: MemberCardAnchor) => {
    if (nextAnchor) setAnchor(nextAnchor);
    setIsCardVisible(true);
  };

  const hideCard = () => setIsCardVisible(false);

  return (
    <MemberContext.Provider
      value={{
        member,
        loading,
        isAuthenticated: !!member,
        isCardVisible,
        anchor,
        showCard,
        hideCard,
      }}
    >
      {children}
    </MemberContext.Provider>
  );
};

export const useMember = () => {
  const context = useContext(MemberContext);
  if (context === undefined) throw new Error('useMember harus di dalam MemberProvider');
  return context;
};

export const useMemberCard = useMember;
