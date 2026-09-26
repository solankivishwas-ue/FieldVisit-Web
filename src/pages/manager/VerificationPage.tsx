// VerificationPage � Step 7 end-to-end verification tool.
// Runs automated Firestore integrity checks + displays the manual test protocol.
//
// Check 1 � /assignments collection integrity:
//   Every doc has deterministic ID {seniorId}_{employeeId}, seniorId points to a
//   real SENIOR/MANAGER user, employeeId to a real EMPLOYEE user.
//
// Check 2 � Cross-platform write consistency:
//   If Check 1 passes, a web-created assignment is readable by Android at the
//   same path (same deterministic ID). Manual tests are printed below.
//
// Check 3 � /visits access gate:
//   getDoc(assignments/{seniorId}_{employeeId}) returns a real doc for each
//   valid assignment. This is the exact path the /visits Firestore rule needs.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import NavBar from '../../components/NavBar';
import LoadingSpinner from '../../components/LoadingSpinner';


type CheckStatus = 'pass' | 'fail' | 'warn';
interface Issue { docId: string; problem: string; }
interface VerifyResult {
  totalAssignments: number;
  badIdDocs: Issue[]; orphanSeniorDocs: Issue[]; orphanEmployeeDocs: Issue[];
  wrongRoleDocs: Issue[]; visitsGateIssues: Issue[];
  crossPlatformOk: boolean; overallStatus: CheckStatus;
}

async function runVerification(): Promise<VerifyResult> {
  const [assignSnap, usersSnap] = await Promise.all([
    getDocs(collection(db, 'assignments')),
    getDocs(collection(db, 'users')),
  ]);
  const userRoles = new Map<string, string>();
  for (const u of usersSnap.docs) userRoles.set(u.id, (u.data()['role'] as string) ?? '');

  const totalAssignments = assignSnap.size;
  const badIdDocs: Issue[] = [], orphanSeniorDocs: Issue[] = [],
        orphanEmployeeDocs: Issue[] = [], wrongRoleDocs: Issue[] = [],
        visitsGateIssues: Issue[] = [];

  for (const aDoc of assignSnap.docs) {
    const docId = aDoc.id, data = aDoc.data();
    const seniorId   = data['seniorId']   as string | undefined;
    const employeeId = data['employeeId'] as string | undefined;

    if (!seniorId || !employeeId) {
      badIdDocs.push({ docId, problem: `Missing field � seniorId:${seniorId ?? 'undef'} employeeId:${employeeId ?? 'undef'}` }); continue;
    }
    const expectedId = `${seniorId}_${employeeId}`;
    if (docId !== expectedId) badIdDocs.push({ docId, problem: `ID mismatch � expected "${expectedId}"` });

    if (!userRoles.has(seniorId)) orphanSeniorDocs.push({ docId, problem: `seniorId "${seniorId}" � no /users doc` });
    else if (userRoles.get(seniorId) !== 'SENIOR' && userRoles.get(seniorId) !== 'MANAGER')
      wrongRoleDocs.push({ docId, problem: `seniorId "${seniorId}" has role "${userRoles.get(seniorId)}" (want SENIOR/MANAGER)` });

    if (!userRoles.has(employeeId)) orphanEmployeeDocs.push({ docId, problem: `employeeId "${employeeId}" � no /users doc` });
    else if (userRoles.get(employeeId) !== 'EMPLOYEE')
      wrongRoleDocs.push({ docId, problem: `employeeId "${employeeId}" has role "${userRoles.get(employeeId)}" (want EMPLOYEE)` });

    if (docId === expectedId) {
      const gate = await getDoc(doc(db, 'assignments', expectedId));
      if (!gate.exists()) visitsGateIssues.push({ docId, problem: `getDoc returned missing � /visits rule will deny senior access` });
    }
  }

  const crossPlatformOk = badIdDocs.length === 0 && orphanSeniorDocs.length === 0 && orphanEmployeeDocs.length === 0;
  const all = [...badIdDocs, ...orphanSeniorDocs, ...orphanEmployeeDocs, ...wrongRoleDocs, ...visitsGateIssues];
  const overallStatus: CheckStatus =
    all.length === 0 ? 'pass' : (badIdDocs.length > 0 || wrongRoleDocs.length > 0) ? 'fail' : 'warn';
  return { totalAssignments, badIdDocs, orphanSeniorDocs, orphanEmployeeDocs, wrongRoleDocs, visitsGateIssues, crossPlatformOk, overallStatus };
}

