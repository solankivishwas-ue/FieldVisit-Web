// Root application component.
// Wraps the entire app with:
//  • BrowserRouter   — React Router v7 HTML5 history
//  • ThemeProvider   — dark/light mode, persists to localStorage, `dark` class on <html>
//  • AuthProvider    — Firebase Auth + Firestore user doc listener
//  • AppRouter       — route definitions + ProtectedRoute guards

import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import AppRouter from './routes/AppRouter';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
