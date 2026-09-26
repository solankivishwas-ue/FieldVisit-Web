// AppRouter — defines the full route tree for Phase 1–6.
//
// Route map:
//  /login           → LoginPage          (public; redirects away if already signed in)
//  /employee/*      → EmployeeDashboard  (requires auth + verified + EMPLOYEE)
//  /manager/*       → ManagerDashboard   (requires auth + verified + MANAGER|SENIOR)
//  /profile         → ProfilePage        (requires auth + verified; any role)
//  /                → smart redirect based on role (or /login if not authed)
//  *                → redirect to /
//
// Role-based redirect on root /:
//   MANAGER | SENIOR  → /manager
//   EMPLOYEE          → /employee
//   Not signed in     → /login

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
import MigratePage from '../pages/manager/MigratePage';
import FixAssignmentIdsPage from '../pages/manager/FixAssignmentIdsPage';
import CleanupSeniorIdPage from '../pages/manager/CleanupSeniorIdPage';
import VerificationPage from '../pages/manager/VerificationPage';
import ProfilePage from '../pages/ProfilePage';

// —— Root redirect ————————————————————————————————————————————————————————————
// Decides where an authenticated user lands when they hit "/".

function RootRedirect() {
  const { firebaseUser, appUser, loading } = useAuth();

  if (loading) return <LoadingSpinner message="Loading…" />;

  if (!firebaseUser || !firebaseUser.emailVerified) {
    return <Navigate to="/login" replace />;
  }

  const role = appUser?.role ?? 'EMPLOYEE';
  if (role === 'MANAGER' || role === 'SENIOR') {
    return <Navigate to="/manager" replace />;
  }
  return <Navigate to="/employee" replace />;
}

// —— Public-only route ————————————————————————————————————————————————————————
// Redirects away from /login if the user is already authenticated + verified.

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { firebaseUser, appUser, loading } = useAuth();

  if (loading) return <LoadingSpinner message="Loading…" />;

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

// —— Router ———————————————————————————————————————————————————————————————————

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

      {/* Shared routes - any authenticated user */}
      <Route element={<ProtectedRoute />}>
        <Route path="/profile"             element={<ProfilePage />} />
      </Route>

      {/* Employee routes - EMPLOYEE only */}
      <Route element={<ProtectedRoute allowedRoles={['EMPLOYEE']} />}>
        <Route path="/employee"            element={<EmployeeDashboardPage />} />
        <Route path="/employee/visits/:id" element={<EmployeeVisitDetailPage />} />
      </Route>

      {/* Manager routes — MANAGER or SENIOR only */}
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
        <Route path="/manager/migrate"            element={<MigratePage />} />
        <Route path="/manager/fix-assignment-ids"  element={<FixAssignmentIdsPage />} />
        <Route path="/manager/cleanup-senior-id"   element={<CleanupSeniorIdPage />} />
        <Route path="/manager/verify"              element={<VerificationPage />} />
      </Route>

      {/* Root redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