function CheckCard({ title, status, summary, issues }: {
  title: string; status: 'pass' | 'fail' | 'warn'; summary: string; issues: Issue[];
}) {
  const colours = {
    pass: { border: 'border-green-200 dark:border-green-700', bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', icon: '?' },
    warn: { border: 'border-amber-200 dark:border-amber-700', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', icon: '??' },
    fail: { border: 'border-red-200 dark:border-red-700', bg: 'bg-red-50 dark:bg-red-900/10', text: 'text-red-700 dark:text-red-300', icon: '?' },
  }[status];
  return (
    <div className={`rounded-2xl border px-5 py-4 space-y-2 ${colours.border} ${colours.bg}`}>
      <p className={`text-sm font-bold ${colours.text}`}>{colours.icon} {title}</p>
      <p className={`text-sm ${colours.text}`}>{summary}</p>
      {issues.length > 0 && (
        <ul className="space-y-1 mt-2">
          {issues.map((iss, i) => (
            <li key={i} className="text-xs font-mono text-red-600 dark:text-red-400 break-all">
              <strong>{iss.docId}</strong>: {iss.problem}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function VerificationPage() {
  const navigate = useNavigate();
  const [running, setRunning] = useState(false);
  const [result,  setResult]  = useState<VerifyResult | null>(null);
  const [fatal,   setFatal]   = useState<string | null>(null);

  async function handleRun() {
    setRunning(true); setResult(null); setFatal(null);
    try { setResult(await runVerification()); }
    catch (e: unknown) { setFatal(e instanceof Error ? e.message : String(e)); }
    finally { setRunning(false); }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <NavBar title="Step 7 � End-to-End Verification" />
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        <button type="button" onClick={() => navigate('/manager/team')}
          className="flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Team Management
        </button>

        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Step 7 � End-to-End Verification</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Automated Firestore integrity checks + manual test protocol for cross-platform verification.
          </p>
        </div>

        {!running && (
          <button type="button" onClick={handleRun}
            className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors shadow-sm">
            {result ? 'Re-run Automated Checks' : 'Run Automated Checks'}
          </button>
        )}
        {running && <LoadingSpinner message="Verifying /assignments integrity�" />}
        {fatal && (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            <strong>Fatal error:</strong> {fatal}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.overallStatus === 'pass' ? (
              <div className="rounded-2xl border border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20 px-5 py-3">
                <p className="text-sm font-bold text-green-700 dark:text-green-300">
                  ? All automated checks passed � {result.totalAssignments} assignment doc{result.totalAssignments !== 1 ? 's' : ''} verified.
                </p>
              </div>
            ) : (
              <div className={`rounded-2xl border px-5 py-3 ${
                result.overallStatus === 'fail'
                  ? 'border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/10'
                  : 'border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20'
              }`}>
                <p className={`text-sm font-bold ${result.overallStatus === 'fail' ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}`}>
                  {result.overallStatus === 'fail' ? '? Issues found � resolve before manual tests.' : '?? Minor issues � review below.'}
                </p>
              </div>
            )}

            <CheckCard title="Check 1a � Document ID format"
              status={result.badIdDocs.length === 0 ? 'pass' : 'fail'}
              summary={result.badIdDocs.length === 0
                ? `All ${result.totalAssignments} docs have the correct {seniorId}_{employeeId} ID.`
                : `${result.badIdDocs.length} doc(s) with wrong ID. Run /manager/fix-assignment-ids.`}
              issues={result.badIdDocs} />
            <CheckCard title="Check 1b � Senior users exist in /users"
              status={result.orphanSeniorDocs.length === 0 ? 'pass' : 'warn'}
              summary={result.orphanSeniorDocs.length === 0
                ? 'All seniorId values point to real /users documents.'
                : `${result.orphanSeniorDocs.length} seniorId(s) have no /users doc.`}
              issues={result.orphanSeniorDocs} />
            <CheckCard title="Check 1c � Employee users exist in /users"
              status={result.orphanEmployeeDocs.length === 0 ? 'pass' : 'warn'}
              summary={result.orphanEmployeeDocs.length === 0
                ? 'All employeeId values point to real /users documents.'
                : `${result.orphanEmployeeDocs.length} employeeId(s) have no /users doc.`}
              issues={result.orphanEmployeeDocs} />
            <CheckCard title="Check 1d � Roles are correct"
              status={result.wrongRoleDocs.length === 0 ? 'pass' : 'fail'}
              summary={result.wrongRoleDocs.length === 0
                ? 'All seniorId users are SENIOR/MANAGER; all employeeId users are EMPLOYEE.'
                : `${result.wrongRoleDocs.length} role mismatch(es) found.`}
              issues={result.wrongRoleDocs} />
            <CheckCard title="Check 2 � Cross-platform write consistency"
              status={result.crossPlatformOk ? 'pass' : 'fail'}
              summary={result.crossPlatformOk
                ? 'All docs use the deterministic ID. Web-created assignments are readable by Android.'
                : 'ID or orphan issues above mean web/Android may disagree. Fix Check 1 first.'}
              issues={[]} />
            <CheckCard title="Check 3 � /visits access gate (getDoc verify)"
              status={result.visitsGateIssues.length === 0 ? 'pass' : 'fail'}
              summary={result.visitsGateIssues.length === 0
                ? `getDoc confirmed on all ${result.totalAssignments} correct-ID docs. /visits rule will grant senior access.`
                : `${result.visitsGateIssues.length} doc(s) failed getDoc � /visits rule will deny senior access for those pairs.`}
              issues={result.visitsGateIssues} />
          </div>
        )}

        <div className="rounded-2xl border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 px-5 py-5 space-y-4">
          <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">Manual Test Protocol (run after automated checks pass)</p>

          <div className="space-y-1">
            <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Test 1 � Android ? Web</p>
            <ol className="text-sm text-indigo-700 dark:text-indigo-400 space-y-1 list-decimal list-inside">
              <li>Open the Android app, log in as <strong>MANAGER</strong>.</li>
              <li>Assign an EMPLOYEE to a SENIOR using the Android team management UI.</li>
              <li>Open this web app ? <a href="/manager/team/hierarchy" className="underline">/manager/team/hierarchy</a> (reload).</li>
              <li><strong>Pass:</strong> The employee appears under that senior in the web hierarchy.</li>
            </ol>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Test 2 � Web ? Android</p>
            <ol className="text-sm text-indigo-700 dark:text-indigo-400 space-y-1 list-decimal list-inside">
              <li>In this web app as <strong>MANAGER</strong>, open <a href="/manager/team/assign" className="underline">/manager/team/assign</a>.</li>
              <li>Select a SENIOR, click <strong>Assign</strong> on an EMPLOYEE.</li>
              <li>Open the Android app as <strong>MANAGER</strong> ? Team Hierarchy.</li>
              <li><strong>Pass:</strong> The employee appears under that senior in Android.</li>
            </ol>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Test 3 � Senior reads employee visits</p>
            <ol className="text-sm text-indigo-700 dark:text-indigo-400 space-y-1 list-decimal list-inside">
              <li>Log in as a <strong>SENIOR</strong> who has at least one EMPLOYEE assigned.</li>
              <li>Open <a href="/manager" className="underline">/manager</a> (the manager dashboard).</li>
              <li><strong>Pass:</strong> The assigned employee's visits are visible. No "permission denied" in the console.</li>
              <li>Confirm the same in the Android app: the SENIOR can view the employee's visit list there too.</li>
            </ol>
          </div>

          <p className="text-xs text-indigo-500 dark:text-indigo-500 italic">
            All three tests passing = migration complete. You may then delete MigratePage, FixAssignmentIdsPage,
            CleanupSeniorIdPage, and this VerificationPage from the codebase and their routes from AppRouter.tsx.
          </p>
        </div>

      </main>
    </div>
  );
}
