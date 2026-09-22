// FilterPanel -- collapsible filter controls for visit dashboards.
// Server-side filters: purpose (dropdown), date range (from/to).
// Client-side filters: clinic text (in-memory), employee (manager dropdown, in-memory).
//
// INDEX NOTE: clinic and employee filters are client-side only -- Firestore
// has no substring search, and the manager employee-filter is identical in
// structure to the employee-scoped query (no extra indexes needed).

import { useState } from 'react';
import type { VisitFilters } from '../hooks/useVisits';
import { DEFAULT_FILTERS, hasDateRange } from '../hooks/useVisits';
import type { EmployeeOption } from '../hooks/useEmployees';
import type { VisitPurpose } from '../types';

const PURPOSE_OPTIONS: { label: string; value: VisitPurpose }[] = [
  { label: 'Service Visit',   value: 'SERVICE' },
  { label: 'Cold Call',       value: 'COLD_CALL' },
  { label: 'Sales Follow-up', value: 'SALES_FOLLOW_UP' },
  { label: 'Product Demo',    value: 'PRODUCT_DEMO' },
  { label: 'Installation',    value: 'INSTALLATION' },
  { label: 'Remote Support',  value: 'REMOTE_SUPPORT' },
  { label: 'Other',           value: 'OTHER' },
];

interface FilterPanelProps {
  filters:        VisitFilters;
  setFilters:     (f: VisitFilters) => void;
  clinicQuery:    string;
  setClinicQuery: (v: string) => void;
  employeeId?:    string;
  setEmployeeId?: (uid: string) => void;
  employees?:     EmployeeOption[];
  accentColor:    'blue' | 'indigo';
}

