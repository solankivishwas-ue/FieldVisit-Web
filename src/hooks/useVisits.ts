// useVisits -- role-aware paginated + filtered Firestore subscription for visits.
// Page 1 is live onSnapshot (realtime). Pages 2+ appended via loadMore().
// Resets to page 1 whenever uid, role, sort, or filters change.
//
// Role behaviour:
//   MANAGER  -> subscribeToAllVisits (all visits)
//   SENIOR   -> subscribeToTeamVisits (assigned employees' visits)
//   EMPLOYEE -> subscribeToEmployeeVisits (own visits only)

import { useCallback, useEffect, useRef, useState } from 'react';
import { type QueryDocumentSnapshot } from 'firebase/firestore';
import { useAuth } from './useAuth';
import {
  subscribeToEmployeeVisits,
  subscribeToAllVisits,
  subscribeToTeamVisits,
  fetchEmployeeVisitsPage,
  fetchAllVisitsPage,
  fetchTeamVisitsPage,
  DEFAULT_SORT,
  DEFAULT_FILTERS,
  hasDateRange,
  PAGE_SIZE,
  type VisitSort,
  type VisitFilters,
} from '../services/visits.service';
import { getEmployeesBySenior } from '../services/users.service';
import type { Visit } from '../types';
import { friendlyFirestoreError } from '../utils/firestoreError';

// Re-export so dashboards can import from one place
export type { VisitSort, SortField, SortDir, VisitFilters } from '../services/visits.service';
export { DEFAULT_FILTERS, hasDateRange } from '../services/visits.service';

export interface UseVisitsResult {
  visits:        Visit[];
  loading:       boolean;
  error:         string | null;
  hasMore:       boolean;
  loadingMore:   boolean;
  loadMore:      () => void;
  sort:          VisitSort;
  setSort:       (s: VisitSort) => void;
  filters:       VisitFilters;
  setFilters:    (f: VisitFilters) => void;
  effectiveSort: VisitSort;
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
  const [teamUids,    setTeamUids]    = useState<string[]>([]);

  const effectiveSort: VisitSort = hasDateRange(filters)
    ? { field: 'createdAt', dir: sort.dir }
    : sort;

  const cursorRef = useRef<QueryDocumentSnapshot | null>(null);
  const extraRef  = useRef<Visit[]>([]);

  const isManager = appUser?.role === 'MANAGER';
  const isSenior  = appUser?.role === 'SENIOR';

  // Load assigned employee UIDs when role is SENIOR
  useEffect(() => {
    if (!appUser || !isSenior) { setTeamUids([]); return; }
    getEmployeesBySenior(appUser.uid)
      .then((employees) => setTeamUids(employees.map((e) => e.uid)))
      .catch(() => setTeamUids([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appUser?.uid, isSenior]);

  // Re-subscribe on any dependency change; resets to page 1
  useEffect(() => {
    if (!appUser) { setVisits([]); setLoading(false); return; }

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

    let unsub: () => void;
    if (isManager) {
      unsub = subscribeToAllVisits(effectiveSort, filters, onData, onError);
    } else if (isSenior) {
      unsub = subscribeToTeamVisits(teamUids, effectiveSort, filters, onData, onError);
    } else {
      unsub = subscribeToEmployeeVisits(appUser.uid, effectiveSort, filters, onData, onError);
    }

    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    appUser?.uid, appUser?.role,
    effectiveSort.field, effectiveSort.dir,
    filters.purpose, filters.dateFrom, filters.dateTo,
    teamUids,
  ]);

  const loadMore = useCallback(async () => {
    if (!appUser || !hasMore || loadingMore || !cursorRef.current) return;
    setLoadingMore(true);
    try {
      let result: { visits: Visit[]; lastDoc: QueryDocumentSnapshot | null };
      if (isManager) {
        result = await fetchAllVisitsPage(effectiveSort, filters, cursorRef.current);
      } else if (isSenior) {
        result = await fetchTeamVisitsPage(teamUids, effectiveSort, filters, cursorRef.current);
      } else {
        result = await fetchEmployeeVisitsPage(appUser.uid, effectiveSort, filters, cursorRef.current);
      }
      cursorRef.current = result.lastDoc;
      setHasMore(result.visits.length === PAGE_SIZE);
      extraRef.current = [...extraRef.current, ...result.visits];
      setVisits((prev) => [...prev, ...result.visits]);
    } catch (err) {
      setError(friendlyFirestoreError(err));
    } finally {
      setLoadingMore(false);
    }
  }, [appUser, hasMore, loadingMore, isManager, isSenior, teamUids, effectiveSort, filters]);

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