// useVisits -- role-aware paginated + filtered Firestore subscription for visits.
// Page 1 is live onSnapshot (realtime). Pages 2+ appended via loadMore().
// Resets to page 1 whenever uid, role, sort, or filters change.
//
// KEY CONSTRAINT: when a date range is active, sort.field is clamped to
// createdAt here (in addition to the service enforcing it at query level).

import { useCallback, useEffect, useRef, useState } from 'react';
import { type QueryDocumentSnapshot } from 'firebase/firestore';
import { useAuth } from './useAuth';
import {
  subscribeToEmployeeVisits,
  subscribeToAllVisits,
  fetchEmployeeVisitsPage,
  fetchAllVisitsPage,
  DEFAULT_SORT,
  DEFAULT_FILTERS,
  hasDateRange,
  PAGE_SIZE,
  type VisitSort,
  type VisitFilters,
} from '../services/visits.service';
import type { Visit } from '../types';
import { friendlyFirestoreError } from '../utils/firestoreError';

// Re-export so dashboards can import from one place
export type { VisitSort, SortField, SortDir, VisitFilters } from '../services/visits.service';
export { DEFAULT_FILTERS, hasDateRange } from '../services/visits.service';

export interface UseVisitsResult {
  visits:      Visit[];
  loading:     boolean;
  error:       string | null;
  hasMore:     boolean;
  loadingMore: boolean;
  loadMore:    () => void;
  sort:        VisitSort;
  setSort:     (s: VisitSort) => void;
  filters:     VisitFilters;
  setFilters:  (f: VisitFilters) => void;
  effectiveSort: VisitSort;  // clamped sort exposed so UI can show disabled state
}

export function useVisits(): UseVisitsResult {
  const { appUser } = useAuth();

  const [visits,      setVisits]      = useState<Visit[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [hasMore,     setHasMore]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sort,        setSort]        = useState<VisitSort>(DEFAULT_SORT);
  const [filters,     setFilters]     = useState<VisitFilters>(DEFAULT_FILTERS);

  // Effective sort: clamp to createdAt when date range is active
  const effectiveSort: VisitSort = hasDateRange(filters)
    ? { field: 'createdAt', dir: sort.dir }
    : sort;

  const cursorRef = useRef<QueryDocumentSnapshot | null>(null);
  const extraRef  = useRef<Visit[]>([]);

  const isManager = appUser?.role === 'MANAGER';

  // Re-subscribe on any dependency change; resets to page 1
  useEffect(() => {
    if (!appUser) {
      setVisits([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setHasMore(false);
    setLoadingMore(false);
    cursorRef.current = null;
    extraRef.current  = [];

    const onData = (page1: Visit[], lastDoc: QueryDocumentSnapshot | null) => {
      cursorRef.current = lastDoc;
      setHasMore(page1.length === PAGE_SIZE);
      setVisits([...page1, ...extraRef.current]);
      setLoading(false);
      setError(null);
    };

    const onError = (err: Error) => {
      setError(friendlyFirestoreError(err));
      setLoading(false);
    };

    const unsub = isManager
      ? subscribeToAllVisits(effectiveSort, filters, onData, onError)
      : subscribeToEmployeeVisits(appUser.uid, effectiveSort, filters, onData, onError);

    return unsub;
  // Include filters fields + effective sort as deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    appUser?.uid, appUser?.role,
    effectiveSort.field, effectiveSort.dir,
    filters.purpose, filters.dateFrom, filters.dateTo,
  ]);

  const loadMore = useCallback(async () => {
    if (!appUser || !hasMore || loadingMore || !cursorRef.current) return;
    setLoadingMore(true);
    try {
      const result = isManager
        ? await fetchAllVisitsPage(effectiveSort, filters, cursorRef.current)
        : await fetchEmployeeVisitsPage(appUser.uid, effectiveSort, filters, cursorRef.current);

      cursorRef.current = result.lastDoc;
      setHasMore(result.visits.length === PAGE_SIZE);
      extraRef.current = [...extraRef.current, ...result.visits];
      setVisits((prev) => [...prev, ...result.visits]);
    } catch (err) {
      setError(friendlyFirestoreError(err));
    } finally {
      setLoadingMore(false);
    }
  }, [appUser, hasMore, loadingMore, isManager, effectiveSort, filters]);

  const handleSetSort = useCallback((s: VisitSort) => {
    extraRef.current = [];
    setSort(s);
  }, []);

  const handleSetFilters = useCallback((f: VisitFilters) => {
    extraRef.current = [];
    setFilters(f);
  }, []);

  return {
    visits, loading, error, hasMore, loadingMore, loadMore,
    sort, setSort: handleSetSort,
    filters, setFilters: handleSetFilters,
    effectiveSort,
  };
}
