// Firestore users collection service.
// Handles reading and writing `users/{uid}` documents.
// Field names must exactly match what the Android app writes (snake-case-free,
// camelCase Kotlin data class serialised by Firebase).

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { AppUser, UserRole } from '../types';

const USERS = 'users';

/**
 * Write a new user document after self-signup.
 * Role is always hardcoded to 'EMPLOYEE' — matching Firestore security rules
 * which enforce `request.resource.data.role == 'EMPLOYEE'` on create.
 */
export async function createUserDoc(
  uid: string,
  name: string,
  email: string,
): Promise<void> {
  const userRef = doc(db, USERS, uid);
  await setDoc(userRef, {
    uid,
    name,
    email,
    phoneNumber: '',
    role: 'EMPLOYEE',            // hardcoded — rules reject anything else on self-create
    createdAt: Date.now(),       // epoch ms, mirrors Android System.currentTimeMillis()
    seniorId: null,
  });
}

/**
 * Fetch a user document from Firestore.
 * Returns null if the document does not exist (e.g. deleted user).
 */
export async function getUserDoc(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, USERS, uid));
  if (!snap.exists()) return null;

  const data = snap.data();
  return {
    uid:         data['uid']         ?? uid,
    name:        data['name']        ?? '',
    email:       data['email']       ?? '',
    phoneNumber: data['phoneNumber'] ?? '',
    role:        data['role']        ?? 'EMPLOYEE',
    createdAt:   data['createdAt']   ?? 0,
    seniorId:    data['seniorId']    ?? null,
  } as AppUser;
}

/**
 * Fetch all user documents (Manager only — Firestore rules enforce this).
 * Returns users sorted by name.
 */
export async function getAllUsers(): Promise<AppUser[]> {
  const q = query(collection(db, USERS), orderBy('name', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      uid:         data['uid']         ?? d.id,
      name:        data['name']        ?? '',
      email:       data['email']       ?? '',
      phoneNumber: data['phoneNumber'] ?? '',
      role:        data['role']        ?? 'EMPLOYEE',
      createdAt:   data['createdAt']   ?? 0,
      seniorId:    data['seniorId']    ?? null,
    } as AppUser;
  });
}

/**
 * Update the role of a user (Manager only).
 */
export async function updateUserRole(uid: string, role: UserRole): Promise<void> {
  await updateDoc(doc(db, USERS, uid), { role });
}

/**
 * Assign an employee to a senior (sets seniorId field on the employee's doc).
 * Pass null to unassign.
 */
export async function assignEmployeeToSenior(
  employeeUid: string,
  seniorUid: string | null,
): Promise<void> {
  await updateDoc(doc(db, USERS, employeeUid), { seniorId: seniorUid });
}

/**
 * Get all employees assigned to a specific senior.
 */
export async function getEmployeesBySenior(seniorUid: string): Promise<AppUser[]> {
  const q = query(
    collection(db, USERS),
    where('seniorId', '==', seniorUid),
    orderBy('name', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      uid:         data['uid']         ?? d.id,
      name:        data['name']        ?? '',
      email:       data['email']       ?? '',
      phoneNumber: data['phoneNumber'] ?? '',
      role:        data['role']        ?? 'EMPLOYEE',
      createdAt:   data['createdAt']   ?? 0,
      seniorId:    data['seniorId']    ?? null,
    } as AppUser;
  });
}

// Re-export serverTimestamp in case other services need it.
export { serverTimestamp };

