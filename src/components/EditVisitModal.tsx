// EditVisitModal — slide-over modal for editing an existing visit.
//
// Pre-populates all fields from the existing Visit object.
// Shares the same field layout and location flow as AddVisitModal.
//
// On submit:
//   • Validates required fields (same rules as create)
//   • Calls updateVisit() → Firestore updateDoc
//   • onClose() — onSnapshot in useVisits() auto-refreshes the detail page
//
// The 24-hour edit window is enforced server-side by Firestore rules.
// The parent (VisitDetailPage) hides the Edit button when the window has
// passed, but even if the button were shown, Firestore would reject the write.

import { useEffect, useRef, useState } from 'react';
import { updateVisit } from '../services/visits.service';
import { getCurrentPosition, reverseGeocode, locationErrorMessage, LocationError } from '../utils/location';
import { PURPOSE_LABELS } from '../utils/helpers';
import { friendlyFirestoreError } from '../utils/firestoreError';
import MapPicker from './MapPicker';
import type { UpdateVisitInput, Visit, VisitPurpose } from '../types';

interface EditVisitModalProps {
  visit: Visit;
  onClose: () => void;
}

type LocationState =
  | { kind: 'gps'; lat: number; lng: number; address: string; regeocoding: boolean }
  | { kind: 'manual'; reason: string }
  | { kind: 'detecting' };

function visitToInput(v: Visit): UpdateVisitInput {
  return {
    purpose:            v.purpose,
    doctorContactName:  v.doctorContactName,
    doctorContactPhone: v.doctorContactPhone,
    doctorSpeciality:   v.doctorSpeciality,
    clinicHospitalName: v.clinicHospitalName,
    notes:              v.notes,
    nextAction:         v.nextAction,
    followUpDate:       v.followUpDate,
    latitude:           v.latitude,
    longitude:          v.longitude,
    manualAddress:      v.manualAddress,
    address:            v.address,
  };
}

