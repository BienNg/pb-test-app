'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrainingSessionDetail } from './TrainingSessionDetail';
import type { TrainingSession } from './GameAnalyticsPage';
import { createClient } from '@/lib/supabase/client';
import { fetchTrainingSessionById } from '@/lib/fetchTrainingSessionById';
import { useAuth } from './providers/AuthProvider';
import { PlayerProfileLoadingScreen } from './PlayerProfileLoadingScreen';
import { COLORS, SPACING, TYPOGRAPHY } from '@/styles/theme';

export function TrainingSessionRoutePage({ sessionId }: { sessionId: string }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [session, setSession] = useState<TrainingSession | null>(null);
  const [studentDisplayName, setStudentDisplayName] = useState<string | undefined>();
  const [profileRole, setProfileRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) {
      setError('Database not configured');
      setSession(null);
      return;
    }
    const res = await fetchTrainingSessionById(supabase, sessionId);
    if (!res) {
      setSession(null);
      setStudentDisplayName(undefined);
      setError("We couldn't find this session or you don't have access.");
    } else {
      setSession(res.session);
      setStudentDisplayName(res.studentDisplayName);
      setError(null);
    }
  }, [supabase, sessionId]);

  useEffect(() => {
    if (authLoading || !user?.id) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      if (!supabase) {
        if (!cancelled) {
          setError('Database not configured');
          setLoading(false);
        }
        return;
      }
      const { data: profData } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (cancelled) return;
      setProfileRole((profData as { role: string | null } | null)?.role ?? null);
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id, supabase, sessionId, load]);

  const isAdmin = profileRole === 'admin';

  const handleSaveVideoUrl = async (sid: string, youtubeUrl: string) => {
    if (!supabase) throw new Error('Database not configured');
    const { error: upErr } = await supabase.from('sessions').update({ youtube_url: youtubeUrl }).eq('id', sid);
    if (upErr) throw new Error(upErr.message);
    await load();
  };

  const homeHref = profileRole === 'admin' ? '/admin' : profileRole === 'coach' ? '/coach' : '/';

  const handleBack = () => {
    router.back();
  };

  const breadcrumbFromRoadmap =
    session?.session_type === 'shot_video'
      ? {
          ...(studentDisplayName ? { studentName: studentDisplayName } : {}),
          shotTitle: session.title,
        }
      : undefined;

  if (authLoading || loading) {
    return <PlayerProfileLoadingScreen />;
  }

  if (error || !session) {
    return (
      <div
        style={{
          minHeight: '100vh',
          padding: SPACING.xl,
          backgroundColor: COLORS.backgroundLibrary,
          boxSizing: 'border-box',
        }}
      >
        <p style={{ ...TYPOGRAPHY.body, color: COLORS.textPrimary, margin: `0 0 ${SPACING.md}px` }}>
          {error ?? 'Session not found.'}
        </p>
        <button
          type="button"
          onClick={() => router.replace(homeHref)}
          style={{
            ...TYPOGRAPHY.label,
            padding: `${SPACING.sm}px ${SPACING.md}px`,
            borderRadius: 8,
            border: 'none',
            backgroundColor: COLORS.libraryPrimary,
            color: COLORS.textPrimary,
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Go home
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffffff',
      }}
    >
      <TrainingSessionDetail
        sessionId={sessionId}
        onBack={handleBack}
        sessions={[session]}
        onSaveVideoUrl={isAdmin ? handleSaveVideoUrl : undefined}
        onSessionUpdated={load}
        onDeleteSession={isAdmin ? async () => { await load(); } : undefined}
        isAdminView={isAdmin}
        breadcrumbFromRoadmap={breadcrumbFromRoadmap}
        onBreadcrumbShotClick={() => router.replace(homeHref)}
      />
    </div>
  );
}
