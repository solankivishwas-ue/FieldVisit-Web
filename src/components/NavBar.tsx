// NavBar — shared top navigation bar used by both employee and manager dashboards.
//
// Shows:
//  • App logo / title (left)
//  • "Visits" nav link (highlights active when on the dashboard route)
//  • Role badge (right cluster, hidden on mobile)
//  • User's display name (right, hidden on mobile)
//  • Profile avatar button → /profile
//  • Sign-out button

import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { firebaseSignOut } from '../services/auth.service';

interface NavBarProps {
  /** Optional page title shown next to the logo */
  title?: string;
}

const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  EMPLOYEE: { label: 'Employee', className: 'bg-blue-100 text-blue-700' },
  SENIOR:   { label: 'Senior',   className: 'bg-purple-100 text-purple-700' },
  MANAGER:  { label: 'Manager',  className: 'bg-indigo-100 text-indigo-700' },
};

/** Returns up-to-two uppercase initials from a full name string. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

export default function NavBar({ title }: NavBarProps) {
  const { appUser } = useAuth();
  const navigate    = useNavigate();
  const location    = useLocation();

  const role    = appUser?.role ?? 'EMPLOYEE';
  const isAdmin = role === 'MANAGER' || role === 'SENIOR';
  const badge   = ROLE_BADGE[role] ?? ROLE_BADGE.EMPLOYEE!;

  // The "Visits" link points to the role-appropriate dashboard root
  const visitsPath   = isAdmin ? '/manager' : '/employee';
  // Active when we're on the dashboard itself (not a sub-page like /visits/:id or /export)
  const visitsActive =
    location.pathname === visitsPath ||
    location.pathname === '/employee' ||
    location.pathname === '/manager';

  const activeNavClass   = 'text-white font-semibold underline underline-offset-4 decoration-white/60';
  const inactiveNavClass = 'text-white/70 hover:text-white font-medium transition-colors';

  async function handleSignOut() {
    await firebaseSignOut();
    navigate('/login', { replace: true });
  }

  return (
    <header
      className={`${isAdmin ? 'bg-indigo-700' : 'bg-blue-600'} px-4 sm:px-6 py-3 shadow`}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left: logo + optional title + Visits nav link */}
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-lg font-extrabold text-white tracking-tight">
              FieldVisit
            </span>
            {title && (
              <>
                <span className="text-white/40 select-none">·</span>
                <span className="text-sm font-semibold text-white/80">{title}</span>
              </>
            )}
          </div>

          {/* Nav link — "Visits" */}
          <nav className="flex items-center gap-1" aria-label="Main navigation">
            <button
              type="button"
              onClick={() => navigate(visitsPath)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-sm ${visitsActive ? activeNavClass : inactiveNavClass}`}
              aria-current={visitsActive ? 'page' : undefined}
            >
              {/* Clipboard icon */}
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
              </svg>
              Visits
            </button>
          </nav>
        </div>

        {/* Right: role badge + name + avatar + sign-out */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Role badge — hidden on small screens */}
          <span className={`hidden sm:inline-block text-xs font-bold px-2.5 py-1 rounded-full ${badge.className}`}>
            {badge.label}
          </span>

          {/* User's name — hidden on small screens */}
          {appUser?.name && (
            <span className="hidden sm:inline text-sm text-white/80 font-medium max-w-[140px] truncate">
              {appUser.name}
            </span>
          )}

          {/* Avatar button → Profile page */}
          <button
            type="button"
            onClick={() => navigate('/profile')}
            aria-label="View profile"
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center text-white text-xs font-bold shrink-0"
          >
            {initials(appUser?.name ?? '')}
          </button>

          {/* Sign out */}
          <button
            type="button"
            onClick={handleSignOut}
            className="text-sm text-white/70 hover:text-white transition-colors font-medium"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
