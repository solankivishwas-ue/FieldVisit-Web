// ProfilePage — user info, logout, and dark mode toggle.
//
// Accessible from NavBar avatar button (any authenticated + verified user).
// Route: /profile  (inside shared ProtectedRoute — no role restriction).
//
// Displays:
//  • Avatar circle (initials derived from appUser.name)
//  • Full name, email, phone number, role badge
//  • Member since date (derived from appUser.createdAt)
//  • Dark mode toggle (persists to localStorage via ThemeContext)
//  • Sign Out button

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { firebaseSignOut } from '../services/auth.service';
import NavBar from '../components/NavBar';
import ErrorBoundary from '../components/ErrorBoundary';

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

function formatMemberSince(epochMs: number): string {
  if (!epochMs) return 'Unknown';
  return new Date(epochMs).toLocaleDateString('en-US', {
    month: 'long',
    year:  'numeric',
  });
}

const ROLE_LABELS: Record<string, { label: string; cls: string }> = {
  EMPLOYEE: { label: 'Employee', cls: 'bg-blue-100   text-blue-700'   },
  SENIOR:   { label: 'Senior',   cls: 'bg-purple-100 text-purple-700' },
  MANAGER:  { label: 'Manager',  cls: 'bg-indigo-100 text-indigo-700' },
};
// ── Main component ───────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { appUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const role      = appUser?.role ?? 'EMPLOYEE';
  const roleMeta  = ROLE_LABELS[role] ?? ROLE_LABELS['EMPLOYEE']!;
  const avatarBg  = role === 'MANAGER' || role === 'SENIOR' ? 'bg-indigo-600' : 'bg-blue-600';

  async function handleSignOut() {
    await firebaseSignOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <ErrorBoundary>
        <NavBar title="Profile" />
      </ErrorBoundary>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-6">

        {/* Avatar + name card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 flex flex-col items-center gap-4">
          {/* Avatar circle */}
          <div className={`w-20 h-20 rounded-full ${avatarBg} flex items-center justify-center shadow-md`}>
            <span className="text-2xl font-extrabold text-white tracking-wide">
              {initials(appUser?.name ?? '')}
            </span>
          </div>

          {/* Name + role */}
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {appUser?.name || 'Unknown User'}
            </p>
            <span className={`mt-1 inline-block text-xs font-bold px-2.5 py-0.5 rounded-full ${roleMeta.cls}`}>
              {roleMeta.label}
            </span>
          </div>
        </div>

        {/* Info card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm divide-y divide-gray-100 dark:divide-gray-700">
          <InfoRow icon={EmailIcon} label="Email" value={appUser?.email || '--'} />
          <InfoRow icon={PhoneIcon} label="Phone" value={appUser?.phoneNumber || '--'} />
          <InfoRow icon={CalIcon}   label="Member since" value={formatMemberSince(appUser?.createdAt ?? 0)} />
        </div>
        {/* Settings card: dark mode toggle */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Appearance</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Moon / Sun icon */}
              {isDark ? (
                <svg className="w-5 h-5 text-indigo-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              )}
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Dark Mode</p>
                <p className="text-xs text-gray-400">{isDark ? 'On' : 'Off'} · saved automatically</p>
              </div>
            </div>
            {/* Toggle switch */}
            <button
              type="button"
              role="switch"
              aria-checked={isDark}
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${isDark ? 'bg-indigo-600' : 'bg-gray-300'}`}
            >
              <span className="sr-only">Toggle dark mode</span>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isDark ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        {/* Sign out */}
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full py-3 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-700 hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>

        <p className="text-center text-xs text-gray-400">FieldVisit Web · companion to the Android app</p>
      </main>
    </div>
  );
}
// ── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: () => React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <div className="shrink-0 w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
        <Icon />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{value}</p>
      </div>
    </div>
  );
}

function EmailIcon() {
  return (
    <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

function CalIcon() {
  return (
    <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}
