// AddVisitModal — slide-over modal for creating a new visit from the web.
//
// Field order mirrors Android AddVisitScreen:
//   Purpose → Doctor name → Phone → Speciality → Clinic → Notes →
//   Next Action → Follow-up date → Location (GPS or manual address)
//
// Location flow:
//   1. On mount, immediately request browser GPS.
//   2. If granted → show MapPicker with draggable pin + auto reverse-geocode.
//   3. If denied / unavailable → show manualAddress text field instead.
//   4. "Re-detect" button lets user retry GPS at any point.
//
// On submit:
//   • Validates required fields (purpose, doctorContactName, clinicHospitalName)
//   • Calls createVisit() → Firestore write
//   • onClose() — the onSnapshot listener in useVisits() updates the list automatically

import { useEffect, useRef, useState } from 'react';
import { createVisit } from '../services/visits.service';
import { getCurrentPosition, reverseGeocode, locationErrorMessage, LocationError } from '../utils/location';
import { PURPOSE_LABELS } from '../utils/helpers';
import { friendlyFirestoreError } from '../utils/firestoreError';
import MapPicker from './MapPicker';
import type { CreateVisitInput, VisitPurpose } from '../types';

interface AddVisitModalProps {
  uid: string;
  userName: string;
  onClose: () => void;
}

const EMPTY_FORM: CreateVisitInput = {
  purpose:            'OTHER',
  doctorContactName:  '',
  doctorContactPhone: '',
  doctorSpeciality:   '',
  clinicHospitalName: '',
  notes:              '',
  nextAction:         '',
  followUpDate:       null,
  latitude:           0,
  longitude:          0,
  manualAddress:      '',
  address:            '',
};

type LocationState =
  | { kind: 'detecting' }
  | { kind: 'gps'; lat: number; lng: number; address: string; regeocoding: boolean }
  | { kind: 'manual'; reason: string };

