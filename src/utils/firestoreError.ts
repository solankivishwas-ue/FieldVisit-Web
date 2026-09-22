// firestoreError.ts — maps raw Firebase/Firestore error messages and codes
// to friendly, user-facing strings. Used by useVisits, AddVisitModal,
// EditVisitModal, and any other place that surfaces Firestore rejections.
//
// Firebase throws FirebaseError objects whose `.code` is like
// "firestore/permission-denied". We match on both the code and the message
// so this works whether the caller passes err.code or err.message.

/**
 * Maps a Firebase/Firestore error to a short, plain-English message
 * suitable for display in an error banner.
 *
 * @param err - The caught value (may be Error, FirebaseError, or unknown).
 * @returns   - A friendly one-sentence string.
 */
export function friendlyFirestoreError(err: unknown): string {
  // Extract the code / message from whatever was thrown
  let code    = '';
  let message = '';

  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>;
    code    = typeof e['code']    === 'string' ? e['code']    : '';
    message = typeof e['message'] === 'string' ? e['message'] : '';
  }

  // Merge into a single searchable string (lowercase)
  const haystack = `${code} ${message}`.toLowerCase();

  if (haystack.includes('permission-denied') || haystack.includes('missing or insufficient')) {
    return 'Access denied. You don\'t have permission to perform this action.';
  }
  if (haystack.includes('not-found') || haystack.includes('no document')) {
    return 'The requested record could not be found. It may have been deleted.';
  }
  if (haystack.includes('unavailable') || haystack.includes('failed to fetch')) {
    return 'Could not reach the server. Check your internet connection and try again.';
  }
  if (haystack.includes('unauthenticated') || haystack.includes('auth')) {
    return 'You are not signed in. Please sign in and try again.';
  }
  if (haystack.includes('quota-exceeded') || haystack.includes('resource-exhausted')) {
    return 'Service is temporarily unavailable. Please try again in a moment.';
  }
  if (haystack.includes('cancelled')) {
    return 'The operation was cancelled.';
  }
  if (haystack.includes('deadline-exceeded') || haystack.includes('timeout')) {
    return 'The request timed out. Please check your connection and try again.';
  }
  if (haystack.includes('already-exists')) {
    return 'A record with this ID already exists.';
  }

  // Generic fallback — still human-readable
  if (message) return message;
  return 'An unexpected error occurred. Please try again.';
}
