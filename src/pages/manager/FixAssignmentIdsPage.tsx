// FixAssignmentIdsPage — ONE-TIME repair tool, Step 2 of schema migration.
//
// PURPOSE:
//   The Android app creates /assignments documents using a deterministic ID:
//     {seniorId}_{employeeId}
//   At least one document exists with a Firestore auto-generated random ID
//   instead (likely from an earlier Android bug before the deterministic key
//   was enforced). This page finds every such document and re-keys it:
//     1. Reads every /assignments document.
//     2. For each whose doc.id !== `${seniorId}_${employeeId}`:
//        a. setDoc the correct-ID document with { seniorId, employeeId }.
//        b. getDoc to verify the new document actually landed in Firestore.
//        c. deleteDoc the old randomly-keyed document ONLY after verify passes.
//     3. Reports full audit log on screen.
//
// SAFETY:
//   • Steps a→b→c are strictly serial per document. If verify (b) fails,
//     (c) is skipped — the old doc is left intact, no data is lost.
//   • Documents whose ID already matches are reported as "correct — skipped".
//   • Only reachable by MANAGER (enforced by ProtectedRoute in AppRouter).
//   • The /assignments write rule requires isStrictManager() (MANAGER role),
//     which is the same account running this tool.
//
// WHEN TO DELETE THIS FILE:
//   After the audit table shows 0 errors and every bad-ID doc has been fixed,
//   remove the route from AppRouter and delete this file.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import NavBar from '../../components/NavBar';
import LoadingSpinner from '../../components/LoadingSpinner';


// ── Types ─────────────────────────────────────────────────────────────────────

type FixStatus = 'idle' | 'running' | 'done' | 'error';

type RowOutcome =
  | 'correct'          // doc.id already matched — skipped
  | 'recreated'        // old doc deleted, new correct-ID doc written & verified
  | 'error_write'      // setDoc of new doc failed — old doc untouched
  | 'error_verify'     // new doc written but getDoc failed — old doc untouched
  | 'error_delete'     // new doc written & verified but deleteDoc of old failed
  | 'error_bad_data';  // doc has missing/non-string seniorId or employeeId

interface AuditRow {
  oldDocId: string;
  seniorId: string;
  employeeId: string;
  correctDocId: string;
  outcome: RowOutcome;
  detail?: string;
}

interface FixResult {
  totalScanned: number;
  alreadyCorrect: number;
  badData: number;
  recreated: number;
  errored: number;
  rows: AuditRow[];
}

// ── Fix logic — strictly serial per document ──────────────────────────────────

async function runFix(): Promise<FixResult> {
  const snap = await getDocs(collection(db, 'assignments'));
  const totalScanned = snap.size;

  let alreadyCorrect = 0;
  let badData        = 0;
  let recreated      = 0;
  let errored        = 0;
  const rows: AuditRow[] = [];

  for (const assignDoc of snap.docs) {
    const oldDocId = assignDoc.id;
    const data     = assignDoc.data();
    const seniorId:   unknown = data['seniorId'];
    const employeeId: unknown = data['employeeId'];

    // ── Guard: both fields must be non-empty strings ──────────────────────────
    if (
      !seniorId   || typeof seniorId   !== 'string' || seniorId.trim()   === '' ||
      !employeeId || typeof employeeId !== 'string' || employeeId.trim() === ''
    ) {
      badData++;
      rows.push({
        oldDocId,
        seniorId:   typeof seniorId   === 'string' ? seniorId   : '(missing)',
        employeeId: typeof employeeId === 'string' ? employeeId : '(missing)',
        correctDocId: '(cannot compute — fields missing)',
        outcome: 'error_bad_data',
        detail: `seniorId=${JSON.stringify(seniorId)}, employeeId=${JSON.stringify(employeeId)}`,
      });
      continue;
    }

    const correctDocId = `${seniorId}_${employeeId}`;

    // ── Already correct — nothing to do ──────────────────────────────────────
    if (oldDocId === correctDocId) {
      alreadyCorrect++;
      rows.push({ oldDocId, seniorId, employeeId, correctDocId, outcome: 'correct' });
      continue;
    }

    // ── Needs re-keying: create → verify → delete ─────────────────────────────
    const newRef = doc(db, 'assignments', correctDocId);
    const oldRef = doc(db, 'assignments', oldDocId);

    // Step a: write the correct-ID document
    try {
      await setDoc(newRef, { seniorId, employeeId }, { merge: false });
    } catch (err: unknown) {
      errored++;
      rows.push({
        oldDocId, seniorId, employeeId, correctDocId,
        outcome: 'error_write',
        detail: err instanceof Error ? err.message : String(err),
      });
      continue; // old doc untouched
    }

    // Step b: verify the new document exists before touching the old one
    try {
      const verify = await getDoc(newRef);
      if (!verify.exists()) throw new Error('getDoc returned no document after setDoc');
    } catch (err: unknown) {
      errored++;
      rows.push({
        oldDocId, seniorId, employeeId, correctDocId,
        outcome: 'error_verify',
        detail: err instanceof Error ? err.message : String(err),
      });
      continue; // old doc untouched — new doc may or may not exist
    }

    // Step c: delete the old randomly-keyed document
    try {
      await deleteDoc(oldRef);
    } catch (err: unknown) {
      errored++;
      rows.push({
        oldDocId, seniorId, employeeId, correctDocId,
        outcome: 'error_delete',
        detail: err instanceof Error ? err.message : String(err),
      });
      continue; // new doc exists and is correct; old doc deletion failed
    }

    // All three steps succeeded
    recreated++;
    rows.push({ oldDocId, seniorId, employeeId, correctDocId, outcome: 'recreated' });
  }

  return { totalScanned, alreadyCorrect, badData, recreated, errored, rows };
}

