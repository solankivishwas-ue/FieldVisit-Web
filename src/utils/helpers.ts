// Shared utility helpers — date formatting, label maps, status colours.
// All date formatting uses epoch-ms timestamps (Long) matching Android's createdAt / updatedAt.

import type { VisitPurpose, SyncStatus } from '../types';

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

// ── SyncStatus display ────────────────────────────────────────────────────────
// Mirrors SyncStatusBadge colours in Android VisitListScreen.

export interface SyncMeta {
  label: string;
  /** Tailwind text colour class */
  textClass: string;
  /** Tailwind background colour class */
  bgClass: string;
  /** Tailwind border colour class */
  borderClass: string;
}

export const SYNC_META: Record<SyncStatus, SyncMeta> = {
  SYNCED:  { label: 'Synced',  textClass: 'text-blue-700',   bgClass: 'bg-blue-50',   borderClass: 'border-blue-300'  },
  PENDING: { label: 'Pending', textClass: 'text-amber-700',  bgClass: 'bg-amber-50',  borderClass: 'border-amber-300' },
  FAILED:  { label: 'Failed',  textClass: 'text-red-700',    bgClass: 'bg-red-50',    borderClass: 'border-red-300'   },
};

export function syncMeta(s: SyncStatus): SyncMeta {
  return SYNC_META[s] ?? SYNC_META.SYNCED;
}

// ── Text helpers ──────────────────────────────────────────────────────────────

/** Truncates text to maxLen characters and appends "…" if it was truncated. */
export function truncate(text: string, maxLen: number): string {
  return text.length <= maxLen ? text : `${text.slice(0, maxLen)}…`;
}

