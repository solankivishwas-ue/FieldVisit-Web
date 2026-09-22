// Firebase app initialization -- shared by auth and Firestore services.
// All config values are read from VITE_* environment variables so that
// no secrets are ever committed to source control.
// Copy .env.example to .env and fill in your Firebase project values.

import { initializeApp } from 'firebase/app';
import { getAuth }       from 'firebase/auth';
import { getFirestore }  from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY             as string,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN         as string,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID          as string,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET      as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID              as string,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID      as string | undefined,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);
export default app;
