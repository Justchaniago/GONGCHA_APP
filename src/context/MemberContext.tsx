import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { firebaseAuth, firestoreDb } from '../config/firebase';

// 🔥 IMPORT TIPE VOUCHER DARI TYPES
import { UserVoucher } from '../types/types';

interface MemberData {
  uid: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  points: number;
  tierXp: number;
  tier: 'Silver' | 'Gold' | 'Platinum';
  photoURL?: string;
  joinDate?: string;
  vouchers?: UserVoucher[]; // 🔥 TAMBAHKAN INI AGAR TYPESCRIPT TIDAK ERROR
}

export interface MemberCardAnchor {
  x: number; y: number; size: number;
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

const MemberContext = createContext<MemberContextType | undefined>(undefined);

export const MemberProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [member, setMember] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCardVisible, setIsCardVisible] = useState(false);
  const [anchor, setAnchor] = useState<MemberCardAnchor | null>(null);

  useEffect(() => {
    let unsubscribeDoc: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(firebaseAuth, (user) => {
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = undefined;
      }

      if (user) {
        const memberRef = doc(firestoreDb, "users", user.uid);
        unsubscribeDoc = onSnapshot(memberRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setMember({
              uid: user.uid,
              fullName: data.fullName || data.name || 'Member',
              email: data.email || user.email || '',
              phoneNumber: data.phoneNumber || '',
              points: data.currentPoints || data.points || 0,
              tierXp: data.tierXp || data.points || 0,
              tier: data.tier || 'Silver',
              photoURL: data.photoURL || '',
              joinDate: data.joinDate || '',
              vouchers: data.vouchers || [], // 🔥 PASTIKAN VOUCHER DIAMBIL DARI FIRESTORE
            });
          } else {
            setMember({
              uid: user.uid, 
              fullName: user.displayName || 'Member',
              email: user.email || '', 
              phoneNumber: '', 
              points: 0, 
              tierXp: 0, 
              tier: 'Silver', 
              joinDate: '',
              vouchers: [], // 🔥 DEFAULT ARRAY KOSONG
            });
          }
          setLoading(false);
        }, (error) => {
          console.error("Snapshot error:", error);
          setLoading(false);
        });
      } else {
        setMember(null);
        setLoading(false);
      }
    });

    return () => {
      if (unsubscribeDoc) unsubscribeDoc();
      unsubscribeAuth();
    };
  }, []);

  const showCard = (nextAnchor?: MemberCardAnchor) => {
    if (nextAnchor) setAnchor(nextAnchor);
    setIsCardVisible(true);
  };
  const hideCard = () => setIsCardVisible(false);

  return (
    <MemberContext.Provider value={{ 
      member, loading, isAuthenticated: !!member,
      isCardVisible, anchor, showCard, hideCard 
    }}>
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