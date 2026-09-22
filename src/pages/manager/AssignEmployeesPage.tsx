// Assign Employees Page -- Manager only.
// Step 1: Select a Senior from dropdown.
// Step 2: Shows all employees with toggle to assign/unassign each to that senior.

import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../../components/NavBar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getAllUsers, assignEmployeeToSenior } from '../../services/users.service';
import type { AppUser } from '../../types';

export default function AssignEmployeesPage() {
  const navigate = useNavigate();
  const [users,          setUsers]          = useState<AppUser[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [selectedSenior, setSelectedSenior] = useState<string>('');
  const [updating,       setUpdating]       = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getAllUsers()
      .then(setUsers)
      .catch(() => setError('Failed to load users.'))
      .finally(() => setLoading(false));
  }, []);

  const seniors   = useMemo(() => users.filter((u) => u.role === 'SENIOR'),  [users]);
  const employees = useMemo(() => users.filter((u) => u.role === 'EMPLOYEE'), [users]);

  async function handleToggle(employee: AppUser) {
    if (!selectedSenior) return;
    const newSeniorId = employee.seniorId === selectedSenior ? null : selectedSenior;
    setUpdating(employee.uid);
    try {
      await assignEmployeeToSenior(employee.uid, newSeniorId);
      setUsers((prev) =>
        prev.map((u) => u.uid === employee.uid ? { ...u, seniorId: newSeniorId } : u),
      );
    } catch {
      setError('Failed to update assignment. Please try again.');
    } finally {
      setUpdating(null);
    }
  }

  const seniorName = seniors.find((s) => s.uid === selectedSenior)?.name ?? '';


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <NavBar title="Assign Employees" />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <button type="button" onClick={() => navigate('/manager/team')}
          className="flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Team Management
        </button>

        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Assign Employees</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Select a senior, then assign employees to them.</p>
        </div>

        {loading && <LoadingSpinner message="Loading users…" />}
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {!loading && !error && (
          <>
            {/* Step 1: Select Senior */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3">1. Select Senior</p>
              <select value={selectedSenior} onChange={(e) => setSelectedSenior(e.target.value)}
                className="w-full rounded-xl border-2 border-indigo-300 dark:border-indigo-600 bg-white dark:bg-gray-700 dark:text-gray-100 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="">Select a Senior</option>
                {seniors.map((s) => <option key={s.uid} value={s.uid}>{s.name}</option>)}
              </select>
              {seniors.length === 0 && (
                <p className="text-xs text-gray-400 mt-2">No seniors found. Promote an employee to Senior first.</p>
              )}
            </div>

            {/* Step 2: Assign employees */}
            {selectedSenior && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                  2. Assign employees to <span className="text-indigo-600 dark:text-indigo-400">{seniorName}</span>
                </p>
                {employees.length === 0 && (
                  <p className="text-sm text-gray-400 py-4 text-center">No employees found.</p>
                )}
                <ul className="space-y-2">
                  {employees.map((emp) => {
                    const isAssignedHere  = emp.seniorId === selectedSenior;
                    const isAssignedOther = emp.seniorId && emp.seniorId !== selectedSenior;
                    const otherName = isAssignedOther ? (seniors.find((s) => s.uid === emp.seniorId)?.name ?? 'another senior') : null;
                    const isUpdating = updating === emp.uid;
                    return (
                      <li key={emp.uid} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 dark:text-gray-100 truncate">{emp.name}</p>
                          {isAssignedHere && <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">Assigned to {seniorName}</p>}
                          {isAssignedOther && <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Currently under {otherName}</p>}
                        </div>
                        {isUpdating ? (
                          <svg className="animate-spin w-5 h-5 text-indigo-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                        ) : (
                          <button type="button" onClick={() => handleToggle(emp)}
                            className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                              isAssignedHere
                                ? 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100 dark:border-red-800 dark:text-red-400 dark:bg-red-900/20'
                                : 'border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:border-indigo-700 dark:text-indigo-400'
                            }`}>
                            {isAssignedHere ? 'Unassign' : 'Assign'}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

