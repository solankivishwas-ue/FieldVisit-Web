// Shared utility helpers — date formatting and label maps.
// All date formatting uses epoch-ms timestamps (Long) matching Android's createdAt / updatedAt.

import type { VisitPurpose } from '../types';

// ── Date / Time ───────────────────────────────────────────────────────────────

/**
 * Formats an epoch-ms timestamp to "MMM DD, YYYY • HH:MM" (e.g. "Jan 05, 2025 • 14:30").
 * Mirrors SDF("MMM dd, yyyy • HH:mm") in Android VisitListScreen.
 */
export function formatDateTime(epochMs: number): string {
  return new Date(epochMs).toLocaleString('en-US', {
    month: 'short',
    day:   '2-digit',
    year:  'numeric',
    hour:  '2-digit',
    minute:'2-digit',
    hour12: false,
  });
}

/**
 * Formats an epoch-ms timestamp to "DD/MM/YYYY" (e.g. "05/01/2025").
 * Mirrors SDF("dd/MM/yyyy") used for follow-up dates in Android VisitDetailScreen.
 */
export function formatDate(epochMs: number): string {
  const d = new Date(epochMs);
  const dd   = String(d.getDate()).padStart(2, '0');
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// ── Purpose display labels ────────────────────────────────────────────────────
// Mirrors Android Purpose.displayName values exactly.

export const PURPOSE_LABELS: Record<VisitPurpose, string> = {
  SERVICE:         'Service',
  COLD_CALL:       'Cold Call',
  SALES_FOLLOW_UP: 'Sales Follow Up',
  PRODUCT_DEMO:    'Product Demo',
  INSTALLATION:    'Installation',
  REMOTE_SUPPORT:  'Remote Support',
  OTHER:           'Other',
};

export function purposeLabel(p: VisitPurpose): string {
  return PURPOSE_LABELS[p] ?? 'Other';
}

// ── Text helpers ──────────────────────────────────────────────────────────────

/** Truncates text to maxLen characters and appends "…" if it was truncated. */
export function truncate(text: string, maxLen: number): string {
  return text.length <= maxLen ? text : `${text.slice(0, maxLen)}…`;
}

