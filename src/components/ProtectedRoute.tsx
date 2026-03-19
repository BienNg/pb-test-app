'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './providers/AuthProvider';
import { PlayerProfileLoadingScreen } from './PlayerProfileLoadingScreen';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Wraps content that requires an authenticated user.
 * Redirects to /login when not logged in (after auth has finished loading).
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return <PlayerProfileLoadingScreen />;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
