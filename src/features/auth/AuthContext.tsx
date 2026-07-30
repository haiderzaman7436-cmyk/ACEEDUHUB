// ============================================================================
// ACE Educational Hub — Authentication Context
// ============================================================================

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { AppUser, UserRole } from '@/types';


// ── Context Type ────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: AppUser | null;
  firebaseUser: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        try {
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const appUser: AppUser = {
              uid: fbUser.uid,
              email: fbUser.email || '',
              displayName: userData.displayName || fbUser.displayName || 'User',
              role: userData.role || 'manager',
              photoURL: userData.photoURL || fbUser.photoURL || undefined,
              phone: userData.phone,
              isActive: userData.isActive ?? true,
              createdAt: userData.createdAt?.toDate() || new Date(),
              lastLoginAt: new Date(),
            };
            setUser(appUser);

            // Update last login
            await updateDoc(doc(db, 'users', fbUser.uid), {
              lastLoginAt: serverTimestamp(),
            }).catch(() => {
              // Silently fail — non-critical
            });
          } else {
            // User document doesn't exist in Firestore
            // Create a default one (first-time setup scenario)
            const isManager = (fbUser.email || '').toLowerCase() === 'manager@school.com';
            const appUser: AppUser = {
              uid: fbUser.uid,
              email: fbUser.email || '',
              displayName: isManager ? 'School Manager' : (fbUser.displayName || 'Admin User'),
              role: isManager ? 'manager' : 'admin',
              photoURL: fbUser.photoURL || undefined,
              isActive: true,
              createdAt: new Date(),
              lastLoginAt: new Date(),
            };
            setUser(appUser);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          // Fallback user
          const isManager = (fbUser.email || '').toLowerCase() === 'manager@school.com';
          setUser({
            uid: fbUser.uid,
            email: fbUser.email || '',
            displayName: isManager ? 'School Manager' : (fbUser.displayName || 'Admin User'),
            role: isManager ? 'manager' : 'admin',
            isActive: true,
            createdAt: new Date(),
            lastLoginAt: new Date(),
          });
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      // Auto-provision manager@school.com and admin@school.com if they don't exist in auth yet
      const isManager = email.toLowerCase() === 'manager@school.com' && password === 'Manager@aceeduhub';
      const isAdmin = email.toLowerCase() === 'admin@school.com' && password === 'Admin@aceeduhub';
      
      if ((isManager || isAdmin) && (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential')) {
        try {
          const credential = await createUserWithEmailAndPassword(auth, email, password);
          const uid = credential.user.uid;
          const role = isManager ? 'manager' : 'admin';
          const displayName = isManager ? 'ACE School Manager' : 'ACE Administrator';
          
          await setDoc(doc(db, 'users', uid), {
            displayName,
            role,
            isActive: true,
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
          });
          setIsLoading(false);
          return;
        } catch (createErr) {
          console.error('Failed to auto-provision user:', createErr);
        }
      }
      setIsLoading(false);
      throw error;
    }
  };


  const logout = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setFirebaseUser(null);
  };

  const hasRole = (roles: UserRole[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
