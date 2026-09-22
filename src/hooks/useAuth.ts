// useAuth hook — re-exported from AuthContext for convenience.
// Import from here in components so the import path stays stable
// even if the context implementation moves.
//
// Usage:
//   import { useAuth } from '../hooks/useAuth';
//   const { firebaseUser, appUser, loading } = useAuth();

export { useAuth } from '../context/AuthContext';