export default function AddVisitModal({ uid, userName, onClose }: AddVisitModalProps) {
  const [form, setForm]             = useState<CreateVisitInput>(EMPTY_FORM);
  const [locationState, setLoc]     = useState<LocationState>({ kind: 'detecting' });
  const [errors, setErrors]         = useState<Partial<Record<keyof CreateVisitInput, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLSelectElement>(null);

  useEffect(() => { firstFieldRef.current?.focus(); }, []);
  useEffect(() => { detectLocation(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
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

  async function handlePinMoved(lat: number, lng: number) {
    setForm((f) => ({ ...f, latitude: lat, longitude: lng }));
    if (locationState.kind === 'gps') {
      setLoc((prev) => prev.kind === 'gps' ? { ...prev, lat, lng, address: '', regeocoding: true } : prev);
      const addr = await reverseGeocode(lat, lng);
      setLoc((prev) => prev.kind === 'gps' ? { ...prev, address: addr, regeocoding: false } : prev);
      setForm((f) => ({ ...f, address: addr }));
    }
  }

  function set<K extends keyof CreateVisitInput>(key: K, value: CreateVisitInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.purpose)                   next.purpose           = 'Please select a visit purpose.';
    if (!form.doctorContactName.trim())  next.doctorContactName  = 'Contact name is required.';
    if (!form.clinicHospitalName.trim()) next.clinicHospitalName = 'Clinic / Hospital name is required.';
    if (locationState.kind === 'manual' && !form.manualAddress.trim())
      next.manualAddress = 'Please enter an address or re-detect your location.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload: CreateVisitInput = {
        ...form,
        address:   locationState.kind === 'gps' ? locationState.address : '',
        latitude:  locationState.kind === 'gps' ? locationState.lat : 0,
        longitude: locationState.kind === 'gps' ? locationState.lng : 0,
      };
      await createVisit(payload, uid, userName);
      onClose();
    } catch (err) {
      setSubmitError(friendlyFirestoreError(err));
      setSubmitting(false);
    }
  }


  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog" aria-modal="true" aria-label="New Visit"
    >
      <div className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92dvh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-bold text-gray-900">New Visit</h2>
          <button type="button" onClick={onClose} aria-label="Close"
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M6.293 6.293a1 1 0 011.414 0L10 8.586l2.293-2.293a1 1 0 111.414 1.414L11.414 10l2.293 2.293a1 1 0 01-1.414 1.414L10 11.414l-2.293 2.293a1 1 0 01-1.414-1.414L8.586 10 6.293 7.707a1 1 0 010-1.414z" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <form id="add-visit-form" onSubmit={handleSubmit}
          className="overflow-y-auto flex-1 px-5 py-4 space-y-4" noValidate>

          {/* Purpose */}
          <Field label="Visit Purpose" required error={errors.purpose}>
            <select ref={firstFieldRef} value={form.purpose}
              onChange={(e) => set('purpose', e.target.value as VisitPurpose)}
              className={ic(!!errors.purpose)}>
              {(Object.keys(PURPOSE_LABELS) as VisitPurpose[]).map((p) => (
                <option key={p} value={p}>{PURPOSE_LABELS[p]}</option>
              ))}
            </select>
          </Field>

          {/* Contact group */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Contact</p>
            <Field label="Doctor / Contact Name" required error={errors.doctorContactName}>
              <input type="text" placeholder="Dr. Jane Smith"
                value={form.doctorContactName}
                onChange={(e) => set('doctorContactName', e.target.value)}
                className={ic(!!errors.doctorContactName)} />
            </Field>
            <Field label="Phone">
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
          </div>

          {/* Clinic */}
          <Field label="Clinic / Hospital" required error={errors.clinicHospitalName}>
            <input type="text" placeholder="City General Hospital"
              value={form.clinicHospitalName}
              onChange={(e) => set('clinicHospitalName', e.target.value)}
              className={ic(!!errors.clinicHospitalName)} />
          </Field>

          {/* Notes */}
          <Field label="Notes">
            <textarea rows={3} placeholder="Visit summary, discussion points…"
              value={form.notes} onChange={(e) => set('notes', e.target.value)}
              className={ic(false) + ' resize-none'} />
          </Field>

          {/* Next Action */}
          <Field label="Next Action">
            <input type="text" placeholder="Send brochure, follow up call…"
              value={form.nextAction} onChange={(e) => set('nextAction', e.target.value)}
              className={ic(false)} />
          </Field>

          {/* Follow-up Date */}
          <Field label="Follow-up Date">
            <input type="date"
              value={form.followUpDate ? toDateVal(form.followUpDate) : ''}
              onChange={(e) => set('followUpDate', e.target.value ? new Date(e.target.value).getTime() : null)}
              className={ic(false)} />
          </Field>

          {/* Location */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Location</p>
              {locationState.kind !== 'detecting' && (
                <button type="button" onClick={detectLocation}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                  ↻ Re-detect
                </button>
              )}
            </div>

            {locationState.kind === 'detecting' && (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                <svg className="animate-spin w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Detecting your location…
              </div>
            )}

            {locationState.kind === 'gps' && (
              <div className="space-y-2">
                <MapPicker lat={locationState.lat} lng={locationState.lng} onPinMoved={handlePinMoved} />
                <div className="text-xs text-gray-500 flex items-start gap-1 min-h-[1.25rem]">
                  {locationState.regeocoding
                    ? <><span className="inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mt-0.5" aria-hidden="true" /><span>Resolving address…</span></>
                    : locationState.address
                      ? <><span className="text-green-600 shrink-0" aria-hidden="true">✓</span><span>{locationState.address}</span></>
                      : <span>Drag the pin to adjust, or type an address below.</span>
                  }
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
          <button type="submit" form="add-visit-form"
            disabled={submitting || locationState.kind === 'detecting'}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
            {submitting
              ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>Saving…</>
              : 'Save Visit'}
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
