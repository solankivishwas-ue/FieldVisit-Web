// ProtectedRoute — wraps routes that require authentication.
//
// Behaviour:
//  • While auth is still resolving   → show LoadingSpinner (prevents flicker-redirect)
//  • Signed out                       → redirect to /login
//  • Signed in but email unverified   → redirect to /login (LoginPage shows a banner)
//  • Signed in, verified, wrong role  → redirect to /login (optional role gate)
//  • All checks pass                  → render children

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
  /**
   * If provided, only users with one of these roles can access the route.
   * Leave undefined to allow any authenticated+verified user.
   */
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { firebaseUser, appUser, loading } = useAuth();

  // 1. Still resolving Firebase Auth state on first load
  if (loading) {
    return <LoadingSpinner message="Loading…" />;
  }

  // 2. Not signed in at all
  if (!firebaseUser) {
    return <Navigate to="/login" replace />;
  }

  // 3. Signed in but email not verified
  //    The Android app enforces this too — we mirror that behaviour.
  if (!firebaseUser.emailVerified) {
    // Navigate back to /login; LoginPage detects the unverified state
    // via location.state and shows the verification banner.
    return <Navigate to="/login" state={{ unverified: true }} replace />;
  }

  // 4. Role gate (optional)
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = appUser?.role ?? 'EMPLOYEE';
    if (!allowedRoles.includes(userRole)) {
      // Redirect to the appropriate home page instead of login
      return <Navigate to="/" replace />;
    }
  }

  // 5. All checks pass — render the nested route
  return <Outlet />;
}
