// Firestore users collection service.
// Handles reading and writing `users/{uid}` documents.
// Field names must exactly match what the Android app writes (snake-case-free,
// camelCase Kotlin data class serialised by Firebase).

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { AppUser } from '../types';

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
  } as AppUser;
}

// Re-export serverTimestamp in case other services need it.
export { serverTimestamp };

