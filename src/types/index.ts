// Shared TypeScript types — kept in sync with Android domain models.
// Role strings are UPPERCASE to match Firestore documents written by the Android app.

// ── Roles ────────────────────────────────────────────────────────────────────
// Must match Android Role enum: EMPLOYEE, SENIOR, MANAGER
export type UserRole = 'EMPLOYEE' | 'SENIOR' | 'MANAGER';

// ── Firestore `users/{uid}` document ─────────────────────────────────────────
// Mirrors Android: data class User(uid, name, email, phoneNumber, role, createdAt)
// NOTE: seniorId is NOT a Firestore field on this document. It is a runtime-only
// field hydrated from /assignments by getAllUsersWithAssignments(). The field is
// kept optional here so UI code (AssignEmployeesPage, TeamHierarchyPage) that
// reads emp.seniorId continues to work unchanged.
export interface AppUser {
  uid: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: UserRole;
  createdAt: number; // epoch ms
  /**
   * Runtime-only — NOT stored in /users documents.
   * Hydrated from /assignments/{seniorId}_{employeeId} by getAllUsersWithAssignments().
   * undefined when the user was fetched without assignment data (getUserDoc, getAllUsers).
   * null when the employee has no current assignment.
   */
  seniorId?: string | null;
}

// ── Visit ─────────────────────────────────────────────────────────────────────
// Mirrors Android: data class Visit in domain/model/Visit.kt
// Field names are the EXACT camelCase keys written to Firestore.
export type VisitPurpose =
  | 'SERVICE'
  | 'COLD_CALL'
  | 'SALES_FOLLOW_UP'
  | 'PRODUCT_DEMO'
  | 'INSTALLATION'
  | 'REMOTE_SUPPORT'
  | 'OTHER';

export type SyncStatus = 'SYNCED' | 'PENDING' | 'FAILED';

export interface Visit {
  id: string;
  userId: string;
  userName: string;
  doctorContactName: string;
  doctorContactPhone: string;
  doctorSpeciality: string;
  clinicHospitalName: string;
  notes: string;
  nextAction: string;
  latitude: number;
  longitude: number;
  manualAddress: string;
  address: string;
  purpose: VisitPurpose;
  followUpDate: number | null;
  photoUrl: string | null;
  voiceNoteUrl: string | null;
  createdAt: number;
  updatedAt: number;
  syncStatus: SyncStatus;
}

// ── UpdateVisitInput ──────────────────────────────────────────────────────────
// The editable fields for an existing visit.
// Mirrors CreateVisitInput — same fields, used by updateVisit().
// System fields (id, userId, userName, createdAt, syncStatus, photoUrl,
// voiceNoteUrl) are never touched by the web editor; updatedAt is refreshed
// automatically in updateVisit().
export interface UpdateVisitInput {
  purpose: VisitPurpose;
  doctorContactName: string;
  doctorContactPhone: string;
  doctorSpeciality: string;
  clinicHospitalName: string;
  notes: string;
  nextAction: string;
  followUpDate: number | null; // epoch ms, null if not set
  latitude: number;
  longitude: number;
  manualAddress: string;
  address: string;
}

// ── CreateVisitInput ──────────────────────────────────────────────────────────
// The subset of fields the user fills in via the web form.
// System fields (id, userId, userName, createdAt, updatedAt, syncStatus,
// photoUrl, voiceNoteUrl) are derived automatically in createVisit().
export interface CreateVisitInput {
  purpose: VisitPurpose;
  doctorContactName: string;
  doctorContactPhone: string;
  doctorSpeciality: string;
  clinicHospitalName: string;
  notes: string;
  nextAction: string;
  followUpDate: number | null; // epoch ms, null if not set
  latitude: number;
  longitude: number;
  manualAddress: string;
  address: string; // reverse-geocoded label, may be empty
}

