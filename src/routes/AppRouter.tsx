// AppRouter â€” defines the full route tree for Phase 1â€“6.
//
// Route map:
//  /login           â†’ LoginPage          (public; redirects away if already signed in)
//  /employee/*      â†’ EmployeeDashboard  (requires auth + verified + any role)
//  /manager/*       â†’ ManagerDashboard   (requires auth + verified + MANAGER|SENIOR)
//  /profile         â†’ ProfilePage        (requires auth + verified; any role)
//  /                â†’ smart redirect based on role (or /login if not authed)
//  *                â†’ redirect to /
//
// Role-based redirect on root /:
//   MANAGER | SENIOR  â†’ /manager
//   EMPLOYEE          â†’ /employee
//   Not signed in     â†’ /login

import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';
import ProtectedRoute from './ProtectedRoute';
import LoginPage from '../pages/LoginPage';
import EmployeeDashboardPage from '../pages/employee/DashboardPage';
import EmployeeVisitDetailPage from '../pages/employee/VisitDetailPage';
import ManagerDashboardPage from '../pages/manager/DashboardPage';
import ManagerVisitDetailPage from '../pages/manager/EmployeeDetailPage';
import ManagerExportPage from '../pages/manager/ExportPage';
import TeamPage from '../pages/manager/TeamPage';
import UserManagementPage from '../pages/manager/UserManagementPage';
import AssignEmployeesPage from '../pages/manager/AssignEmployeesPage';
import TeamHierarchyPage from '../pages/manager/TeamHierarchyPage';
import ProfilePage from '../pages/ProfilePage';

// â”€â”€ Root redirect â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Decides where an authenticated user lands when they hit "/".

function RootRedirect() {
  const { firebaseUser, appUser, loading } = useAuth();

  if (loading) return <LoadingSpinner message="Loadingâ€¦" />;

  if (!firebaseUser || !firebaseUser.emailVerified) {
    return <Navigate to="/login" replace />;
  }

  const role = appUser?.role ?? 'EMPLOYEE';
  if (role === 'MANAGER' || role === 'SENIOR') {
    return <Navigate to="/manager" replace />;
  }
  return <Navigate to="/employee" replace />;
}

// â”€â”€ Public-only route â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Redirects away from /login if the user is already authenticated + verified.

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { firebaseUser, appUser, loading } = useAuth();

  if (loading) return <LoadingSpinner message="Loadingâ€¦" />;

  if (firebaseUser?.emailVerified) {
    const role = appUser?.role ?? 'EMPLOYEE';
    return (
      <Navigate
        to={role === 'MANAGER' || role === 'SENIOR' ? '/manager' : '/employee'}
        replace
      />
    );
  }

  return <>{children}</>;
}

// â”€â”€ Router â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function AppRouter() {
  return (
    <Routes>
      {/* Public */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      {/* Employee routes â€” any authenticated + verified user */}
      <Route element={<ProtectedRoute />}>
        <Route path="/employee"            element={<EmployeeDashboardPage />} />
        <Route path="/employee/visits/:id" element={<EmployeeVisitDetailPage />} />
        <Route path="/profile"             element={<ProfilePage />} />
      </Route>

      {/* Manager routes â€” MANAGER or SENIOR only */}
      <Route element={<ProtectedRoute allowedRoles={['MANAGER', 'SENIOR']} />}>
        <Route path="/manager"            element={<ManagerDashboardPage />} />
        <Route path="/manager/visits/:id" element={<ManagerVisitDetailPage />} />
        <Route path="/manager/export"     element={<ManagerExportPage />} />
      </Route>

      {/* Team Management routes -- MANAGER only */}
      <Route element={<ProtectedRoute allowedRoles={['MANAGER']} />}>
        <Route path="/manager/team"            element={<TeamPage />} />
        <Route path="/manager/team/users"      element={<UserManagementPage />} />
        <Route path="/manager/team/assign"     element={<AssignEmployeesPage />} />
        <Route path="/manager/team/hierarchy"  element={<TeamHierarchyPage />} />
      </Route>

      {/* Root redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

