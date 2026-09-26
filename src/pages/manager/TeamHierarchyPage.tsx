// Team Hierarchy Page -- Manager only.
// Shows org chart: purple "Organization Overview" banner, then each Senior
// row (collapsible) with their assigned employees indented below, then
// "Unassigned Employees" section in red for employees with no seniorId.

import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../../components/NavBar';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorBoundary from '../../components/ErrorBoundary';
import { getAllUsersWithAssignments } from '../../services/users.service';
import type { AppUser } from '../../types';

function PersonIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? 'w-5 h-5'} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
    </svg>
  );
}

function BadgeIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? 'w-5 h-5'} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20 7h-4V5c0-1.1-.9-2-2-2h-4C8.9 3 8 3.9 8 5v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm-8-2h4v2h-4V5z" />
    </svg>
  );
}

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg className={`w-4 h-4 transition-transform ${open ? '' : '-rotate-90'}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );
}

export default function TeamHierarchyPage() {
  const navigate = useNavigate();
  const [users,   setUsers]   = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    getAllUsersWithAssignments()
      .then(setUsers)
      .catch(() => setError('Failed to load team data.'))
      .finally(() => setLoading(false));
  }, []);

  const seniors   = useMemo(() => users.filter((u) => u.role === 'SENIOR'),  [users]);
  const employees = useMemo(() => users.filter((u) => u.role === 'EMPLOYEE'), [users]);
  const unassigned = useMemo(() => employees.filter((e) => !e.seniorId),      [employees]);

  function getTeam(seniorUid: string) {
    return employees.filter((e) => e.seniorId === seniorUid);
  }

  function toggleCollapse(uid: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <ErrorBoundary>
        <NavBar title="Team Hierarchy" />
      </ErrorBoundary>
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <button type="button" onClick={() => navigate('/manager/team')}
          className="flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Team Management
        </button>

        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Team Hierarchy</h1>

        {/* Organization Overview banner */}
        <div className="w-full flex items-center gap-3 bg-indigo-600 text-white rounded-2xl px-5 py-4">
          <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
          </svg>
          <span className="font-bold text-base">Organization Overview</span>
        </div>

        {loading && <LoadingSpinner message="Loading hierarchy…" />}
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {!loading && !error && (
          <div className="space-y-3">
            {/* Seniors with their teams */}
            {seniors.map((senior) => {
              const team = getTeam(senior.uid);
              const isOpen = !collapsed.has(senior.uid);
              return (
                <div key={senior.uid} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleCollapse(senior.uid)}
                    className="w-full flex items-center gap-3 bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-3.5 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <ChevronDown open={isOpen} />
                    <PersonIcon className="w-6 h-6 text-gray-500 dark:text-gray-300" />
                    <div className="flex-1 text-left">
                      <p className="font-bold text-gray-800 dark:text-gray-100">{senior.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Senior</p>
                    </div>
                    <span className="text-xs text-gray-400">{team.length} member{team.length !== 1 ? 's' : ''}</span>
                  </button>

                  {isOpen && team.map((emp) => (
                    <div key={emp.uid} className="ml-8 flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-4 py-2.5">
                      <BadgeIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{emp.name}</span>
                    </div>
                  ))}
                  {isOpen && team.length === 0 && (
                    <p className="ml-8 text-xs text-gray-400 py-2">No employees assigned yet.</p>
                  )}
                </div>
              );
            })}

            {/* Unassigned Employees */}
            {unassigned.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="font-bold text-red-500 dark:text-red-400 text-sm">Unassigned Employees</p>
                {unassigned.map((emp) => (
                  <div key={emp.uid} className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-4 py-2.5">
                    <BadgeIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{emp.name}</span>
                  </div>
                ))}
              </div>
            )}

            {seniors.length === 0 && unassigned.length === 0 && (
              <p className="text-center text-gray-400 py-10">No team structure yet. Add seniors and assign employees.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

