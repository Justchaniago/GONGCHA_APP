import React, { createContext, useContext, useState } from 'react';

import type { MemberData } from '../application/member/MemberData';
import type { SessionPhase } from '../application/session/Session';
import { useMemberSession } from '../composition/member';

export type { MemberData } from '../application/member/MemberData';

export interface MemberCardAnchor {
  x: number;
  y: number;
  size: number;
}

interface MemberContextType {
  member: MemberData | null;
  loading: boolean;
  isAuthenticated: boolean;
  sessionPhase: SessionPhase;
  isCardVisible: boolean;
  anchor: MemberCardAnchor | null;
  showCard: (nextAnchor?: MemberCardAnchor) => void;
  hideCard: () => void;
}

const MemberContext = createContext<MemberContextType>({
  member: null,
  loading: true,
  isAuthenticated: false,
  sessionPhase: 'restoring',
  isCardVisible: false,
  anchor: null,
  showCard: () => {},
  hideCard: () => {},
});

export const MemberProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { phase, member } = useMemberSession();
  const [isCardVisible, setIsCardVisible] = useState(false);
  const [anchor, setAnchor] = useState<MemberCardAnchor | null>(null);

  const loading =
    phase === 'restoring' ||
    phase === 'loading-member' ||
    phase === 'error';
  const isAuthenticated = phase === 'needs-profile' || phase === 'ready';

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
        isAuthenticated,
        sessionPhase: phase,
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
  if (context === undefined)
    throw new Error('useMember harus di dalam MemberProvider');
  return context;
};

export const useMemberCard = useMember;
