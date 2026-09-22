// Firebase Auth service — thin wrappers around the Firebase JS SDK Auth API.
// All UI error handling is done in the components/context; this layer only throws.

import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../firebase/config';

/** Create a new Firebase Auth user. Returns the FirebaseUser (not yet verified). */
export async function firebaseSignUp(
  email: string,
  password: string,
): Promise<FirebaseUser> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  return credential.user;
}

/** Send an email-verification message to the currently signed-in user. */
export async function firebaseSendEmailVerification(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('No signed-in user to verify.');
  await sendEmailVerification(user);
}

/** Sign in with email + password. Returns the FirebaseUser on success. */
export async function firebaseSignIn(
  email: string,
  password: string,
): Promise<FirebaseUser> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

/** Sign the current user out. */
export async function firebaseSignOut(): Promise<void> {
  await signOut(auth);
}

/** Send a password-reset email. */
export async function firebaseSendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

/** Force-reload the current user's token (used to re-check emailVerified). */
export async function firebaseReloadUser(): Promise<void> {
  await auth.currentUser?.reload();
}

