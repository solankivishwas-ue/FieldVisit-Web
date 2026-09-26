// Firestore users collection service.
// Handles reading and writing `users/{uid}` documents, and the
// `assignments/{seniorId}_{employeeId}` collection for employee→senior links.
// Field names must exactly match what the Android app writes (camelCase,
// mirroring Kotlin data class serialisation by Firebase).

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import type { QueryDocumentSnapshot, DocumentSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { AppUser, UserRole } from '../types';

const USERS       = 'users';
const ASSIGNMENTS = 'assignments';

// ── Internal helper ───────────────────────────────────────────────────────────

/** Map a Firestore snapshot into an AppUser. seniorId is left undefined here;
 *  getAllUsersWithAssignments() hydrates it separately from /assignments. */
function docToAppUser(d: QueryDocumentSnapshot | DocumentSnapshot): AppUser {
  const data = d.data() ?? {};
  return {
    uid:         (data['uid']         as string)           ?? d.id,
    name:        (data['name']        as string)           ?? '',
    email:       (data['email']       as string)           ?? '',
    phoneNumber: (data['phoneNumber'] as string)           ?? '',
    role:        (data['role']        as AppUser['role'])  ?? 'EMPLOYEE',
    createdAt:   (data['createdAt']   as number)           ?? 0,
    seniorId:    undefined, // hydrated from /assignments, never from user doc
  };
}


/**
 * Write a new user document after self-signup.
 * Role is always hardcoded to 'EMPLOYEE' — matching Firestore security rules
 * which enforce `request.resource.data.role == 'EMPLOYEE'` on create.
 * seniorId is NOT written to the user doc — assignments live in /assignments.
 */
export async function createUserDoc(
  uid: string,
  name: string,
  email: string,
): Promise<void> {
  await setDoc(doc(db, USERS, uid), {
    uid,
    name,
    email,
    phoneNumber: '',
    role: 'EMPLOYEE',      // hardcoded — rules reject anything else on self-create
    createdAt: Date.now(), // epoch ms, mirrors Android System.currentTimeMillis()
  });
}

/**
 * Fetch a single user document. Returns null if not found.
 * seniorId is NOT hydrated — use getAllUsersWithAssignments() when you need it.
 */
export async function getUserDoc(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, USERS, uid));
  if (!snap.exists()) return null;
  return docToAppUser(snap);
}

/**
 * Fetch all user documents sorted by name (Manager only).
 * seniorId is NOT populated. Use getAllUsersWithAssignments() for pages that
 * need assignment state (AssignEmployeesPage, TeamHierarchyPage).
 */
export async function getAllUsers(): Promise<AppUser[]> {
  const snap = await getDocs(query(collection(db, USERS), orderBy('name', 'asc')));
  return snap.docs.map(docToAppUser);
}

/**
 * Fetch all users AND hydrate each employee's seniorId from /assignments.
 *
 * ── BEFORE (old web schema) ──────────────────────────────────────────────────
 * getAllUsers() read seniorId directly off each /users/{uid} document:
 *   seniorId: data['seniorId'] ?? null
 *
 * ── AFTER (Android-compatible schema) ────────────────────────────────────────
 * seniorId no longer lives on /users docs. Instead:
 *   1. Fetch /users (orderBy name) and /assignments simultaneously.
 *   2. Build Map<employeeId → seniorId> from the assignments snapshot.
 *   3. Stamp seniorId onto each AppUser whose uid appears as an employeeId.
 *
 * The returned objects carry seniorId exactly as before, so all existing UI
 * logic (toggle detection, unassigned filter, getTeam) is unchanged.
 */
