import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

interface MemberData {
  uid: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  points: number;
  tier: 'Silver' | 'Gold' | 'Platinum';
  photoURL?: string;
  createdAt?: any;
}

interface MemberContextType {
  member: MemberData | null;
  loading: boolean;
  isAuthenticated: boolean;
}

const MemberContext = createContext<MemberContextType | undefined>(undefined);

export const MemberProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [member, setMember] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Monitor status login Firebase
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // 2. Jika login, dengarkan perubahan data di Firestore secara REALTIME
        // Ini memastikan poin di App langsung berubah saat Kasir melakukan transaksi
        const memberRef = doc(db, "users", user.uid);
        
        const unsubscribeDoc = onSnapshot(memberRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setMember({
              uid: user.uid,
              fullName: data.fullName || 'Member',
              email: data.email || user.email,
              phoneNumber: data.phoneNumber || '',
              points: data.points || 0,
              tier: data.tier || 'Silver',
              photoURL: data.photoURL || '',
            });
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching member data:", error);
          setLoading(false);
        });

        return () => unsubscribeDoc();
      } else {
        setMember(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  return (
    <MemberContext.Provider value={{ member, loading, isAuthenticated: !!member }}>
      {children}
    </MemberContext.Provider>
  );
};

export const useMember = () => {
  const context = useContext(MemberContext);
  if (context === undefined) {
    throw new Error('useMember harus digunakan di dalam MemberProvider');
  }
  return context;
};