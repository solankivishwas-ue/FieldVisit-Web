// Employee Dashboard -- sort controls + filters + cursor-based Load More pagination.
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useVisits, hasDateRange } from '../../hooks/useVisits';
import type { SortField } from '../../hooks/useVisits';
import NavBar from '../../components/NavBar';
import VisitCard from '../../components/VisitCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorBoundary from '../../components/ErrorBoundary';
import AddVisitModal from '../../components/AddVisitModal';
import FilterPanel from '../../components/FilterPanel';
import { visitsToCsv, downloadCsv, buildExportFilename } from '../../utils/exportCsv';

interface SortOption { label: string; field: SortField; dir: 'asc' | 'desc'; }
const SORT_OPTIONS: SortOption[] = [
  { label: 'Newest',  field: 'createdAt',         dir: 'desc' },
  { label: 'Oldest',  field: 'createdAt',         dir: 'asc'  },
  { label: 'Purpose', field: 'purpose',            dir: 'asc'  },
  { label: 'Clinic',  field: 'clinicHospitalName', dir: 'asc'  },
];
export default function EmployeeDashboardPage() {
  const { appUser } = useAuth();
  const { visits, loading, error, hasMore, loadingMore, loadMore,
          setSort, filters, setFilters, effectiveSort } = useVisits();
  const navigate = useNavigate();
  const [searchQuery,  setSearchQuery]  = useState('');
  const [clinicQuery,  setClinicQuery]  = useState('');
  const [showModal,    setShowModal]    = useState(false);

  const dateRangeLocked = hasDateRange(filters);

  // Combined client-side filter: general search + clinic text filter
  const filteredVisits = useMemo(() => {
    let result = visits;
    if (clinicQuery.trim()) {
      const cq = clinicQuery.toLowerCase();
      result = result.filter((v) => v.clinicHospitalName.toLowerCase().includes(cq));
    }
    if (!searchQuery.trim()) return result;
    const q = searchQuery.toLowerCase();
    return result.filter((v) =>
      v.doctorContactName.toLowerCase().includes(q)   ||
      v.clinicHospitalName.toLowerCase().includes(q)  ||
      v.doctorSpeciality.toLowerCase().includes(q)    ||
      v.manualAddress.toLowerCase().includes(q)       ||
      v.address.toLowerCase().includes(q)             ||
      v.notes.toLowerCase().includes(q));
  }, [visits, searchQuery, clinicQuery]);

  const anyClientFilter = searchQuery.trim() !== '' || clinicQuery.trim() !== '';

  function isActive(opt: SortOption) {
    return effectiveSort.field === opt.field && effectiveSort.dir === opt.dir;
  }
  function handleSort(opt: SortOption) {
    setSort({ field: opt.field, dir: opt.dir });
    setSearchQuery('');
  }
  const loadedLabel = visits.length + (hasMore ? '+' : '') + ' visit' + (visits.length !== 1 ? 's' : '') + ' loaded';
  const helloLabel  = appUser?.name ? 'Hello, ' + appUser.name : 'My Visits';

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <NavBar title='My Visits' />
      <main className='max-w-2xl mx-auto px-4 py-6 space-y-4 pb-24'>
        {/* Welcome + export */}
        <div className='flex flex-wrap items-start justify-between gap-2'>
          <div>
            <h1 className='text-xl font-bold text-gray-800 dark:text-gray-100'>{helloLabel}</h1>
            <p className='text-sm text-gray-500 mt-0.5'>{loading ? 'Loading\u2026' : loadedLabel}</p>
          </div>
          {!loading && visits.length > 0 && (
            <button type='button'
              onClick={() => { const rows=[...visits].sort((a,b)=>b.createdAt-a.createdAt); const csv=visitsToCsv(rows); const s=appUser?.name?.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-'); downloadCsv(csv,buildExportFilename(s)); }}
              className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors'>
              Export CSV
            </button>
          )}
        </div>
        {/* Sort pills */}
        <div className='flex items-center gap-2 flex-wrap'>
          <span className='text-xs font-semibold text-gray-400 uppercase tracking-wide'>Sort:</span>
          {SORT_OPTIONS.map((opt) => {
            const disabled = dateRangeLocked && (opt.field === 'purpose' || opt.field === 'clinicHospitalName');
            return (
              <button key={opt.field + opt.dir} type='button'
                onClick={() => !disabled && handleSort(opt)}
                disabled={disabled}
                title={disabled ? 'Sort locked to date while a date range filter is active' : undefined}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  disabled
                    ? 'opacity-40 cursor-not-allowed bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-400'
                    : isActive(opt)
                      ? 'bg-blue-700 border-blue-700 text-white'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-blue-400'
                }`}>
                {opt.label}
              </button>
            );
          })}
        </div>
        {/* Filters */}
        <FilterPanel
          filters={filters}
          setFilters={setFilters}
          clinicQuery={clinicQuery}
          setClinicQuery={setClinicQuery}
          accentColor='blue'
        />
        {/* Search */}
        <div className='relative'>
          <span className='absolute inset-y-0 left-3 flex items-center pointer-events-none'>
            <svg className='w-4 h-4 text-gray-400' viewBox='0 0 20 20' fill='currentColor' aria-hidden='true'>
              <path fillRule='evenodd' d='M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z' clipRule='evenodd' />
            </svg>
          </span>
          <input type='search' placeholder='Search by name, clinic, notes\u2026' value={searchQuery}
            onChange={(e)=>setSearchQuery(e.target.value)}
            className='w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent shadow-sm' />
        </div>
        {error && (
          <div className='rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
            <strong>Failed to load visits:</strong> {error}
          </div>
        )}
        {loading && <LoadingSpinner message='Loading your visits\u2026' />}
        {!loading && !error && filteredVisits.length === 0 && (
          <div className='py-16 flex flex-col items-center justify-center gap-3 text-center'>
            <div className='w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center'>
              <svg className='w-7 h-7 text-blue-400' fill='none' viewBox='0 0 24 24' stroke='currentColor' aria-hidden='true'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' />
              </svg>
            </div>
            <p className='font-semibold text-gray-700 dark:text-gray-300'>
              {anyClientFilter ? 'No visits match your filters' : 'No visits yet'}
            </p>
            <p className='text-sm text-gray-400'>
              {anyClientFilter ? 'Try adjusting your filters.' : 'Tap the + button below to log your first visit.'}
            </p>
            {anyClientFilter && (
              <button type='button' onClick={() => { setSearchQuery(''); setClinicQuery(''); }} className='mt-1 text-sm text-blue-600 hover:underline'>Clear filters</button>
            )}
          </div>
        )}
        {!loading && !error && filteredVisits.length > 0 && (
          <ErrorBoundary>
            <ul className='space-y-3'>
              {filteredVisits.map((visit) => (
                <li key={visit.id}>
                  <VisitCard visit={visit} onClick={()=>navigate(`/employee/visits/${visit.id}`)} showUser={false} />
                </li>
              ))}
            </ul>
          </ErrorBoundary>
        )}
        {/* Load More */}
        {!loading && !error && hasMore && !anyClientFilter && (
          <div className='flex justify-center pt-2'>
            <button type='button' onClick={loadMore} disabled={loadingMore}
              className='px-6 py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2'>
              {loadingMore && (
                <svg className='animate-spin w-4 h-4' viewBox='0 0 24 24' fill='none' aria-hidden='true'>
                  <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
                  <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8v8H4z' />
                </svg>
              )}
              {loadingMore ? 'Loading\u2026' : 'Load more visits'}
            </button>
          </div>
        )}
      </main>
      {/* FAB */}
      <button type='button' onClick={()=>setShowModal(true)} aria-label='New Visit'
        className='fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-blue-600 shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center'>
        <svg className='w-7 h-7 text-white' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' aria-hidden='true'>
          <path strokeLinecap='round' strokeLinejoin='round' d='M12 4v16m8-8H4' />
        </svg>
      </button>
      {showModal && appUser && (
        <AddVisitModal uid={appUser.uid} userName={appUser.name} onClose={()=>setShowModal(false)} />
      )}
    </div>
  );
}
