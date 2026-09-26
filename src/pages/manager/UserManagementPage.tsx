// User Management Page -- Manager only.
// Lists all users; Manager can promote Employee->Senior or demote Senior->Employee.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../../components/NavBar';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorBoundary from '../../components/ErrorBoundary';
import { getAllUsers, updateUserRole } from '../../services/users.service';
import type { AppUser, UserRole } from '../../types';

const ROLE_BADGE: Record<UserRole, { label: string; className: string }> = {
  EMPLOYEE: { label: 'Employee', className: 'bg-blue-100 text-blue-700' },
  SENIOR:   { label: 'Senior',   className: 'bg-purple-100 text-purple-700' },
  MANAGER:  { label: 'Manager',  className: 'bg-indigo-100 text-indigo-700' },
};

function UserAvatar({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials =
    parts.length === 0 ? '?' :
    parts.length === 1 ? parts[0]!.charAt(0).toUpperCase() :
    (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
  return (
    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
      <span className="text-sm font-bold text-indigo-600 dark:text-indigo-300">{initials}</span>
    </div>
  );
}

export default function UserManagementPage() {
  const navigate = useNavigate();
  const [users,    setUsers]    = useState<AppUser[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getAllUsers()
      .then(setUsers)
      .catch(() => setError('Failed to load users. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleRoleChange(user: AppUser, newRole: UserRole) {
    if (user.role === 'MANAGER') return;
    setUpdating(user.uid);
    try {
      await updateUserRole(user.uid, newRole);
      setUsers((prev) =>
        prev.map((u) => u.uid === user.uid ? { ...u, role: newRole } : u),
      );
    } catch {
      setError('Failed to update role. Please try again.');
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <ErrorBoundary>
        <NavBar title="User Management" />
      </ErrorBoundary>
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <button
          type="button"
          onClick={() => navigate('/manager/team')}
          className="flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Team Management
        </button>

        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">User Management</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">View all users and manage their roles.</p>

        {loading && <LoadingSpinner message="Loading users…" />}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        {!loading && !error && (
          <ul className="space-y-3">
            {users.map((user) => {
              const badge = ROLE_BADGE[user.role];
              const isUpdating = updating === user.uid;
              const canChange = user.role !== 'MANAGER';
              return (
                <li key={user.uid} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={user.name} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{user.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">Role: {user.role}</p>
                    </div>
                    {canChange ? (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge.className}`}>{badge.label}</span>
                        {isUpdating ? (
                          <svg className="animate-spin w-4 h-4 text-indigo-500" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                        ) : (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleRoleChange(user, user.role === 'EMPLOYEE' ? 'SENIOR' : 'EMPLOYEE')}
                            className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                          >
                            {user.role === 'EMPLOYEE' ? 'Make Senior' : 'Make Employee'}
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${badge.className}`}>{badge.label}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}

