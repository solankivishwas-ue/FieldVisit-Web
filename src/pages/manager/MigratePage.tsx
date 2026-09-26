// MigratePage — ONE-TIME data migration, Step 1 of schema migration.
//
// PURPOSE:
//   The web app previously stored assignment data as a `seniorId` field
//   directly on the employee's /users/{uid} document. The Android app uses a
//   separate /assignments/{seniorId}_{employeeId} collection instead.
//   This page migrates web-created assignments INTO the Android-compatible
//   /assignments collection WITHOUT deleting anything from /users yet.
//
// WHAT IT DOES:
//   1. Reads every document in the /users collection.
//   2. For any doc where seniorId is a non-null, non-empty string:
//      → writes /assignments/{seniorId}_{employeeId} { seniorId, employeeId }
//        using setDoc with merge:false (idempotent — safe to re-run).
//   3. Reports a full audit log on screen.
//
// SAFETY:
//   • Does NOT delete or modify any /users documents.
//   • setDoc with merge:false on /assignments is idempotent: re-running when
//     the doc already exists simply overwrites with identical data — no harm.
//   • Only reachable by MANAGER (enforced by ProtectedRoute in AppRouter).
//
// WHEN TO DELETE THIS FILE:
//   After Step 1 is confirmed AND Steps 2-4 of the migration are done,
//   remove this route from AppRouter and delete this file.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import NavBar from '../../components/NavBar';
import LoadingSpinner from '../../components/LoadingSpinner';


// ── Types ─────────────────────────────────────────────────────────────────────

type MigrationStatus = 'idle' | 'running' | 'done' | 'error';

interface AuditRow {
  employeeUid: string;
  employeeName: string;
  seniorId: string;
  assignmentDocId: string;
  result: 'created' | 'error';
  detail?: string;
}

interface MigrationResult {
  totalUsersScanned: number;
  usersWithSeniorId: number;
  assignmentsCreated: number;
  assignmentsErrored: number;
  rows: AuditRow[];
}

// ── Migration logic ───────────────────────────────────────────────────────────

