// NavBar — shared top navigation bar used by both employee and manager dashboards.
//
// Breakpoints (Tailwind defaults):
//   • sm (640px): role badge + name visible
//   • md (768px): full horizontal nav visible
//   • < md: hamburger menu → slide-in drawer
//
// Desktop (≥md): logo | title | Visits | Team(Manager) | role badge | name | avatar | Sign Out
// Mobile (<md): logo | title | hamburger → drawer with all links + user menu

import { useState } from 'react';
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
  const parts = name.trim().split(/\\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

// Class strings for desktop nav links (used on dark header background)
const ACTIVE_NAV_CLASS = 'bg-white/20 text-white';
const INACTIVE_NAV_CLASS = 'text-white/70 hover:text-white hover:bg-white/10 transition-colors';

const NavLinkItem = ({
  children,
  onClick,
  isActive,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  isActive?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-base font-medium transition-colors $
      ${isActive
        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}
    }`}
  >
    {children}
  </button>
);

export default function NavBar({ title }: NavBarProps) {
  const { appUser } = useAuth();
  const navigate    = useNavigate();
  const location    = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const teamActive = location.pathname.startsWith('/manager/team');
  const profileActive = location.pathname === '/profile';

  async function handleSignOut() {
    await firebaseSignOut();
    navigate('/login', { replace: true });
    setMobileMenuOpen(false);
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  const drawerLinks = (
    <>
      <NavLinkItem
        isActive={visitsActive}
        onClick={() => { navigate(visitsPath); closeMobileMenu(); }}
      >
        <svg className="w-5 h-5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
          <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
        </svg>
        Visits
      </NavLinkItem>
      {role === 'MANAGER' && (
        <NavLinkItem
          isActive={teamActive}
          onClick={() => { navigate('/manager/team'); closeMobileMenu(); }}
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zm8 0a3 3 0 11-6 0 3 3 0 016 0zM6 16a5 5 0 0110 0v1H6v-1zm-6 0a5 5 0 018.58-3.56A7 7 0 006.07 17H0v-1z" />
          </svg>
          Team
        </NavLinkItem>
      )}
      <NavLinkItem
        isActive={profileActive}
        onClick={() => { navigate('/profile'); closeMobileMenu(); }}
      >
        <svg className="w-5 h-5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
        </svg>
        Profile
      </NavLinkItem>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button (hidden on desktop) */}
      <button
        type="button"
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={mobileMenuOpen}
      >
        {mobileMenuOpen ? (
          <svg className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3 5a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm2 5a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      {/* Mobile drawer overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer panel */}
      {mobileMenuOpen && (
        <aside className="md:hidden fixed top-0 left-0 h-full w-72 max-w-[85vw] z-50 bg-white dark:bg-gray-900 shadow-xl flex flex-col">
          {/* Drawer header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">FieldVisit</span>
            <button
              type="button"
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={closeMobileMenu}
              aria-label="Close menu"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Navigation links */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto" aria-label="Main navigation">
            {drawerLinks}

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-700 my-2" />

            {/* User info */}
            {appUser && (
              <div className="px-2 py-2 space-y-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {appUser.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {appUser.email}
                </p>
                <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${badge.className}`}>
                  {badge.label}
                </span>
              </div>
            )}

            {/* Sign out button */}
            {appUser && (
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 mt-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            )}
          </nav>
        </aside>
      )}

      {/* Desktop header */}
      <header
        className={`${isAdmin ? 'bg-indigo-700' : 'bg-blue-600'} px-4 sm:px-6 py-3 shadow hidden md:flex items-center justify-between gap-4`}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-lg font-extrabold text-white tracking-tight">FieldVisit</span>
            {title && (
              <>
                <span className="text-white/40 select-none">·</span>
                <span className="text-sm font-semibold text-white/80">{title}</span>
              </>
            )}
          </div>

          {/* Desktop nav links */}
          <nav className="flex items-center gap-1" aria-label="Main navigation">
            <button
              type="button"
              onClick={() => navigate(visitsPath)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm ${visitsActive ? ACTIVE_NAV_CLASS : INACTIVE_NAV_CLASS}`}
              aria-current={visitsActive ? 'page' : undefined}
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Visits</span>
            </button>
            {role === 'MANAGER' && (
              <button
                type="button"
                onClick={() => navigate('/manager/team')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm ${teamActive ? ACTIVE_NAV_CLASS : INACTIVE_NAV_CLASS}`}
                aria-current={teamActive ? 'page' : undefined}
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zm8 0a3 3 0 11-6 0 3 3 0 016 0zM6 16a5 5 0 0110 0v1H6v-1zm-6 0a5 5 0 018.58-3.56A7 7 0 006.07 17H0v-1z" />
                </svg>
                <span className="hidden sm:inline">Team</span>
              </button>
            )}
          </nav>
        </div>

        {/* Right cluster: role badge + name + avatar + sign-out */}
        <div className="flex items-center gap-3 shrink-0">
          <span className={`hidden sm:inline-block text-xs font-bold px-2.5 py-1 rounded-full ${badge.className}`}>
            {badge.label}
          </span>

          {appUser?.name && (
            <span className="hidden sm:inline text-sm text-white/80 font-medium max-w-[140px] truncate">
              {appUser.name}
            </span>
          )}

          <button
            type="button"
            onClick={() => navigate('/profile')}
            aria-label="View profile"
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center text-white text-xs font-bold shrink-0"
          >
            {initials(appUser?.name ?? '')}
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className="hidden sm:inline text-sm text-white/70 hover:text-white transition-colors font-medium"
          >
            Sign Out
          </button>
        </div>
      </header>
    </>
  );
}