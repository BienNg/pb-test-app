'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const next = pathname ? `?next=${encodeURIComponent(pathname)}` : '';
      router.replace(`/login${next}`);
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return <PlayerProfileLoadingScreen />;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
