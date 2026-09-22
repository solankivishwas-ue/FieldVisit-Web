// AuthContext — provides the current user + role to the entire component tree.
//
// Strategy (mirrors Android AuthRepositoryImpl):
//  1. Subscribe to Firebase Auth's onAuthStateChanged.
//  2. When a FirebaseUser arrives, fetch their Firestore `users/{uid}` doc to
//     get the role (which only Firestore knows — Auth doesn't store it).
//  3. Expose { appUser, firebaseUser, loading } to consumers.
//
// `loading` is true only during the initial cold-start check; subsequent
// sign-in and sign-out transitions happen synchronously from the listener.

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '../firebase/config';
import { getUserDoc } from '../services/users.service';
import type { AppUser } from '../types';

// ── Context shape ─────────────────────────────────────────────────────────────

interface AuthContextValue {
  /** Firebase Auth user (for uid, email, emailVerified, etc.). Null when signed out. */
  firebaseUser: FirebaseUser | null;
  /** Firestore user document with role etc. Null when signed out OR if doc not yet fetched. */
  appUser: AppUser | null;
  /** True only during initial auth-state resolution on first load. */
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        // Fetch Firestore profile to get role + display name.
        // If the doc doesn't exist (e.g. deleted account) we still allow
        // the Auth session — ProtectedRoute and login logic will handle it.
        try {
          const profile = await getUserDoc(fbUser.uid);
          setAppUser(profile);
        } catch {
          // Firestore unreachable — fall back to a minimal user object.
          setAppUser({
            uid: fbUser.uid,
            name: fbUser.displayName ?? '',
            email: fbUser.email ?? '',
            phoneNumber: '',
            role: 'EMPLOYEE',
            createdAt: 0,
          });
        }
      } else {
        setAppUser(null);
      }

      setLoading(false);
    });

    return unsubscribe; // onAuthStateChanged returns its unsubscribe fn directly
  }, []);

  return (
    <AuthContext.Provider value={{ firebaseUser, appUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Consume AuthContext. Must be used inside <AuthProvider>.
 * Throws at development time if used outside the provider.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an <AuthProvider>.');
  }
  return ctx;
}

