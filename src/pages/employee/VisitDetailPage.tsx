import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useVisits } from '../../hooks/useVisits';
import { deleteVisit, fetchVisitById } from '../../services/visits.service';
import NavBar from '../../components/NavBar';
import LoadingSpinner from '../../components/LoadingSpinner';
import EditVisitModal from '../../components/EditVisitModal';
import ErrorBoundary from '../../components/ErrorBoundary';
import { purposeLabel, formatDateTime, formatDate } from '../../utils/helpers';
import { friendlyFirestoreError } from '../../utils/firestoreError';
import type { Visit } from '../../types';

const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export default function VisitDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { appUser }         = useAuth();
  const { visits, loading } = useVisits();
  const [showEdit, setShowEdit]                   = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting]                   = useState(false);
  const [deleteError, setDeleteError]             = useState<string | null>(null);

  // Try to find the visit in the already-loaded page; if not found (e.g. the
  // user navigated directly via URL and it's on a page not yet loaded),
  // fall back to a one-shot Firestore fetch.
  const visitFromList = visits.find((v) => v.id === id);
  const [fetchedVisit, setFetchedVisit] = useState<Visit | null | undefined>(undefined); // undefined = pending

  useEffect(() => {
    // Only fetch from Firestore when the list is done loading and still no match
    if (loading) return;
    if (visitFromList) { setFetchedVisit(null); return; } // mark as "not needed"
    if (!id) { setFetchedVisit(null); return; }
    fetchVisitById(id).then((v) => setFetchedVisit(v));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, visitFromList, id]);

  const visit = visitFromList ?? (fetchedVisit === undefined ? undefined : fetchedVisit ?? null);
  // Still waiting: list loading OR fallback fetch pending
  const detailLoading = loading || (visit === undefined);

  const withinWindow = visit ? (Date.now() - visit.createdAt) < EDIT_WINDOW_MS : false;
  const isOwner      = visit ? appUser?.uid === visit.userId : false;
  const canEdit      = isOwner && withinWindow;
  function mapsUrl(): string {
    if (!visit) return '#';
    if (visit.latitude !== 0 || visit.longitude !== 0) {
      return `https://www.google.com/maps/search/?api=1&query=${visit.latitude},${visit.longitude}`;
    }
    const addr = visit.manualAddress || visit.address || '';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
  }
  const hasMapsTarget = visit && (
    visit.latitude !== 0 || visit.longitude !== 0 ||
    (visit.manualAddress || '').trim() !== '' || (visit.address || '').trim() !== ''
  );

  async function handleDelete() {
    if (!visit) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteVisit(visit.id);
      navigate(-1);
    } catch (err) {
      setDeleteError(friendlyFirestoreError(err));
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  if (detailLoading) return <LoadingSpinner message="Loading visit..." />;
  if (!visit) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <ErrorBoundary>
          <NavBar title="Visit Detail" />
        </ErrorBoundary>
        <main className="max-w-2xl mx-auto px-4 py-10 text-center">
          <p className="text-gray-500 dark:text-gray-400">Visit not found.</p>
          <button type="button" onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            Back
          </button>
        </main>
      </div>
    );
  }  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <ErrorBoundary>
        <NavBar title="Visit Detail" />
      </ErrorBoundary>
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4 pb-10">
        <button type="button" onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 font-medium">
          ← Back to visits
        </button>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <h1 className="text-xl font-bold text-blue-700 dark:text-blue-400">{purposeLabel(visit.purpose)}</h1>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{formatDateTime(visit.createdAt)}</p>
        </div>

        <Section title="Contact">
          <DetailRow label="Name"       value={visit.doctorContactName  || '--'} />
          <DetailRow label="Phone"      value={visit.doctorContactPhone || '--'} />
          <DetailRow label="Speciality" value={visit.doctorSpeciality   || '--'} />
          <DetailRow label="Clinic / Hospital" value={visit.clinicHospitalName || '--'} />
        </Section>

        <Section title="Location">
          {visit.manualAddress && <DetailRow label="Manual Address" value={visit.manualAddress} />}
          {visit.address       && <DetailRow label="Address"        value={visit.address} />}
          {(visit.latitude !== 0 || visit.longitude !== 0) && (
            <DetailRow label="GPS" value={`${visit.latitude.toFixed(6)}, ${visit.longitude.toFixed(6)}`} />
          )}
          {hasMapsTarget && (
            <a href={mapsUrl()} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800">
              Open in Google Maps
            </a>
          )}
        </Section>
        <Section title="Visit Info">
          <DetailRow label="Next Action" value={visit.nextAction || '--'} />
          {visit.followUpDate != null && (
            <DetailRow label="Follow-up Date" value={formatDate(visit.followUpDate)} />
          )}
        </Section>

        {visit.notes && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{visit.notes}</p>
          </div>
        )}

        {isOwner && !withinWindow && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
            This visit was created more than 24 hours ago and can no longer be edited or deleted.
          </div>
        )}
        {deleteError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {deleteError}
          </div>
        )}
        {canEdit && !showDeleteConfirm && (
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowEdit(true)}
              className="flex-1 py-2.5 rounded-xl border border-blue-300 bg-blue-50 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-colors flex items-center justify-center gap-2">
              Edit Visit
            </button>
            <button type="button" onClick={() => { setShowDeleteConfirm(true); setDeleteError(null); }}
              className="flex-1 py-2.5 rounded-xl border border-red-300 bg-red-50 text-sm font-semibold text-red-700 hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
              Delete
            </button>
          </div>
        )}
        {showDeleteConfirm && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-red-800">Delete this visit?</p>
            <p className="text-xs text-red-700">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}
                className="flex-1 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                Cancel
              </button>
              <button type="button" onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center">
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        )}
      </main>
      {showEdit && <EditVisitModal visit={visit} onClose={() => setShowEdit(false)} />}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 space-y-3">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</h2>
      {children}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">{label}</p>
      <p className="mt-0.5 text-sm text-gray-800 dark:text-gray-200">{value}</p>
    </div>
  );
}
