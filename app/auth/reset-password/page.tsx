'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff } from 'lucide-react';

const styles = {
  primary: '#8FB9A8',
  primaryHover: '#5F8B7A',
  backgroundLight: '#f6f8f8',
  sageSoft: '#E3EDE9',
  fontDisplay: "'Lexend', sans-serif",
  radiusXl: '12px',
  radius2xl: '16px',
  inputHeight: 48,
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
} as const;

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setHasRecoverySession(true);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setReady(true);
      if (session) setHasRecoverySession(true);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setError('Auth is not configured.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 2000);
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: styles.backgroundLight,
          fontFamily: styles.fontDisplay,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <p style={{ color: styles.slate[500] }}>Loading…</p>
      </div>
    );
  }

  if (!hasRecoverySession) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: styles.backgroundLight,
          fontFamily: styles.fontDisplay,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 400,
            textAlign: 'center',
            background: 'white',
            padding: 32,
            borderRadius: styles.radius2xl,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            border: `1px solid ${styles.sageSoft}`,
          }}
        >
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 12, color: styles.slate[900] }}>
            Reset your password
          </h1>
          <p style={{ fontSize: 14, color: styles.slate[500], marginBottom: 24, lineHeight: 1.5 }}>
            Please use the link from your email to reset your password. The link may have expired.
          </p>
          <Link
            href="/login"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              borderRadius: styles.radiusXl,
              background: styles.primary,
              color: 'white',
              fontWeight: 600,
              fontSize: 15,
              textDecoration: 'none',
            }}
          >
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: styles.backgroundLight,
          fontFamily: styles.fontDisplay,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 400,
            textAlign: 'center',
            background: 'white',
            padding: 32,
            borderRadius: styles.radius2xl,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            border: `1px solid ${styles.sageSoft}`,
          }}
        >
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 12, color: styles.slate[900] }}>
            Password updated
          </h1>
          <p style={{ fontSize: 14, color: styles.slate[500], margin: 0 }}>
            Your password has been reset. Redirecting to the app…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: styles.backgroundLight,
        fontFamily: styles.fontDisplay,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'white',
          padding: 32,
          borderRadius: styles.radius2xl,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          border: `1px solid ${styles.sageSoft}`,
        }}
      >
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 24, color: styles.slate[900] }}>
          Set new password
        </h1>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 500,
                color: styles.slate[700],
                marginBottom: 6,
              }}
            >
              New password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="Enter new password"
                style={{
                  width: '100%',
                  height: styles.inputHeight,
                  borderRadius: styles.radiusXl,
                  border: `1px solid ${styles.slate[200]}`,
                  background: styles.slate[50],
                  padding: '0 48px 0 16px',
                  fontSize: 16,
                  color: styles.slate[900],
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: styles.slate[400],
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <div>
            <label
              htmlFor="confirm-password"
              style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 500,
                color: styles.slate[700],
                marginBottom: 6,
              }}
            >
              Confirm password
            </label>
            <input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="Confirm new password"
              style={{
                width: '100%',
                height: styles.inputHeight,
                borderRadius: styles.radiusXl,
                border: `1px solid ${styles.slate[200]}`,
                background: styles.slate[50],
                padding: '0 16px',
                fontSize: 16,
                color: styles.slate[900],
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>
          {error && <p style={{ color: '#dc2626', fontSize: 14, margin: 0 }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              height: styles.inputHeight,
              background: styles.primary,
              color: 'white',
              fontWeight: 600,
              borderRadius: styles.radiusXl,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 16,
            }}
          >
            {loading ? '…' : 'Update password'}
          </button>
        </form>
        <p style={{ marginTop: 24, textAlign: 'center' }}>
          <Link
            href="/login"
            style={{
              fontSize: 14,
              color: styles.primary,
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
