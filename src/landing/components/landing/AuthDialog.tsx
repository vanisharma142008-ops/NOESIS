import React, { useEffect, useRef, useState } from 'react';
import { rememberSignIn, restoreIfEmpty, signIn, signInWithEmail, type CloudUser } from '@/src/cloud/sync';

export type AuthMode = 'signin' | 'signup';

interface AuthDialogProps {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onClose: () => void;
  onSignedIn: (user: CloudUser) => void;
}

const errorMessage = (e: unknown, mode: AuthMode): string => {
  const code = (e as { code?: string }).code ?? '';
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Sign-in was cancelled.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email or password is incorrect.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Sign in instead.';
    case 'auth/weak-password':
      return 'Use a password of at least 6 characters.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'No connection. Check your internet and try again.';
    case 'auth/operation-not-allowed':
      return 'Email sign-in is not enabled yet. Use Google, or enable Email/Password in Firebase Authentication.';
    case 'auth/unauthorized-domain':
      return "This website isn't allowed to sign in yet (add it under Firebase Authentication → Settings → Authorized domains).";
    default:
      return mode === 'signup' ? "Couldn't create your account. Try again." : "Sign-in didn't work. Try again.";
  }
};

export const AuthDialog: React.FC<AuthDialogProps> = ({ mode, onModeChange, onClose, onSignedIn }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const isSignUp = mode === 'signup';

  useEffect(() => {
    emailRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => { setError(null); }, [mode]);

  const finish = async (user: CloudUser | null) => {
    if (!user) return;
    rememberSignIn(true);
    // a new device picks up the saved progress before any backup can overwrite it
    await restoreIfEmpty(user.uid).catch(() => false);
    onSignedIn(user);
  };

  const run = async (action: () => Promise<CloudUser | null>) => {
    setBusy(true);
    setError(null);
    try {
      await finish(await action());
    } catch (e) {
      setError(errorMessage(e, mode));
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void run(() => signInWithEmail(email.trim(), password, isSignUp));
  };

  return (
    <div className="auth-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title" data-testid="auth-dialog">
        <button type="button" className="auth-close" onClick={onClose} aria-label="Close">✕</button>
        <h2 id="auth-title" className="auth-title">{isSignUp ? 'Create your account' : 'Welcome back'}</h2>
        <p className="auth-sub">{isSignUp ? 'Sign up to back up your progress and continue on any device.' : 'Sign in to continue where you left off.'}</p>

        <button type="button" className="auth-google" onClick={() => void run(signIn)} disabled={busy} data-testid="auth-google">
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="auth-divider"><span>or</span></div>

        <form className="auth-form" onSubmit={onSubmit}>
          <label className="auth-label" htmlFor="auth-email">Email</label>
          <input
            id="auth-email" ref={emailRef} className="auth-input" type="email" autoComplete="email" required
            value={email} onChange={(e) => setEmail(e.target.value)} data-testid="auth-email"
          />
          <label className="auth-label" htmlFor="auth-password">Password</label>
          <input
            id="auth-password" className="auth-input" type="password" required minLength={6}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            value={password} onChange={(e) => setPassword(e.target.value)} data-testid="auth-password"
          />
          {error && <p className="auth-error" role="alert" data-testid="auth-error">{error}</p>}
          <button type="submit" className="btn-primary-restrained full-width auth-submit" disabled={busy} data-testid="auth-submit">
            {busy ? 'Please wait…' : isSignUp ? 'Sign up' : 'Sign in'}
          </button>
        </form>

        <p className="auth-switch">
          {isSignUp ? 'Already have an account?' : 'New to NOÊSIS?'}{' '}
          <button type="button" className="auth-link" onClick={() => onModeChange(isSignUp ? 'signin' : 'signup')} data-testid="auth-switch">
            {isSignUp ? 'Sign in' : 'Create an account'}
          </button>
        </p>
      </div>
    </div>
  );
};
