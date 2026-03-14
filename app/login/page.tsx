'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff, TrendingUp, GraduationCap } from 'lucide-react';

// Design tokens from reference
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

function TennisIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      <path d="M2 12h20" />
    </svg>
  );
}

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showNotSupported, setShowNotSupported] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const err = searchParams.get('error');
    if (err === 'auth_callback') {
      setError('Sign in with Google failed. Please try again.');
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setError('Auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError(signInError.message);
          return;
        }
      }
      router.push('/');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  function handleSocialSignIn() {
    setShowNotSupported(true);
  }

  return (
    <>
      {showNotSupported && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="not-supported-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setShowNotSupported(false)}
        >
          <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
          `}</style>
          <div
            style={{
              background: 'white',
              borderRadius: styles.radius2xl,
              padding: 24,
              maxWidth: 340,
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
              animation: 'slideUp 0.25s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p
              id="not-supported-title"
              style={{
                fontFamily: styles.fontDisplay,
                fontSize: 18,
                fontWeight: 600,
                color: styles.slate[900],
                margin: '0 0 12px',
                textAlign: 'center',
              }}
            >
              not supported yet
            </p>
            <p
              style={{
                fontFamily: styles.fontDisplay,
                fontSize: 14,
                color: styles.slate[500],
                margin: '0 0 20px',
                textAlign: 'center',
                lineHeight: 1.5,
              }}
            >
              Sign in with email and password for now.
            </p>
            <button
              type="button"
              onClick={() => setShowNotSupported(false)}
              style={{
                width: '100%',
                height: 44,
                borderRadius: styles.radiusXl,
                border: 'none',
                background: styles.primary,
                color: 'white',
                fontFamily: styles.fontDisplay,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          minHeight: 'max(884px, 100dvh)',
          background: styles.backgroundLight,
          fontFamily: styles.fontDisplay,
          color: styles.slate[900],
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
      <div style={{ width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Header: logo + title + tagline */}
        <div style={{ marginBottom: 40, textAlign: 'center' }}>
          <div
            style={{
              margin: '0 auto 24px',
              width: 80,
              height: 80,
              borderRadius: styles.radius2xl,
              background: styles.primary,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 10px 15px -3px ${styles.primary}33`,
            }}
          >
            <TennisIcon size={40} />
          </div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, letterSpacing: '-0.025em', color: styles.slate[900], margin: 0 }}>
            Pickleball Academy
          </h1>
          <p style={{ marginTop: 8, color: styles.slate[500], fontSize: '1rem', marginBottom: 0 }}>
            Your court performance, optimized.
          </p>
        </div>

        {/* Card: form + social + sign up link */}
        <div
          style={{
            width: '100%',
            borderRadius: styles.radius2xl,
            background: 'white',
            padding: 32,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            border: `1px solid ${styles.sageSoft}`,
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 24, marginTop: 0 }}>
            {isSignUp ? 'Create account' : 'Welcome back'}
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label
                htmlFor="email"
                style={{
                  display: 'block',
                  fontSize: 14,
                  fontWeight: 500,
                  color: styles.slate[700],
                  marginBottom: 6,
                  marginLeft: 4,
                }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="name@example.com"
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
                onFocus={(e) => {
                  e.target.style.borderColor = styles.primary;
                  e.target.style.boxShadow = `0 0 0 2px ${styles.primary}33`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = styles.slate[200];
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                style={{ display: 'block', fontSize: 14, fontWeight: 500, color: styles.slate[700], marginBottom: 6, marginLeft: 4 }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  placeholder="Enter your password"
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
                  onFocus={(e) => {
                    e.target.style.borderColor = styles.primary;
                    e.target.style.boxShadow = `0 0 0 2px ${styles.primary}33`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = styles.slate[200];
                    e.target.style.boxShadow = 'none';
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

            {error && (
              <p style={{ color: '#dc2626', fontSize: 14, margin: 0 }}>{error}</p>
            )}

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
                marginTop: 8,
                boxShadow: `0 4px 6px -1px ${styles.primary}1a`,
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.background = styles.primaryHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = styles.primary;
              }}
            >
              {loading ? '…' : isSignUp ? 'Sign up' : 'Login'}
            </button>
          </form>

          {/* Or continue with */}
          <div style={{ position: 'relative', margin: '32px 0' }}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
              <div style={{ width: '100%', borderTop: `1px solid ${styles.slate[100]}` }} />
            </div>
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
              <span
                style={{
                  background: 'white',
                  padding: '0 16px',
                  fontSize: 12,
                  color: styles.slate[400],
                  fontWeight: 500,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                Or continue with
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <button
              type="button"
              onClick={handleSocialSignIn}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: styles.inputHeight,
                borderRadius: styles.radiusXl,
                border: `1px solid ${styles.slate[200]}`,
                background: 'white',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                color: styles.slate[900],
              }}
            >
              <svg width={20} height={20} viewBox="0 0 24 24" style={{ marginRight: 8 }} aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </button>
            <button
              type="button"
              onClick={handleSocialSignIn}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: styles.inputHeight,
                borderRadius: styles.radiusXl,
                border: `1px solid ${styles.slate[200]}`,
                background: 'white',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                color: styles.slate[900],
              }}
            >
              <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 8 }} aria-hidden>
                <path d="M17.05 20.28c-.96.95-2.21 1.72-3.72 1.72-1.47 0-2.33-.51-3.33-.51-.99 0-2 .54-3.32.54-2.13 0-4.04-1.89-4.04-5.12 0-2.66 1.48-4.38 3.12-4.38.93 0 1.64.48 2.37.48.69 0 1.29-.48 2.4-.48 1.41 0 2.49.81 3.03 1.95-2.43 1.23-2.04 4.14.49 5.12-.48 1.44-1.41 2.31-2.4 3.31zm-1.83-11.85c0 1.5-1.14 2.73-2.67 2.73-.06-1.59 1.23-2.88 2.67-2.73z" />
              </svg>
              Apple
            </button>
          </div>

          <div style={{ marginTop: 32, textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: styles.slate[500], margin: 0 }}>
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <button
                type="button"
                onClick={() => setIsSignUp((v) => !v)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontFamily: 'inherit',
                  fontSize: 14,
                  fontWeight: 600,
                  color: styles.primary,
                  cursor: 'pointer',
                  marginLeft: 4,
                }}
              >
                {isSignUp ? 'Log in' : 'Sign up for free'}
              </button>
            </p>
          </div>
        </div>

        {/* Feature cards */}
        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: '100%', padding: '0 16px' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              padding: 16,
              borderRadius: styles.radiusXl,
              background: `${styles.sageSoft}4D`,
            }}
          >
            <TrendingUp size={24} style={{ color: styles.primary, marginBottom: 8 }} aria-hidden />
            <span style={{ fontSize: 12, fontWeight: 500, color: styles.slate[600], letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Track Progress
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              padding: 16,
              borderRadius: styles.radiusXl,
              background: `${styles.sageSoft}4D`,
            }}
          >
            <GraduationCap size={24} style={{ color: styles.primary, marginBottom: 8 }} aria-hidden />
            <span style={{ fontSize: 12, fontWeight: 500, color: styles.slate[600], letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Academy Course
            </span>
          </div>
        </div>

      </div>
    </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            background: '#f6f8f8',
            fontFamily: "'Lexend', sans-serif",
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <p style={{ color: '#64748b' }}>Loading…</p>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
