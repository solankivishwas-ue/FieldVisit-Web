// Firestore visits collection service.
// Pagination: page 1 = onSnapshot (realtime); pages 2+ = getDocs + startAfter.
// Sort:    createdAt asc/desc | purpose asc | clinicHospitalName asc
// Filters: purpose == X | dateFrom >= | dateTo <= | clinic/employee = client-side
//
// INDEX CONSTRAINT enforced here and in useVisits:
//   When a date-range filter is active, sort is clamped to createdAt because
//   Firestore disallows inequality-filter-field != orderBy-field.

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  type Query,
  type DocumentData,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
  type Unsubscribe,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Visit, VisitPurpose, SyncStatus, CreateVisitInput, UpdateVisitInput } from '../types';

export const PAGE_SIZE = 20;
const VISITS = 'visits';

// -- Sort config
export type SortField = 'createdAt' | 'purpose' | 'clinicHospitalName';
export type SortDir   = 'asc' | 'desc';
export interface VisitSort { field: SortField; dir: SortDir; }
export const DEFAULT_SORT: VisitSort = { field: 'createdAt', dir: 'desc' };

// -- Filter config (server-side fields only)
export interface VisitFilters {
  purpose:  VisitPurpose | '';  // '' = no filter
  dateFrom: number | null;      // epoch ms, inclusive
  dateTo:   number | null;      // epoch ms, inclusive
}
export const DEFAULT_FILTERS: VisitFilters = { purpose: '', dateFrom: null, dateTo: null };

export function hasDateRange(f: VisitFilters): boolean {
  return f.dateFrom !== null || f.dateTo !== null;
}
// -- docToVisit
export function docToVisit(docId: string, data: DocumentData): Visit {
  const purposeStr: string = (data['purpose'] as string | undefined) ?? 'OTHER';
  const validPurposes: VisitPurpose[] = [
    'SERVICE', 'COLD_CALL', 'SALES_FOLLOW_UP', 'PRODUCT_DEMO',
    'INSTALLATION', 'REMOTE_SUPPORT', 'OTHER',
  ];
  const purpose: VisitPurpose = validPurposes.includes(purposeStr.toUpperCase() as VisitPurpose)
    ? (purposeStr.toUpperCase() as VisitPurpose) : 'OTHER';

  const syncStr: string = (data['syncStatus'] as string | undefined) ?? 'SYNCED';
  const syncStatus: SyncStatus =
    syncStr === 'PENDING' ? 'PENDING' : syncStr === 'FAILED' ? 'FAILED' : 'SYNCED';

  const doctorContactName  = (data['doctorContactName']  as string) || (data['contactName']  as string) || '';
  const doctorContactPhone = (data['doctorContactPhone'] as string) || (data['contactPhone'] as string) || '';
  const clinicHospitalName = (data['clinicHospitalName'] as string) || (data['companyName']  as string) || '';

  return {
    id:                (data['id']              as string) || docId,
    userId:            (data['userId']           as string) || '',
    userName:          (data['userName']         as string) || '',
    doctorContactName,
    doctorContactPhone,
    doctorSpeciality:  (data['doctorSpeciality'] as string) || '',
    clinicHospitalName,
    notes:             (data['notes']            as string) || '',
    nextAction:        (data['nextAction']       as string) || '',
    latitude:          (data['latitude']         as number) ?? 0,
    longitude:         (data['longitude']        as number) ?? 0,
    manualAddress:     (data['manualAddress']    as string) || '',
    address:           (data['address']          as string) || '',
    purpose,
    followUpDate:      (data['followUpDate']     as number | null) ?? null,
    photoUrl:          (data['photoUrl']         as string | null) ?? null,
    voiceNoteUrl:      (data['voiceNoteUrl']     as string | null) ?? null,
    createdAt:         (data['createdAt']        as number) ?? Date.now(),
    updatedAt:         (data['updatedAt']        as number) ?? Date.now(),
    syncStatus,
  };
}
// -- Sort constraints helper
// When date range active, must orderBy createdAt first (Firestore rule).
function sortConstraints(sort: VisitSort, filters: VisitFilters): QueryConstraint[] {
  const effectiveField = hasDateRange(filters) ? 'createdAt' : sort.field;
  if (effectiveField === 'createdAt') {
    return [orderBy('createdAt', sort.dir)];
  }
  return [orderBy(effectiveField, 'asc'), orderBy('createdAt', 'desc')];
}

// -- Filter constraints (server-side)
function filterConstraints(filters: VisitFilters): QueryConstraint[] {
  const out: QueryConstraint[] = [];
  if (filters.purpose) out.push(where('purpose', '==', filters.purpose));
  if (filters.dateFrom !== null) out.push(where('createdAt', '>=', filters.dateFrom));
  if (filters.dateTo   !== null) out.push(where('createdAt', '<=', filters.dateTo));
  return out;
}