export default function FilterPanel({
  filters, setFilters,
  clinicQuery, setClinicQuery,
  employeeId, setEmployeeId,
  employees = [],
  accentColor,
}: FilterPanelProps) {
  const [open, setOpen] = useState(false);

  const a = accentColor;
  const activeBg     = a === 'blue' ? 'bg-blue-600'   : 'bg-indigo-600';
  const activeBorder = a === 'blue' ? 'border-blue-600' : 'border-indigo-600';
  const ring         = a === 'blue' ? 'focus:ring-blue-400' : 'focus:ring-indigo-400';
  const chipBg       = a === 'blue' ? 'bg-blue-100 text-blue-800' : 'bg-indigo-100 text-indigo-800';

  const activeCount = [
    filters.purpose !== '',
    filters.dateFrom !== null || filters.dateTo !== null,
    clinicQuery.trim() !== '',
    (employeeId ?? '') !== '',
  ].filter(Boolean).length;

  function clearAll() {
    setFilters(DEFAULT_FILTERS);
    setClinicQuery('');
    setEmployeeId && setEmployeeId('');
  }

  const dateRangeActive = hasDateRange(filters);

  return (
    <div className='space-y-2'>
      {/* Toggle button */}
      <div className='flex items-center gap-2'>
        <button
          type='button'
          onClick={() => setOpen((o) => !o)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
            activeCount > 0
              ? `${activeBg} ${activeBorder} text-white`
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-400'
          }`}
        >
          <svg className='w-3.5 h-3.5' viewBox='0 0 20 20' fill='currentColor' aria-hidden='true'>
            <path fillRule='evenodd' d='M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3 5a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm2 5a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z' clipRule='evenodd' />
          </svg>
          {activeCount > 0 ? `Filters (${activeCount})` : 'Filters'}
          <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} viewBox='0 0 20 20' fill='currentColor' aria-hidden='true'>
            <path fillRule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clipRule='evenodd' />
          </svg>
        </button>
        {activeCount > 0 && (
          <button type='button' onClick={clearAll}
            className='text-xs text-gray-500 hover:text-red-600 underline underline-offset-2 transition-colors'>
            Clear all
          </button>
        )}
      </div>

      {/* Filter controls (collapsible) */}
      {open && (
        <div className='rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-4 shadow-sm'>

          {/* Purpose */}
          <div>
            <label className='block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5'>Purpose</label>
            <select
              value={filters.purpose}
              onChange={(e) => setFilters({ ...filters, purpose: e.target.value as VisitPurpose | '' })}
              className={`w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 ${ring}`}
            >
              <option value=''>All purposes</option>
              {PURPOSE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div>
            <label className='block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5'>
              Date range <span className='font-normal normal-case text-gray-400'>(visit date)</span>
            </label>
            <div className='flex items-center gap-2'>
              <input type='date'
                value={filters.dateFrom !== null ? epochToDateInput(filters.dateFrom) : ''}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value ? dateInputToEpochStart(e.target.value) : null })}
                className={`flex-1 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 ${ring}`}
              />
              <span className='text-xs text-gray-400'>to</span>
              <input type='date'
                value={filters.dateTo !== null ? epochToDateInput(filters.dateTo) : ''}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value ? dateInputToEpochEnd(e.target.value) : null })}
                className={`flex-1 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 ${ring}`}
              />
            </div>
            {dateRangeActive && (
              <p className='mt-1 text-xs text-amber-600 dark:text-amber-400'>
                &#9888; Sort locked to date while a date range is active.
              </p>
            )}
          </div>

          {/* Clinic / hospital (client-side) */}
          <div>
            <label className='block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5'>Clinic / Hospital</label>
            <input type='search' placeholder='Type to filter\u2026' value={clinicQuery}
              onChange={(e) => setClinicQuery(e.target.value)}
              className={`w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 ${ring}`}
            />
          </div>

          {/* Employee dropdown (manager only) */}
          {setEmployeeId && (
            <div>
              <label className='block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5'>Employee</label>
              <select value={employeeId ?? ''}
                onChange={(e) => setEmployeeId(e.target.value)}
                className={`w-full rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 ${ring}`}
              >
                <option value=''>All employees</option>
                {employees.map((emp) => (
                  <option key={emp.uid} value={emp.uid}>{emp.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Active filter chips */}
      {activeCount > 0 && (
        <div className='flex flex-wrap gap-1.5'>
          {filters.purpose && (
            <Chip
              label={`Purpose: ${PURPOSE_OPTIONS.find((o) => o.value === filters.purpose)?.label ?? filters.purpose}`}
              chipBg={chipBg}
              onRemove={() => setFilters({ ...filters, purpose: '' })}
            />
          )}
          {filters.dateFrom !== null && (
            <Chip label={`From: ${epochToDateInput(filters.dateFrom)}`} chipBg={chipBg}
              onRemove={() => setFilters({ ...filters, dateFrom: null })} />
          )}
          {filters.dateTo !== null && (
            <Chip label={`To: ${epochToDateInput(filters.dateTo)}`} chipBg={chipBg}
              onRemove={() => setFilters({ ...filters, dateTo: null })} />
          )}
          {clinicQuery.trim() && (
            <Chip label={`Clinic: \u201c${clinicQuery.trim()}\u201d`} chipBg={chipBg}
              onRemove={() => setClinicQuery('')} />
          )}
          {employeeId && setEmployeeId && (
            <Chip
              label={`Employee: ${employees.find((e) => e.uid === employeeId)?.name ?? employeeId}`}
              chipBg={chipBg}
              onRemove={() => setEmployeeId('')}
            />
          )}
        </div>
      )}
    </div>
  );
}

function epochToDateInput(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}
function dateInputToEpochStart(s: string): number {
  return new Date(s + 'T00:00:00').getTime();
}
function dateInputToEpochEnd(s: string): number {
  return new Date(s + 'T23:59:59.999').getTime();
}

function Chip({ label, chipBg, onRemove }: { label: string; chipBg: string; onRemove: () => void }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${chipBg}`}>
      {label}
      <button type='button' onClick={onRemove} aria-label='Remove filter'
        className='ml-0.5 hover:opacity-70 transition-opacity'>
        <svg className='w-3 h-3' viewBox='0 0 20 20' fill='currentColor' aria-hidden='true'>
          <path fillRule='evenodd' d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z' clipRule='evenodd' />
        </svg>
      </button>
    </span>
  );
}

