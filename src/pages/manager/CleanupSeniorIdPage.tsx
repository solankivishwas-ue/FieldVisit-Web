// CleanupSeniorIdPage — ONE-TIME data cleanup, Step 5 of schema migration.
//
// WHAT IT DOES:
//   1. Reads every document in the /users collection.
//   2. For any doc whose data still contains a 'seniorId' key (any value,
//      including null): updateDoc(users/{uid}, { seniorId: deleteField() })
//   3. Reports a full audit log on screen.
//
// SAFETY: Only the seniorId field is targeted. Docs without seniorId are
//   skipped (idempotent). Only reachable by MANAGER.
//   MUST only be run AFTER /manager/migrate and /manager/fix-assignment-ids
//   have both reported 0 errors.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, updateDoc, doc, deleteField } from 'firebase/firestore';
import { db } from '../../firebase/config';
import NavBar from '../../components/NavBar';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorBoundary from '../../components/ErrorBoundary';

type CleanupStatus = 'idle' | 'running' | 'done' | 'error';

interface AuditRow {
  uid: string;
  name: string;
  hadSeniorId: string;
  outcome: 'skipped' | 'cleaned' | 'error';
  detail?: string;
}

interface CleanupResult {
  totalScanned: number;
  alreadyClean: number;
  cleaned: number;
  errored: number;
  rows: AuditRow[];
}

async function runCleanup(): Promise<CleanupResult> {
  const usersSnap = await getDocs(collection(db, 'users'));
  const totalScanned = usersSnap.size;
  let alreadyClean = 0, cleaned = 0, errored = 0;
  const rows: AuditRow[] = [];

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const uid  = userDoc.id;
    const name = typeof data['name'] === 'string' ? data['name'] : '(unknown)';

    if (!('seniorId' in data)) {
      alreadyClean++;
      rows.push({ uid, name, hadSeniorId: '', outcome: 'skipped' });
      continue;
    }

    const raw = data['seniorId'];
    const displayValue =
      raw === null ? '(null)'
      : raw === undefined ? '(undefined)'
      : typeof raw === 'string' ? (raw.trim() === '' ? '(empty string)' : raw)
      : String(raw);

    try {
      await updateDoc(doc(db, 'users', uid), { seniorId: deleteField() });
      cleaned++;
      rows.push({ uid, name, hadSeniorId: displayValue, outcome: 'cleaned' });
    } catch (err: unknown) {
      errored++;
      rows.push({ uid, name, hadSeniorId: displayValue, outcome: 'error', detail: err instanceof Error ? err.message : String(err) });
    }
  }
  return { totalScanned, alreadyClean, cleaned, errored, rows };
}

export default function CleanupSeniorIdPage() {
  const navigate = useNavigate();
  const [status,     setStatus]     = useState<CleanupStatus>('idle');
  const [result,     setResult]     = useState<CleanupResult | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);

  async function handleRun() {
    setStatus('running'); setResult(null); setFatalError(null);
    try { const r = await runCleanup(); setResult(r); setStatus('done'); }
    catch (err: unknown) { setFatalError(err instanceof Error ? err.message : String(err)); setStatus('error'); }
  }

  const actionRows = result?.rows.filter(r => r.outcome !== 'skipped') ?? [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <ErrorBoundary>
        <NavBar title="Cleanup: Remove seniorId from /users" />
      </ErrorBoundary>
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        <button type="button" onClick={() => navigate('/manager/team')}
          className="flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Team Management
        </button>

        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            Step 5 — Remove <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">seniorId</code> from /users docs
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Deletes the stale <code className="font-mono">seniorId</code> field from every /users document.
            All assignment data is already safely in /assignments.
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-5 py-4 space-y-2">
          <p className="text-sm font-bold text-amber-700 dark:text-amber-300">⚠ Prerequisites — confirm before running</p>
          <ol className="text-sm text-amber-700 dark:text-amber-400 space-y-1 list-decimal list-inside">
            <li><strong>/manager/migrate</strong> — 0 errors (seniorIds copied to /assignments)</li>
            <li><strong>/manager/fix-assignment-ids</strong> — 0 errors (doc IDs are deterministic)</li>
            <li><strong>/manager/team/hierarchy</strong> shows correct team structure</li>
          </ol>
        </div>

        {status !== 'running' && (
          <button type="button" onClick={handleRun}
            className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors shadow-sm">
            {status === 'idle' ? 'Run Cleanup — Delete seniorId field from /users docs' : 'Re-run Cleanup (safe — already-clean docs skipped)'}
          </button>
        )}

        {status === 'running' && <LoadingSpinner message="Scanning and cleaning /users documents…" />}

        {status === 'error' && fatalError && (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            <strong>Fatal error:</strong> {fatalError}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {([
                { label: 'Scanned',       value: result.totalScanned, color: 'text-gray-700 dark:text-gray-200' },
                { label: 'Already clean', value: result.alreadyClean, color: 'text-gray-500 dark:text-gray-400' },
                { label: 'Cleaned',       value: result.cleaned, color: 'text-green-600 dark:text-green-400' },
                { label: 'Errors', value: result.errored, color: result.errored > 0 ? 'text-red-600 font-bold' : 'text-gray-400' },
              ] as const).map(({ label, value, color }) => (
                <div key={label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 px-4 py-3 text-center">
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {result.errored === 0 ? (
              <div className="rounded-2xl border border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20 px-5 py-3">
                <p className="text-sm font-bold text-green-700 dark:text-green-300">
                  ✅ Complete — seniorId removed from {result.cleaned} doc{result.cleaned !== 1 ? 's' : ''}.
                  {result.alreadyClean > 0 && ` ${result.alreadyClean} were already clean.`}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Step 5 complete. /users schema now matches Android — no seniorId field anywhere.
                  You may delete MigratePage, FixAssignmentIdsPage, and this page from the codebase.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/10 px-5 py-3">
                <p className="text-sm font-bold text-red-700 dark:text-red-300">
                  ❌ {result.errored} error{result.errored !== 1 ? 's' : ''} — see table below. Re-run to retry.
                </p>
              </div>
            )}

            {actionRows.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-left">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Name</th>
                      <th className="px-3 py-2 font-semibold">UID</th>
                      <th className="px-3 py-2 font-semibold">seniorId was</th>
                      <th className="px-3 py-2 font-semibold">Outcome</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {actionRows.map(row => (
                      <tr key={row.uid} className={row.outcome === 'error' ? 'bg-red-50 dark:bg-red-900/10' : 'bg-white dark:bg-gray-900'}>
                        <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">{row.name}</td>
                        <td className="px-3 py-2 font-mono text-gray-500 dark:text-gray-400 break-all">{row.uid}</td>
                        <td className="px-3 py-2 font-mono text-amber-600 dark:text-amber-400 break-all">{row.hadSeniorId}</td>
                        <td className="px-3 py-2">
                          {row.outcome === 'cleaned'
                            ? <span className="inline-block px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-semibold">✅ cleaned</span>
                            : <div>
                                <span className="inline-block px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-semibold">❌ error</span>
                                {row.detail && <p className="text-red-500 mt-0.5 font-mono break-all">{row.detail}</p>}
                              </div>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-center text-gray-400 py-4">All /users docs were already clean — nothing to do.</p>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
