// useEmployees -- fetches the user list from Firestore /users collection.
// Only intended for managers (Firestore rules: only managers can read all users).
// Returns a stable sorted list of employees (name + uid) for use in dropdowns.

import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './useAuth';

export interface EmployeeOption {
  uid:  string;
  name: string;
}

export function useEmployees(): { employees: EmployeeOption[]; loading: boolean } {
  const { appUser } = useAuth();
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading,   setLoading]   = useState(false);

  useEffect(() => {
    if (appUser?.role !== 'MANAGER' && appUser?.role !== 'SENIOR') return;
    setLoading(true);
    const q = query(collection(db, 'users'), orderBy('name', 'asc'));
    getDocs(q)
      .then((snap) => {
        const list: EmployeeOption[] = snap.docs
          .map((d) => ({
            uid:  d.id,
            name: (d.data()['name'] as string | undefined) ?? d.id,
          }))
          .filter((e) => e.uid !== appUser.uid) // exclude the manager themselves
          .sort((a, b) => a.name.localeCompare(b.name));
        setEmployees(list);
      })
      .catch(() => { /* silently fail — dropdown just stays empty */ })
      .finally(() => setLoading(false));
  }, [appUser?.uid, appUser?.role]);

  return { employees, loading };
}