async function runMigration(): Promise<MigrationResult> {
  const usersSnap = await getDocs(collection(db, 'users'));
  const totalUsersScanned = usersSnap.size;

  const rows: AuditRow[] = [];
  let usersWithSeniorId = 0;
  let assignmentsCreated = 0;
  let assignmentsErrored = 0;

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const seniorId: unknown = data['seniorId'];

    // Skip if seniorId is absent, null, or empty string.
    if (!seniorId || typeof seniorId !== 'string' || seniorId.trim() === '') continue;

    usersWithSeniorId++;
    const employeeUid = userDoc.id;
    const employeeName: string = typeof data['name'] === 'string' ? data['name'] : '(unknown)';
    const assignmentDocId = `${seniorId}_${employeeUid}`;

    try {
      // Write /assignments/{seniorId}_{employeeId} with the exact fields
      // the Android app expects. merge:false is intentional and idempotent.
      await setDoc(
        doc(db, 'assignments', assignmentDocId),
        { seniorId, employeeId: employeeUid },
        { merge: false },
      );
      assignmentsCreated++;
      rows.push({ employeeUid, employeeName, seniorId, assignmentDocId, result: 'created' });
    } catch (err: unknown) {
      assignmentsErrored++;
      rows.push({
        employeeUid, employeeName, seniorId, assignmentDocId, result: 'error',
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { totalUsersScanned, usersWithSeniorId, assignmentsCreated, assignmentsErrored, rows };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MigratePage() {
  const navigate = useNavigate();
  const [status,   setStatus]   = useState<MigrationStatus>('idle');
  const [result,   setResult]   = useState<MigrationResult | null>(null);
  const [topError, setTopError] = useState<string | null>(null);

  async function handleRun() {
    setStatus('running');
    setResult(null);
    setTopError(null);
    try {
      const r = await runMigration();
      setResult(r);
      setStatus('done');
    } catch (err: unknown) {
      setTopError(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  }

  const allOk = result && result.assignmentsErrored === 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <NavBar title="Step 1 — Data Migration" />
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* Back nav */}
        <button type="button" onClick={() => navigate('/manager/team')}
          className="flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Team Management
        </button>

        {/* Header + explanation */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-5 space-y-2">
          <h1 className="text-lg font-bold text-amber-800 dark:text-amber-300">
            ⚠️ One-Time Schema Migration — Step 1 of 4
          </h1>
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Reads every <code className="font-mono bg-amber-100 dark:bg-amber-800/40 px-1 rounded">/users</code> document
            that has a non-null <code className="font-mono bg-amber-100 dark:bg-amber-800/40 px-1 rounded">seniorId</code> field
            (written by the old web schema) and creates the matching{' '}
            <code className="font-mono bg-amber-100 dark:bg-amber-800/40 px-1 rounded">/assignments/{'<seniorId>_<employeeId>'}</code> document
            that the Android app expects.
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-400">
            <strong>Safe to re-run.</strong> Does NOT modify or delete any{' '}
            <code className="font-mono bg-amber-100 dark:bg-amber-800/40 px-1 rounded">/users</code> documents.
          </p>
        </div>

        {/* Run button */}
        {status === 'idle' && (
          <button type="button" onClick={handleRun}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-colors shadow">
            Run Migration Now
          </button>
        )}

        {/* Running spinner */}
        {status === 'running' && (
          <LoadingSpinner message="Scanning /users and writing /assignments documents…" />
        )}

        {/* Top-level fatal error */}
        {status === 'error' && topError && (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-700 px-4 py-3 space-y-2">
            <p className="text-sm font-bold text-red-700 dark:text-red-400">Migration failed with an unexpected error:</p>
            <p className="text-sm text-red-600 dark:text-red-400 font-mono break-all">{topError}</p>
            <button type="button" onClick={handleRun} className="text-xs underline text-red-600 dark:text-red-400">
              Retry
            </button>
          </div>
        )}

        {/* Results */}
        {status === 'done' && result && (
          <div className="space-y-4">

            {/* Summary banner */}
            <div className={`rounded-2xl border px-5 py-4 space-y-2 ${
              allOk
                ? 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-700'
                : 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-700'
            }`}>
              <p className={`font-bold text-sm ${allOk ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                {allOk ? '✅ Migration completed successfully' : '⚠️ Migration completed with errors — see table below'}
              </p>
              <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                <li>📋 <strong>Total /users documents scanned:</strong> {result.totalUsersScanned}</li>
                <li>🔍 <strong>/users docs with a seniorId field:</strong> {result.usersWithSeniorId}</li>
                <li>✅ <strong>/assignments documents written:</strong> {result.assignmentsCreated}</li>
                {result.assignmentsErrored > 0 && (
                  <li>❌ <strong>/assignments documents errored:</strong> {result.assignmentsErrored}</li>
                )}
              </ul>
              {result.usersWithSeniorId === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  No /users documents had a seniorId field — nothing to migrate. Proceed to Step 2.
                </p>
              )}
            </div>

            {/* Audit table */}
            {result.rows.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Employee Name</th>
                      <th className="px-3 py-2 font-semibold">Employee UID</th>
                      <th className="px-3 py-2 font-semibold">Senior UID (seniorId)</th>
                      <th className="px-3 py-2 font-semibold">/assignments doc ID written</th>
                      <th className="px-3 py-2 font-semibold">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {result.rows.map((row) => (
                      <tr key={row.assignmentDocId}
                        className={row.result === 'error' ? 'bg-red-50 dark:bg-red-900/10' : 'bg-white dark:bg-gray-900'}>
                        <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">{row.employeeName}</td>
                        <td className="px-3 py-2 font-mono text-gray-500 dark:text-gray-400 break-all">{row.employeeUid}</td>
                        <td className="px-3 py-2 font-mono text-gray-500 dark:text-gray-400 break-all">{row.seniorId}</td>
                        <td className="px-3 py-2 font-mono text-indigo-600 dark:text-indigo-400 break-all">{row.assignmentDocId}</td>
                        <td className="px-3 py-2">
                          {row.result === 'created'
                            ? <span className="inline-block px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-semibold whitespace-nowrap">✅ written</span>
                            : (
                              <div>
                                <span className="inline-block px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-semibold whitespace-nowrap">❌ error</span>
                                {row.detail && <p className="text-red-500 dark:text-red-400 mt-0.5 font-mono break-all">{row.detail}</p>}
                              </div>
                            )
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Next-step instructions */}
            <div className="rounded-2xl border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 px-5 py-4 space-y-2">
              <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">What to do next</p>
              <ol className="text-sm text-indigo-700 dark:text-indigo-400 space-y-1 list-decimal list-inside">
                <li>Confirm the summary shows <strong>0 errors</strong> and that
                  {' '}<strong>/assignments docs written</strong> equals
                  {' '}<strong>/users docs with a seniorId</strong>.</li>
                <li>
                  Optionally open the{' '}
                  <a href="https://console.firebase.google.com/project/fieldvisit-8a87c/firestore/data/assignments"
                    target="_blank" rel="noopener noreferrer" className="underline">
                    Firebase Console → Firestore → assignments
                  </a>{' '}
                  and verify each document above is present with correct <code className="font-mono bg-indigo-100 dark:bg-indigo-800/40 px-1 rounded">seniorId</code> and <code className="font-mono bg-indigo-100 dark:bg-indigo-800/40 px-1 rounded">employeeId</code> fields.
                </li>
                <li>Report the numbers back to proceed to Step 2 (rewriting the web app code).</li>
              </ol>
            </div>

            {/* Re-run button */}
            <button type="button" onClick={handleRun}
              className="w-full py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              Re-run Migration (safe — idempotent)
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

