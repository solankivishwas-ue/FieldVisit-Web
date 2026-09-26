// FilterPanel -- collapsible filter controls for visit dashboards.
// Server-side filters: purpose (dropdown), date range (from/to).
// Client-side filters: clinic text (in-memory), employee (manager dropdown, in-memory).
//
// INDEX NOTE: clinic and employee filters are client-side only -- Firestore
// has no substring search, and the manager employee-filter is identical in
// structure to the employee-scoped query (no extra indexes needed).
//
// RESPONSIVE: Mobile-first design with stacked fields on small screens,
// grid layout on sm+ (640px+), and 4-column grid on lg+ (1024px+).

import { useState } from 'react';
import type { VisitFilters } from '../hooks/useVisits';
import { DEFAULT_FILTERS } from '../hooks/useVisits';
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

  

  const inputClass = 'w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ' + ring;

  return (
    <div className='space-y-3'>
      {/* Toggle button - full width on mobile */}
      <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
        <button
          type='button'
          onClick={() => setOpen((o) => !o)}
          className={'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-semibold transition-colors w-full sm:w-auto shadow-sm tracking-wide uppercase ' + (activeCount > 0 ? activeBg + ' ' + activeBorder + ' text-white' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700')}
        >
          <svg className='w-4 h-4 shrink-0' viewBox='0 0 20 20' fill='currentColor' aria-hidden='true'>
            <path fillRule='evenodd' d='M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3 5a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm2 5a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z' clipRule='evenodd' />
          </svg>
          <span>{activeCount > 0 ? 'Filters (' + activeCount + ')' : 'Filters'}</span>
          <svg className={'w-4 h-4 shrink-0 transition-transform ' + (open ? 'rotate-180' : '')} viewBox='0 0 20 20' fill='currentColor' aria-hidden='true'>
            <path fillRule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clipRule='evenodd' />
          </svg>
        </button>
        {activeCount > 0 && (
          <button type='button' onClick={clearAll}
            className='text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800'>
            Clear all
          </button>
        )}
      </div>

      {/* Collapsible filter content */}
      {open && (
        <div className='space-y-4 animate-fade-in p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700'>
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            {/* Purpose dropdown */}
            <div className='sm:col-span-2 lg:col-span-1'>
              <label htmlFor='filter-purpose' className='block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5'>Purpose</label>
              <select id='filter-purpose' value={filters.purpose}
                onChange={(e) => setFilters({ ...filters, purpose: e.target.value as VisitPurpose })}
                className={inputClass + ' border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'}
              >
                <option value=''>All purposes</option>
                {PURPOSE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Date range - full width on mobile, 2-col on sm+ */}
            <div className='sm:col-span-2 lg:col-span-2'>
              <div className='grid gap-3 sm:grid-cols-2'>
                <div>
                  <label htmlFor='filter-from' className='block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5'>From</label>
                  <input id='filter-from' type='date' value={filters.dateFrom ? new Date(filters.dateFrom).toISOString().slice(0, 10) : ''}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value ? new Date(e.target.value).getTime() : null })}
                    className={inputClass + ' border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'}
                  />
                </div>
                <div>
                  <label htmlFor='filter-to' className='block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5'>To</label>
                  <input id='filter-to' type='date' value={filters.dateTo ? new Date(filters.dateTo).toISOString().slice(0, 10) : ''}
                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value ? new Date(e.target.value + 'T23:59:59.999').getTime() : null })}
                    className={inputClass + ' border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'}
                  />
                </div>
              </div>
            </div>

            {/* Clinic text search */}
            <div className='sm:col-span-2 lg:col-span-1'>
              <label htmlFor='filter-clinic' className='block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5'>Clinic contains</label>
              <input id='filter-clinic' type='text' placeholder='e.g. City Hospital'
                value={clinicQuery}
                onChange={(e) => setClinicQuery(e.target.value)}
                className={inputClass + ' border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'}
              />
            </div>

            {/* Employee dropdown (manager only) */}
            {setEmployeeId && (
              <div className='sm:col-span-2 lg:col-span-1'>
                <label htmlFor='filter-employee' className='block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5'>Employee</label>
                <select id='filter-employee' value={employeeId ?? ''}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className={inputClass + ' border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'}
                >
                  <option value=''>All employees</option>
                  {employees.map((emp) => (
                    <option key={emp.uid} value={emp.uid}>{emp.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Active filter chips */}
          {activeCount > 0 && (
            <div className='flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700'>
              {filters.purpose && (
                <Chip
                  label={'Purpose: ' + (PURPOSE_OPTIONS.find((o) => o.value === filters.purpose)?.label ?? filters.purpose)}
                  chipBg={chipBg}
                  onRemove={() => setFilters({ ...filters, purpose: '' })}
                />
              )}
              {filters.dateFrom !== null && (
                <Chip label={'From: ' + epochToDateInput(filters.dateFrom)} chipBg={chipBg}
                  onRemove={() => setFilters({ ...filters, dateFrom: null })} />
              )}
              {filters.dateTo !== null && (
                <Chip label={'To: ' + epochToDateInput(filters.dateTo)} chipBg={chipBg}
                  onRemove={() => setFilters({ ...filters, dateTo: null })} />
              )}
              {clinicQuery.trim() && (
                <Chip label={'Clinic: ' + clinicQuery.trim()} chipBg={chipBg}
                  onRemove={() => setClinicQuery('')} />
              )}
              {employeeId && setEmployeeId && (
                <Chip
                  label={'Employee: ' + (employees.find((e) => e.uid === employeeId)?.name ?? employeeId)}
                  chipBg={chipBg}
                  onRemove={() => setEmployeeId('')}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function epochToDateInput(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function Chip({ label, chipBg, onRemove }: { label: string; chipBg: string; onRemove: () => void }) {
  return (
    <span className={'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ' + chipBg}>
      {label}
      <button type='button' onClick={onRemove} aria-label='Remove filter'
        className='ml-1 hover:opacity-70 transition-opacity'>
        <svg className='w-3.5 h-3.5' viewBox='0 0 20 20' fill='currentColor' aria-hidden='true'>
          <path fillRule='evenodd' d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414-1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z' clipRule='evenodd' />
        </svg>
      </button>
    </span>
  );
}