export async function getAllUsersWithAssignments(): Promise<AppUser[]> {
  const [usersSnap, assignSnap] = await Promise.all([
    getDocs(query(collection(db, USERS), orderBy('name', 'asc'))),
    getDocs(collection(db, ASSIGNMENTS)),
  ]);

  // Build employeeId → seniorId lookup from /assignments.
  const seniorByEmployee = new Map<string, string>();
  for (const a of assignSnap.docs) {
    const d          = a.data();
    const seniorId   = d['seniorId']   as string | undefined;
    const employeeId = d['employeeId'] as string | undefined;
    if (seniorId && employeeId) seniorByEmployee.set(employeeId, seniorId);
  }

  return usersSnap.docs.map((d) => {
    const user = docToAppUser(d);
    user.seniorId = seniorByEmployee.get(user.uid) ?? null;
    return user;
  });
}

/** Update the role of a user (Manager only). */
export async function updateUserRole(uid: string, role: UserRole): Promise<void> {
  await updateDoc(doc(db, USERS, uid), { role });
}

// ── Assignment functions ───────────────────────────────────────────────────────
//
// ── BEFORE (old web schema) ──────────────────────────────────────────────────
// assignEmployeeToSenior(employeeUid, seniorUid | null):
//   updateDoc(users/{employeeUid}, { seniorId: seniorUid })
//
// ── AFTER (Android-compatible schema) ────────────────────────────────────────
// assignEmployeeToSenior(employeeUid, newSeniorUid | null, currentSeniorUid?):
//   unassign old: deleteDoc(assignments/{currentSeniorUid}_{employeeUid})
//   assign new:   setDoc(assignments/{newSeniorUid}_{employeeUid}, { seniorId, employeeId })
//   The deterministic document ID matches Android's AssignmentRepositoryImpl exactly.

/**
 * Assign or unassign an employee to/from a senior.
 *
 * @param employeeUid      UID of the employee being assigned/unassigned.
 * @param newSeniorUid     New senior's UID, or null to fully unassign.
 * @param currentSeniorUid Current senior's UID (if any). Required to delete
 *                         the existing assignment doc on reassign or unassign.
 */
export async function assignEmployeeToSenior(
  employeeUid: string,
  newSeniorUid: string | null,
  currentSeniorUid?: string | null,
): Promise<void> {
  // Delete the existing assignment doc first (if the employee had one).
  if (currentSeniorUid) {
    await deleteDoc(doc(db, ASSIGNMENTS, `${currentSeniorUid}_${employeeUid}`));
  }
  // Write the new assignment doc (if a senior is being set).
  if (newSeniorUid) {
    await setDoc(
      doc(db, ASSIGNMENTS, `${newSeniorUid}_${employeeUid}`),
      { seniorId: newSeniorUid, employeeId: employeeUid },
      { merge: false },
    );
  }
}

// ── BEFORE (old web schema) ──────────────────────────────────────────────────
// getEmployeesBySenior(seniorUid):
//   query(users, where('seniorId', '==', seniorUid), orderBy('name', 'asc'))
//   → AppUser[] with seniorId populated from the /users doc field
//
// ── AFTER (Android-compatible schema) ────────────────────────────────────────
// getEmployeesBySenior(seniorUid):
//   1. query(assignments, where('seniorId', '==', seniorUid))
//   2. Extract employeeId values from matching docs.
//   3. getDoc() each /users/{employeeId} in parallel.
//   4. Return AppUser[] sorted by name, with seniorId injected.

/**
 * Get all employees assigned to a specific senior.
 * Queries /assignments where seniorId == seniorUid, then fetches each
 * employee's /users document in parallel and returns sorted by name.
 */
export async function getEmployeesBySenior(seniorUid: string): Promise<AppUser[]> {
  const assignSnap = await getDocs(
    query(collection(db, ASSIGNMENTS), where('seniorId', '==', seniorUid)),
  );
  if (assignSnap.empty) return [];

  const employeeIds = assignSnap.docs
    .map((d) => d.data()['employeeId'] as string)
    .filter(Boolean);

  const userSnaps = await Promise.all(
    employeeIds.map((eid) => getDoc(doc(db, USERS, eid))),
  );

  return userSnaps
    .filter((s) => s.exists())
    .map((s) => {
      const user = docToAppUser(s);
      user.seniorId = seniorUid;
      return user;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Re-export serverTimestamp in case other services need it.
export { serverTimestamp };



