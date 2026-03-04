import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, onIdTokenChanged } from 'firebase/auth'; // 🔥 Use onIdTokenChanged for email verif updates
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
  profileComplete?: boolean;
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

const MemberContext = createContext<MemberContextType>({
  member: null,
  loading: true,
  isAuthenticated: false,
  isCardVisible: false,
  anchor: null,
  showCard: () => {},
  hideCard: () => {},
});

// export const useMember = () => useContext(MemberContext); // Already defined below

export const MemberProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [member, setMember] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCardVisible, setIsCardVisible] = useState(false);
  const [anchor, setAnchor] = useState<MemberCardAnchor | null>(null);

  useEffect(() => {
    // Unsubscribe function for doc listener
    let unsubscribeDoc: (() => void) | undefined;
    let authUnsubscribed = false;

    // 🔥 GANTI: Pakai onIdTokenChanged, bukan onAuthStateChanged
    // onAuthStateChanged tidak mentrigger ulang saat 'user.reload()' dipanggil (untuk refresh status emailVerified)
    // onIdTokenChanged mentrigger saat token direfresh, yang terjadi saat user.reload()
    const unsubscribeAuth = onIdTokenChanged(firebaseAuth, (user) => {
      if (authUnsubscribed) return;

      // Reset state if user changes
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = undefined;
      }

      // 🚦 BLOCK: Jika user baru daftar dengan email tapi belum verifikasi, anggap sebagai belum login.
      // Ini mencegah AppNavigator berpindah ke ProfileCompletion, sehingga WelcomeScreen tetap aktif untuk menampilkan UI "Cek Email".
      const isUnverifiedEmailUser = user && user.providerData.some(p => p.providerId === 'password') && !user.emailVerified;

      if (user && !isUnverifiedEmailUser) {
        setLoading(true); // Set loading true while fetching doc
        const memberRef = doc(firestoreDb, "users", user.uid);
        
        unsubscribeDoc = onSnapshot(memberRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const memberData = {
              uid: user.uid,
              fullName: data.fullName || data.name || 'Member',
              email: data.email || user.email || '',
              phoneNumber: data.phoneNumber || '',
              points: data.currentPoints || data.points || 0,
              tierXp: data.tierXp || data.points || 0,
              tier: data.tier || 'Silver',
              photoURL: data.photoURL || '',
              joinDate: data.joinDate || '',
              vouchers: data.vouchers || [],
              profileComplete: typeof data.profileComplete === 'boolean' ? data.profileComplete : false,
            };
            setMember(memberData);
          } else {
            // Document creation might be delayed
            setMember({
              uid: user.uid,
              fullName: user.displayName || 'Member',
              email: user.email || '',
              phoneNumber: '',
              points: 0,
              tierXp: 0,
              tier: 'Silver',
              joinDate: '',
              vouchers: [],
              profileComplete: false, 
            });
          }
          setLoading(false);
        }, (error) => {
          console.error("Snapshot error:", error);
          setLoading(false);
        });
      } else {
        // User is null OR User is unverified email user
        setMember(null);
        setLoading(false);
      }
    });

    return () => {
      authUnsubscribed = true;
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