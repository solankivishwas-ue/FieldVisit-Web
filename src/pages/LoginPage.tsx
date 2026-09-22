// LoginPage — email/password sign-in AND self-signup in one page.
//
// Tabs: "Sign In" | "Create Account"
// Sign-up flow:
//   1. createUserWithEmailAndPassword
//   2. Write Firestore users/{uid} with role = 'EMPLOYEE'
//   3. Send verification email
//   4. Sign out immediately (unverified users cannot use the app)
//   5. Show "Check your inbox" panel
//
// Sign-in flow:
//   1. signInWithEmailAndPassword
//   2. If emailVerified === false → sign out + show warning banner
//   3. Fetch Firestore profile to determine role
//   4. Redirect: MANAGER/SENIOR → /manager, EMPLOYEE → /employee
//
// Password reset: "Forgot password?" link → inline panel

import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  firebaseSignIn,
  firebaseSignOut,
  firebaseSignUp,
  firebaseSendEmailVerification,
  firebaseSendPasswordReset,
} from '../services/auth.service';
import { createUserDoc, getUserDoc } from '../services/users.service';

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'signin' | 'signup';
type Panel = 'form' | 'verify-sent' | 'reset-sent' | 'forgot-password';

// ── Helpers ───────────────────────────────────────────────────────────────────

function friendlyError(code: string): string {
  if (
    code.includes('invalid-credential') ||
    code.includes('wrong-password') ||
    code.includes('user-not-found')
  ) return 'Incorrect email or password.';
  if (code.includes('email-already-in-use'))
    return 'An account with this email already exists. Try signing in.';
  if (code.includes('weak-password'))
    return 'Password must be at least 6 characters.';
  if (code.includes('invalid-email'))
    return 'Please enter a valid email address.';
  if (code.includes('too-many-requests'))
    return 'Too many attempts. Please wait a moment and try again.';
  return 'Something went wrong. Please try again.';
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
      {message}
    </div>
  );
}

