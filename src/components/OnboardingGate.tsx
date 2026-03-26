'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/AuthProvider';
import { PlayerProfileLoadingScreen } from '@/components/PlayerProfileLoadingScreen';

interface OnboardingGateProps {
  children: ReactNode;
}

/**
 * Redirects authenticated users to /onboarding until they complete the survey,
 * unless they chose "Continue later" (onboarding_deferred_at set).
 */
export function OnboardingGate({ children }: OnboardingGateProps) {
  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [checking, setChecking] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user || !supabase || pathname === '/onboarding') {
      queueMicrotask(() => {
        setChecking(false);
        setNeedsOnboarding(false);
      });
      return;
    }

    let cancelled = false;

    void (async () => {
      setChecking(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed_at, onboarding_deferred_at')
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (error) {
        console.error('OnboardingGate profile load:', error);
        setChecking(false);
        setNeedsOnboarding(false);
        return;
      }

      const complete = Boolean(data?.onboarding_completed_at);
      const deferred = Boolean(data?.onboarding_deferred_at);
      const mustRedirect = !complete && !deferred;

      setNeedsOnboarding(mustRedirect);
      setChecking(false);

      if (mustRedirect) {
        router.replace('/onboarding');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id, supabase, pathname, router]);

  if (authLoading || checking) {
    return <PlayerProfileLoadingScreen />;
  }

  if (!user) {
    return null;
  }

  if (needsOnboarding && pathname !== '/onboarding') {
    return <PlayerProfileLoadingScreen />;
  }

  return <>{children}</>;
}