// ── Outcome badge helper ──────────────────────────────────────────────────────

function OutcomeBadge({ outcome }: { outcome: RowOutcome }) {
  const base = 'inline-block px-2 py-0.5 rounded-full font-semibold text-xs whitespace-nowrap';
  switch (outcome) {
    case 'correct':
      return <span className={`${base} bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400`}>✓ already correct</span>;
    case 'recreated':
      return <span className={`${base} bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300`}>✅ re-keyed</span>;
    case 'error_write':
      return <span className={`${base} bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300`}>❌ write failed</span>;
    case 'error_verify':
      return <span className={`${base} bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300`}>❌ verify failed</span>;
    case 'error_delete':
      return <span className={`${base} bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300`}>⚠️ delete failed</span>;
    case 'error_bad_data':
      return <span className={`${base} bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300`}>❌ bad data</span>;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FixAssignmentIdsPage() {
  const navigate = useNavigate();
  const [status,   setStatus]   = useState<FixStatus>('idle');
  const [result,   setResult]   = useState<FixResult | null>(null);
  const [topError, setTopError] = useState<string | null>(null);

  async function handleRun() {
    setStatus('running');
    setResult(null);
    setTopError(null);
    try {
      const r = await runFix();
      setResult(r);
      setStatus('done');
    } catch (err: unknown) {
      setTopError(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  }

  const allOk       = result && result.errored === 0 && result.badData === 0;
  const needsAction = result && (result.recreated > 0 || result.errored > 0 || result.badData > 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <NavBar title="Step 2 — Fix Assignment IDs" />
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Back nav */}
        <button type="button" onClick={() => navigate('/manager/team')}
          className="flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Team Management
        </button>

        {/* Header + explanation */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-5 space-y-3">
          <h1 className="text-lg font-bold text-amber-800 dark:text-amber-300">
            ⚠️ One-Time ID Repair — Step 2 of 4
          </h1>
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Every <code className="font-mono bg-amber-100 dark:bg-amber-800/40 px-1 rounded">/assignments</code> document
            must have its Firestore document ID equal to{' '}
            <code className="font-mono bg-amber-100 dark:bg-amber-800/40 px-1 rounded">{'<seniorId>_<employeeId>'}</code>.
            At least one document exists with an auto-generated random ID instead.
            This tool finds all such documents and re-keys them.
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-400">
            <strong>For each mismatched document, exactly three steps run in order:</strong>
          </p>
          <ol className="text-sm text-amber-700 dark:text-amber-400 list-decimal list-inside space-y-1">
            <li><strong>Write</strong> the correct-ID document with the same fields.</li>
            <li><strong>Verify</strong> the new document exists in Firestore (read-back check).</li>
            <li><strong>Delete</strong> the old random-ID document — <em>only if verify passed</em>.</li>
          </ol>
          <p className="text-sm text-amber-700 dark:text-amber-400">
            If any step fails, the old document is left intact and the error is reported below. Safe to re-run.
          </p>
        </div>

        {/* Run button */}
        {status === 'idle' && (
          <button type="button" onClick={handleRun}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-colors shadow">
            Scan &amp; Fix Assignment IDs Now
          </button>
        )}

        {/* Running spinner */}
        {status === 'running' && (
          <LoadingSpinner message="Scanning /assignments, re-keying mismatched documents…" />
        )}

        {/* Top-level fatal error */}
        {status === 'error' && topError && (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-700 px-4 py-3 space-y-2">
            <p className="text-sm font-bold text-red-700 dark:text-red-400">Fatal error — /assignments collection could not be read:</p>
            <p className="text-sm text-red-600 dark:text-red-400 font-mono break-all">{topError}</p>
            <button type="button" onClick={handleRun} className="text-xs underline text-red-600 dark:text-red-400">Retry</button>
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
                {allOk
                  ? (needsAction
                      ? '✅ All mismatched IDs fixed successfully'
                      : '✅ All /assignments IDs were already correct — nothing to do')
                  : '⚠️ Completed with errors — see table below'}
              </p>
              <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                <li>📋 <strong>Total /assignments documents scanned:</strong> {result.totalScanned}</li>
                <li>✓&nbsp; <strong>Already had correct ID — skipped:</strong> {result.alreadyCorrect}</li>
                <li>✅ <strong>Re-keyed (old deleted, new written &amp; verified):</strong> {result.recreated}</li>
                {result.badData > 0 && <li>❌ <strong>Bad data (missing seniorId/employeeId):</strong> {result.badData}</li>}
                {result.errored > 0 && <li>❌ <strong>Errored during re-key:</strong> {result.errored}</li>}
              </ul>
            </div>

            {/* Audit table */}
            {result.rows.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Old doc ID (in Firestore)</th>
                      <th className="px-3 py-2 font-semibold">seniorId field</th>
                      <th className="px-3 py-2 font-semibold">employeeId field</th>
                      <th className="px-3 py-2 font-semibold">Correct doc ID</th>
                      <th className="px-3 py-2 font-semibold">Outcome</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {result.rows.map((row, idx) => (
                      <tr key={idx}
                        className={
                          row.outcome === 'correct'
                            ? 'bg-white dark:bg-gray-900'
                            : row.outcome === 'recreated'
                            ? 'bg-green-50 dark:bg-green-900/10'
                            : 'bg-red-50 dark:bg-red-900/10'
                        }>
                        <td className={`px-3 py-2 font-mono break-all ${
                          row.outcome !== 'correct'
                            ? 'text-red-600 dark:text-red-400 line-through'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {row.oldDocId}
                        </td>
                        <td className="px-3 py-2 font-mono text-gray-500 dark:text-gray-400 break-all">{row.seniorId}</td>
                        <td className="px-3 py-2 font-mono text-gray-500 dark:text-gray-400 break-all">{row.employeeId}</td>
                        <td className="px-3 py-2 font-mono text-indigo-600 dark:text-indigo-400 break-all">{row.correctDocId}</td>
                        <td className="px-3 py-2">
                          <OutcomeBadge outcome={row.outcome} />
                          {row.detail && (
                            <p className="text-red-500 dark:text-red-400 mt-0.5 font-mono break-all">{row.detail}</p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Next steps */}
            <div className="rounded-2xl border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 px-5 py-4 space-y-2">
              <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">What to do next</p>
              <ol className="text-sm text-indigo-700 dark:text-indigo-400 space-y-1 list-decimal list-inside">
                <li>Confirm the summary shows <strong>0 errored</strong> and <strong>0 bad data</strong>.</li>
                <li>Note which document(s) were re-keyed above — those are the ones that had wrong IDs.</li>
                <li>
                  Verify in the{' '}
                  <a href="https://console.firebase.google.com/project/fieldvisit-8a87c/firestore/data/assignments"
                    target="_blank" rel="noopener noreferrer" className="underline">
                    Firebase Console → Firestore → assignments
                  </a>{' '}
                  that only <code className="font-mono bg-indigo-100 dark:bg-indigo-800/40 px-1 rounded">seniorId_employeeId</code>-format IDs remain.
                </li>
                <li>Report the re-keyed list back to proceed to Step 3 (rewriting the web app assignment code).</li>
              </ol>
            </div>

            {/* Re-run button */}
            <button type="button" onClick={handleRun}
              className="w-full py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              Re-run Scan (safe — already-correct docs are skipped)
            </button>
          </div>
        )}
      </main>
    </div>
  );
}