function InfoBanner({ message }: { message: string }) {
  return (
    <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700">
      {message}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // ProtectedRoute may redirect here with state.unverified = true
  const wasRedirectedUnverified =
    (location.state as { unverified?: boolean } | null)?.unverified === true;

  const [tab, setTab] = useState<Tab>('signin');
  const [panel, setPanel] = useState<Panel>('form');

  // Shared fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Sign-up only
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Forgot-password panel
  const [resetEmail, setResetEmail] = useState('');

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unverifiedWarning, setUnverifiedWarning] = useState(wasRedirectedUnverified);

  function clearError() { setError(null); setUnverifiedWarning(false); }

  function switchTab(t: Tab) { setTab(t); setPanel('form'); clearError(); }

  // ── Sign In ─────────────────────────────────────────────────────────────────

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    clearError();
    if (!email.trim() || !password) { setError('Email and password are required.'); return; }
    setLoading(true);
    try {
      const fbUser = await firebaseSignIn(email.trim(), password);
      if (!fbUser.emailVerified) {
        await firebaseSignOut();
        setUnverifiedWarning(true);
        setLoading(false);
        return;
      }
      const profile = await getUserDoc(fbUser.uid);
      const role = profile?.role ?? 'EMPLOYEE';
      if (role === 'MANAGER' || role === 'SENIOR') {
        navigate('/manager', { replace: true });
      } else {
        navigate('/employee', { replace: true });
      }
    } catch (err: unknown) {
      setError(friendlyError(err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  }

  // ── Sign Up ─────────────────────────────────────────────────────────────────

  async function handleSignUp(e: FormEvent) {
    e.preventDefault();
    clearError();
    if (!name.trim()) { setError('Full name is required.'); return; }
    if (!email.trim()) { setError('Email is required.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const fbUser = await firebaseSignUp(email.trim(), password);
      await createUserDoc(fbUser.uid, name.trim(), email.trim());
      await firebaseSendEmailVerification();
      await firebaseSignOut();
      setPanel('verify-sent');
    } catch (err: unknown) {
      setError(friendlyError(err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  }

  // ── Password Reset ───────────────────────────────────────────────────────────

  async function handlePasswordReset(e: FormEvent) {
    e.preventDefault();
    clearError();
    if (!resetEmail.trim()) { setError('Please enter your email address.'); return; }
    setLoading(true);
    try {
      await firebaseSendPasswordReset(resetEmail.trim());
      setPanel('reset-sent');
    } catch (err: unknown) {
      setError(friendlyError(err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 px-8 py-6 text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">FieldVisit</h1>
          <p className="mt-1 text-blue-200 text-sm">Field team management</p>
        </div>

        {/* Body */}
        <div className="px-8 py-6">

          {/* Verification-sent panel */}
          {panel === 'verify-sent' && (
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-4xl">✉️</div>
              <h2 className="text-lg font-semibold text-gray-900">Check your inbox</h2>
              <p className="text-sm text-gray-500">
                We sent a verification link to <strong>{email}</strong>. Click it, then come back to sign in.
              </p>
              <button type="button" onClick={() => { setPanel('form'); setTab('signin'); clearError(); }}
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
                Go to Sign In
              </button>
            </div>
          )}

          {/* Reset-sent panel */}
          {panel === 'reset-sent' && (
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-4xl">🔑</div>
              <h2 className="text-lg font-semibold text-gray-900">Reset email sent</h2>
              <p className="text-sm text-gray-500">Check <strong>{resetEmail}</strong> for a password-reset link.</p>
              <button type="button" onClick={() => { setPanel('form'); setTab('signin'); clearError(); }}
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
                Back to Sign In
              </button>
            </div>
          )}

          {/* Forgot-password panel */}
          {panel === 'forgot-password' && (
            <div className="space-y-4">
              <button type="button" onClick={() => { setPanel('form'); clearError(); }}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
                ← Back to Sign In
              </button>
              <h2 className="text-lg font-semibold text-gray-900">Reset your password</h2>
              <p className="text-sm text-gray-500">Enter your email and we&apos;ll send you a reset link.</p>
              {error && <ErrorBanner message={error} />}
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input id="reset-email" type="email" autoComplete="email"
                    value={resetEmail} onChange={e => { setResetEmail(e.target.value); clearError(); }}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
            </div>
          )}


          {/* Main form panel */}
          {panel === 'form' && (
            <div className="space-y-5">
              {/* Tab switcher */}
              <div className="flex rounded-lg bg-gray-100 p-1 gap-1">
                {(['signin', 'signup'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => switchTab(t)}
                    className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                      tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}>
                    {t === 'signin' ? 'Sign In' : 'Create Account'}
                  </button>
                ))}
              </div>

              {unverifiedWarning && (
                <InfoBanner message="Please verify your email before signing in. Check your inbox for a verification link." />
              )}
              {error && <ErrorBanner message={error} />}

              {/* Sign-in form */}
              {tab === 'signin' && (
                <form onSubmit={handleSignIn} className="space-y-4" noValidate>
                  <div>
                    <label htmlFor="signin-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input id="signin-email" type="email" autoComplete="email"
                      value={email} onChange={e => { setEmail(e.target.value); clearError(); }}
                      placeholder="you@example.com"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="signin-password" className="text-sm font-medium text-gray-700">Password</label>
                      <button type="button"
                        onClick={() => { setResetEmail(email); setPanel('forgot-password'); clearError(); }}
                        className="text-xs text-blue-600 hover:text-blue-800">
                        Forgot password?
                      </button>
                    </div>
                    <input id="signin-password" type="password" autoComplete="current-password"
                      value={password} onChange={e => { setPassword(e.target.value); clearError(); }}
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                    {loading ? 'Signing in…' : 'Sign In'}
                  </button>
                </form>
              )}


              {/* Sign-up form */}
              {tab === 'signup' && (
                <form onSubmit={handleSignUp} className="space-y-4" noValidate>
                  <div>
                    <label htmlFor="signup-name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input id="signup-name" type="text" autoComplete="name"
                      value={name} onChange={e => { setName(e.target.value); clearError(); }}
                      placeholder="Jane Smith"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input id="signup-email" type="email" autoComplete="email"
                      value={email} onChange={e => { setEmail(e.target.value); clearError(); }}
                      placeholder="you@example.com"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-1">
                      Password <span className="text-gray-400 font-normal">(min 6 chars)</span>
                    </label>
                    <input id="signup-password" type="password" autoComplete="new-password"
                      value={password} onChange={e => { setPassword(e.target.value); clearError(); }}
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label htmlFor="signup-confirm" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                    <input id="signup-confirm" type="password" autoComplete="new-password"
                      value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); clearError(); }}
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                  </div>
                  <p className="text-xs text-gray-500">
                    New accounts are created as <strong>Employee</strong>. A manager must promote your role via the Android app.
                  </p>
                  <button type="submit" disabled={loading}
                    className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                    {loading ? 'Creating account…' : 'Create Account'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-gray-400 text-center">
        FieldVisit Web · companion to the Android app
      </p>
    </div>
  );
}