export default function EditVisitModal({ visit, onClose }: EditVisitModalProps) {
  const [form, setForm]             = useState<UpdateVisitInput>(() => visitToInput(visit));
  const [errors, setErrors]         = useState<Partial<Record<keyof UpdateVisitInput, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLSelectElement>(null);

  // Initialise location state from the existing visit data.
  const hasGps = visit.latitude !== 0 || visit.longitude !== 0;
  const [locationState, setLoc] = useState<LocationState>(
    hasGps
      ? { kind: 'gps', lat: visit.latitude, lng: visit.longitude, address: visit.address, regeocoding: false }
      : { kind: 'manual', reason: 'No GPS coordinates on this visit. Enter or update the address below.' },
  );

  useEffect(() => { firstFieldRef.current?.focus(); }, []);
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function detectLocation() {
    setLoc({ kind: 'detecting' });
    try {
      const { latitude, longitude } = await getCurrentPosition();
      setLoc({ kind: 'gps', lat: latitude, lng: longitude, address: '', regeocoding: true });
      setForm((f) => ({ ...f, latitude, longitude }));
      const addr = await reverseGeocode(latitude, longitude);
      setLoc((prev) =>
        prev.kind === 'gps' ? { ...prev, address: addr, regeocoding: false } : prev,
      );
      setForm((f) => ({ ...f, address: addr }));
    } catch (err) {
      const msg = err instanceof LocationError
        ? locationErrorMessage(err)
        : 'Could not get your location. Please type your address manually.';
      setLoc({ kind: 'manual', reason: msg });
    }
  }

  function set<K extends keyof UpdateVisitInput>(key: K, value: UpdateVisitInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof UpdateVisitInput, string>> = {};
    if (!form.doctorContactName.trim()) next.doctorContactName = 'Doctor / contact name is required.';
    if (!form.clinicHospitalName.trim()) next.clinicHospitalName = 'Clinic / hospital name is required.';
    const hasLocation =
      form.latitude !== 0 || form.longitude !== 0 || form.manualAddress.trim() !== '';
    if (!hasLocation) next.manualAddress = 'Please provide a location (GPS or address).';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await updateVisit(visit.id, form);
      onClose();
    } catch (err) {
      const msg = friendlyFirestoreError(err);
      if (msg.includes('permission') || msg.includes('PERMISSION_DENIED')) {
        setSubmitError(
          'Edit rejected by the server. The 24-hour edit window for this visit has expired, or you do not have permission to edit it.',
        );
      } else {
        setSubmitError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Edit visit"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <div className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Edit Visit</h2>
          <button type="button" onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close">
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Scrollable form body */}
        <form id="edit-visit-form" onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-4" noValidate>

          <Field label="Purpose" required>
            <select ref={firstFieldRef} value={form.purpose}
              onChange={(e) => set('purpose', e.target.value as VisitPurpose)}
              className={ic(false)}>
              {(Object.keys(PURPOSE_LABELS) as VisitPurpose[]).map((p) => (
                <option key={p} value={p}>{PURPOSE_LABELS[p]}</option>
              ))}
            </select>
          </Field>

          <Field label="Doctor / Contact Name" required error={errors.doctorContactName}>
            <input type="text" placeholder="Dr. Jane Smith"
              value={form.doctorContactName}
              onChange={(e) => set('doctorContactName', e.target.value)}
              className={ic(!!errors.doctorContactName)} />
          </Field>

          <Field label="Phone Number">
            <input type="tel" placeholder="+1 555 000 0000"
              value={form.doctorContactPhone}
              onChange={(e) => set('doctorContactPhone', e.target.value)}
              className={ic(false)} />
          </Field>

          <Field label="Speciality">
            <input type="text" placeholder="Cardiology"
              value={form.doctorSpeciality}
              onChange={(e) => set('doctorSpeciality', e.target.value)}
              className={ic(false)} />
          </Field>

          <Field label="Clinic / Hospital Name" required error={errors.clinicHospitalName}>
            <input type="text" placeholder="City General Hospital"
              value={form.clinicHospitalName}
              onChange={(e) => set('clinicHospitalName', e.target.value)}
              className={ic(!!errors.clinicHospitalName)} />
          </Field>

          <Field label="Notes">
            <textarea placeholder="Any additional notes…"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              className={ic(false) + ' resize-none'} />
          </Field>

          <Field label="Next Action">
            <input type="text" placeholder="Send product catalogue…"
              value={form.nextAction}
              onChange={(e) => set('nextAction', e.target.value)}
              className={ic(false)} />
          </Field>

          <Field label="Follow-up Date">
            <input type="date"
              value={form.followUpDate != null ? toDateVal(form.followUpDate) : ''}
              onChange={(e) =>
                set('followUpDate', e.target.value ? new Date(e.target.value).getTime() : null)
              }
              className={ic(false)} />
          </Field>

          {/* Location */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-600">Location</span>
              <button type="button" onClick={detectLocation}
                disabled={locationState.kind === 'detecting'}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50 disabled:cursor-wait transition-colors">
                {locationState.kind === 'detecting' ? 'Detecting…' : '⟳ Re-detect GPS'}
              </button>
            </div>

            {locationState.kind === 'detecting' && (
              <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                <svg className="animate-spin w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Detecting your location…
              </div>
            )}

            {locationState.kind === 'gps' && (
              <div className="space-y-2">
                <MapPicker lat={locationState.lat} lng={locationState.lng}
                    onPinMoved={async (lat, lng) => {
                      setLoc((prev) => prev.kind === 'gps' ? { ...prev, lat, lng, regeocoding: true } : prev);
                      setForm((f) => ({ ...f, latitude: lat, longitude: lng }));
                      const addr = await reverseGeocode(lat, lng);
                      setLoc((prev) => prev.kind === 'gps' ? { ...prev, address: addr, regeocoding: false } : prev);
                      setForm((f) => ({ ...f, address: addr }));
                    }} />
                <div className="text-xs text-gray-500">
                  {locationState.regeocoding
                    ? <span className="italic">Reverse-geocoding…</span>
                    : locationState.address
                      ? <><span className="font-medium text-gray-700">Address: </span>{locationState.address}</>
                      : <span>Drag the pin to adjust, or type an address below.</span>}
                </div>
                <input type="text" placeholder="Override address (optional)"
                  value={form.manualAddress}
                  onChange={(e) => set('manualAddress', e.target.value)}
                  className={ic(false) + ' text-sm'} />
              </div>
            )}

            {locationState.kind === 'manual' && (
              <div className="space-y-2">
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  {locationState.reason}
                </p>
                <Field label="Address" required error={errors.manualAddress}>
                  <input type="text" placeholder="123 Main St, City, Country"
                    value={form.manualAddress}
                    onChange={(e) => set('manualAddress', e.target.value)}
                    className={ic(!!errors.manualAddress)} />
                </Field>
              </div>
            )}
            {errors.manualAddress && locationState.kind !== 'manual' && (
              <p className="text-xs text-red-600">{errors.manualAddress}</p>
            )}
          </div>

          {submitError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3 shrink-0">
          <button type="button" onClick={onClose} disabled={submitting}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors">
            Cancel
          </button>
          <button type="submit" form="edit-visit-form"
            disabled={submitting || locationState.kind === 'detecting'}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
            {submitting
              ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>Saving…</>
              : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ic(hasError: boolean): string {
  return [
    'w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-400',
    'focus:outline-none focus:ring-2 focus:border-transparent',
    hasError ? 'border-red-300 focus:ring-red-400' : 'border-gray-200 focus:ring-blue-400',
  ].join(' ');
}

function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-gray-600">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function toDateVal(epochMs: number): string {
  const d = new Date(epochMs);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

