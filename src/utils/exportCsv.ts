// exportCsv.ts — client-side CSV generation for visit data.
//
// Design decisions:
//  • RFC 4180 compliant: CRLF line endings, fields with commas/quotes/newlines
//    are wrapped in double-quotes, embedded double-quotes are escaped as "".
//  • UTF-8 BOM (\uFEFF) prepended so Excel on Windows opens without the
//    "Import Text Wizard" — Sheets ignores the BOM silently.
//  • Column order mirrors the Android CSV export exactly so files are
//    interchangeable and stakeholders see the same layout from both sources.
//  • No external libraries — only browser-native Blob + URL APIs.

import type { Visit } from '../types';
import { purposeLabel, formatDateTime, formatDate } from './helpers';

// ── Column definitions ────────────────────────────────────────────────────────
// Each entry becomes one CSV column in left-to-right order.

interface CsvColumn {
  /** Text shown in the header row */
  header: string;
  /** Extracts the cell value from a Visit; return '' for missing/null */
  getValue: (v: Visit) => string;
}

export const EXPORT_COLUMNS: CsvColumn[] = [
  { header: 'ID',               getValue: (v) => v.id },
  { header: 'Employee Name',    getValue: (v) => v.userName },
  { header: 'Purpose',          getValue: (v) => purposeLabel(v.purpose) },
  { header: 'Doctor / Contact', getValue: (v) => v.doctorContactName },
  { header: 'Phone',            getValue: (v) => v.doctorContactPhone },
  { header: 'Speciality',       getValue: (v) => v.doctorSpeciality },
  { header: 'Clinic / Hospital',getValue: (v) => v.clinicHospitalName },
  { header: 'Address',          getValue: (v) => v.manualAddress || v.address },
  { header: 'Latitude',         getValue: (v) => v.latitude  !== 0 ? String(v.latitude)  : '' },
  { header: 'Longitude',        getValue: (v) => v.longitude !== 0 ? String(v.longitude) : '' },
  { header: 'Notes',            getValue: (v) => v.notes },
  { header: 'Next Action',      getValue: (v) => v.nextAction },
  {
    header: 'Follow-up Date',
    getValue: (v) => (v.followUpDate != null ? formatDate(v.followUpDate) : ''),
  },
  { header: 'Sync Status',      getValue: (v) => v.syncStatus },
  { header: 'Created At',       getValue: (v) => formatDateTime(v.createdAt) },
  { header: 'Updated At',       getValue: (v) => formatDateTime(v.updatedAt) },
];

// ── Core serialiser ───────────────────────────────────────────────────────────

/**
 * Wraps a single cell value in double-quotes and escapes embedded quotes.
 * Applied to ALL cells unconditionally so the output is always safe —
 * prevents formula injection (cells starting with =, +, -, @) and handles
 * values that contain commas, newlines, or quotes.
 */
function escapeCell(raw: string): string {
  // Replace every " with ""
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Converts an array of Visit objects into a RFC 4180 CSV string.
 *
 * @param visits - The visits to serialise (already filtered by the caller).
 * @returns      - Full CSV text including header row, UTF-8 BOM prefix.
 *
 * Excel / Sheets compatibility notes:
 *  • UTF-8 BOM (\uFEFF) at byte 0 tells Excel this is UTF-8 encoded.
 *  • CRLF (\r\n) between rows is required by RFC 4180 and expected by Excel.
 *  • All cells double-quoted → no ambiguity around numeric-looking strings
 *    (phone numbers, IDs) being mis-parsed as numbers.
 */
export function visitsToCsv(visits: Visit[]): string {
  const BOM = '\uFEFF';

  const headerRow = EXPORT_COLUMNS
    .map((col) => escapeCell(col.header))
    .join(',');

  const dataRows = visits.map((visit) =>
    EXPORT_COLUMNS
      .map((col) => escapeCell(col.getValue(visit)))
      .join(','),
  );

  return BOM + [headerRow, ...dataRows].join('\r\n');
}

// ── Browser download trigger ──────────────────────────────────────────────────

/**
 * Triggers a browser file-download for the given CSV content.
 *
 * @param csvContent - Full CSV string (including BOM if desired).
 * @param filename   - Suggested filename, e.g. "fieldvisit-export-2025-06-01.csv".
 */
export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);

  const link        = document.createElement('a');
  link.href         = url;
  link.download     = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Release the object URL shortly after — the browser has queued the download.
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}

// ── Filename helper ───────────────────────────────────────────────────────────

/**
 * Returns a filename like "fieldvisit-export-2025-06-01.csv" using today's
 * local date. Pass an optional suffix to distinguish scoped exports,
 * e.g. buildExportFilename('alice') → "fieldvisit-export-2025-06-01-alice.csv".
 */
export function buildExportFilename(suffix?: string): string {
  const d    = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  const base = `fieldvisit-export-${yyyy}-${mm}-${dd}`;
  return suffix ? `${base}-${suffix}.csv` : `${base}.csv`;
}