// -- onSnapshot subscriptions (page 1, realtime)
export function subscribeToEmployeeVisits(
  uid: string,
  sort: VisitSort,
  filters: VisitFilters,
  onData: (visits: Visit[], lastDoc: QueryDocumentSnapshot | null) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, VISITS),
    where('userId', '==', uid),
    ...filterConstraints(filters),
    ...sortConstraints(sort, filters),
    limit(PAGE_SIZE),
  );
  return onSnapshot(q, (snap) => {
    const visits: Visit[] = snap.docs
      .map((d) => { try { return docToVisit(d.id, d.data()); } catch { return null; } })
      .filter((v): v is Visit => v !== null);
    onData(visits, snap.docs[snap.docs.length - 1] ?? null);
  }, onError);
}

export function subscribeToAllVisits(
  sort: VisitSort,
  filters: VisitFilters,
  onData: (visits: Visit[], lastDoc: QueryDocumentSnapshot | null) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, VISITS),
    ...filterConstraints(filters),
    ...sortConstraints(sort, filters),
    limit(PAGE_SIZE),
  );
  return onSnapshot(q, (snap) => {
    const visits: Visit[] = snap.docs
      .map((d) => { try { return docToVisit(d.id, d.data()); } catch { return null; } })
      .filter((v): v is Visit => v !== null);
    onData(visits, snap.docs[snap.docs.length - 1] ?? null);
  }, onError);
}
// -- Next-page one-shot fetches
export async function fetchEmployeeVisitsPage(
  uid: string,
  sort: VisitSort,
  filters: VisitFilters,
  cursor: DocumentSnapshot,
): Promise<{ visits: Visit[]; lastDoc: QueryDocumentSnapshot | null }> {
  return _fetchPage(query(
    collection(db, VISITS),
    where('userId', '==', uid),
    ...filterConstraints(filters),
    ...sortConstraints(sort, filters),
    startAfter(cursor),
    limit(PAGE_SIZE),
  ));
}

export async function fetchAllVisitsPage(
  sort: VisitSort,
  filters: VisitFilters,
  cursor: DocumentSnapshot,
): Promise<{ visits: Visit[]; lastDoc: QueryDocumentSnapshot | null }> {
  return _fetchPage(query(
    collection(db, VISITS),
    ...filterConstraints(filters),
    ...sortConstraints(sort, filters),
    startAfter(cursor),
    limit(PAGE_SIZE),
  ));
}

async function _fetchPage(
  q: Query,
): Promise<{ visits: Visit[]; lastDoc: QueryDocumentSnapshot | null }> {
  const snap = await getDocs(q);
  const visits: Visit[] = snap.docs
    .map((d) => { try { return docToVisit(d.id, d.data()); } catch { return null; } })
    .filter((v): v is Visit => v !== null);
  return { visits, lastDoc: snap.docs[snap.docs.length - 1] ?? null };
}

// -- Single-document fetch (detail page bypass)
export async function fetchVisitById(visitId: string): Promise<Visit | null> {
  const snap = await getDoc(doc(db, VISITS, visitId));
  if (!snap.exists()) return null;
  try { return docToVisit(snap.id, snap.data()); } catch { return null; }
}
// -- Create
export async function createVisit(
  input: CreateVisitInput,
  uid: string,
  userName: string,
): Promise<Visit> {
  const id  = crypto.randomUUID();
  const now = Date.now();
  const visitData: Visit = {
    id,
    userId:             uid,
    userName,
    purpose:            input.purpose,
    doctorContactName:  input.doctorContactName.trim(),
    doctorContactPhone: input.doctorContactPhone.trim(),
    doctorSpeciality:   input.doctorSpeciality.trim(),
    clinicHospitalName: input.clinicHospitalName.trim(),
    notes:              input.notes.trim(),
    nextAction:         input.nextAction.trim(),
    followUpDate:       input.followUpDate,
    latitude:           input.latitude,
    longitude:          input.longitude,
    manualAddress:      input.manualAddress.trim(),
    address:            input.address.trim(),
    photoUrl:           null,
    voiceNoteUrl:       null,
    createdAt:          now,
    updatedAt:          now,
    syncStatus:         'SYNCED',
  };
  await setDoc(doc(db, VISITS, id), visitData);
  return visitData;
}

// -- Update
export async function updateVisit(visitId: string, input: UpdateVisitInput): Promise<void> {
  await updateDoc(doc(db, VISITS, visitId), {
    purpose:            input.purpose,
    doctorContactName:  input.doctorContactName.trim(),
    doctorContactPhone: input.doctorContactPhone.trim(),
    doctorSpeciality:   input.doctorSpeciality.trim(),
    clinicHospitalName: input.clinicHospitalName.trim(),
    notes:              input.notes.trim(),
    nextAction:         input.nextAction.trim(),
    followUpDate:       input.followUpDate,
    latitude:           input.latitude,
    longitude:          input.longitude,
    manualAddress:      input.manualAddress.trim(),
    address:            input.address.trim(),
    updatedAt:          Date.now(),
  });
}

// -- Delete
export async function deleteVisit(visitId: string): Promise<void> {
  await deleteDoc(doc(db, VISITS, visitId));
}
