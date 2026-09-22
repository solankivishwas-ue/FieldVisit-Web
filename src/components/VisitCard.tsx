// VisitCard — displays a single visit in a list row.
//
// Mirrors the VisitItem composable in Android's VisitListScreen:
//  • Purpose label (primary colour) + user name
//  • Clinic / hospital name
//  • Date/time of visit
//  • SyncStatus badge (colour-coded)
//
// Clicking the card navigates to the detail page (handled by parent via onClick prop).

import type { Visit } from '../types';
import { purposeLabel, formatDateTime, syncMeta } from '../utils/helpers';

interface VisitCardProps {
  visit: Visit;
  onClick: () => void;
  /** Show the userName row (manager view — hidden on employee's own list) */
  showUser?: boolean;
}

export default function VisitCard({ visit, onClick, showUser = false }: VisitCardProps) {
  const sm = syncMeta(visit.syncStatus);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1"
    >
      <div className="p-4">
        {/* Row 1: purpose (title) + sync badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-base font-bold text-blue-700 dark:text-blue-400 leading-tight">
              {purposeLabel(visit.purpose)}
            </p>
            {showUser && visit.userName && (
              <p className="text-sm font-medium text-gray-700 mt-0.5">{visit.userName}</p>
            )}
          </div>
          {/* SyncStatus badge */}
          <span
            className={`shrink-0 inline-block text-xs font-bold px-2 py-0.5 rounded border ${sm.bgClass} ${sm.textClass} ${sm.borderClass}`}
          >
            {sm.label}
          </span>
        </div>

        {/* Row 2: clinic name */}
        {visit.clinicHospitalName && (
          <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
            {/* Building icon (inline SVG — no extra dependency) */}
            <svg className="w-4 h-4 shrink-0 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4zm3 1h2v2H7V5zm4 0h2v2h-2V5zM7 9h2v2H7V9zm4 0h2v2h-2V9zm-4 4h2v2H7v-2zm4 0h2v2h-2v-2z" clipRule="evenodd" />
            </svg>
            <span className="truncate">{visit.clinicHospitalName}</span>
          </div>
        )}

        {/* Row 3: doctor name */}
        {visit.doctorContactName && (
          <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
            <svg className="w-4 h-4 shrink-0 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
            <span className="truncate">{visit.doctorContactName}</span>
          </div>
        )}

        {/* Row 4: date */}
        <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
          <span>{formatDateTime(visit.createdAt)}</span>
        </div>
      </div>
    </button>
  );
}
