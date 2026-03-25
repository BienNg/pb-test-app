import type { SupabaseClient } from '@supabase/supabase-js';
import type { TrainingSession } from '@/components/GameAnalyticsPage';
import { mapDbSessionToTrainingSession } from '@/lib/studentSessions';
import { shotVideoToSessionLike, type ShotVideoRow } from '@/lib/shotVideos';

function getYoutubeVideoId(url: string): string | null {
  const watchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];
  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];
  return null;
}

export type FetchTrainingSessionByIdResult = {
  session: TrainingSession;
  /** Shot video owner display name (for coach/admin breadcrumb). */
  studentDisplayName?: string;
};

/**
 * Load a training session from `sessions` or a shot clip from `shot_videos` by id.
 * Access is enforced by Supabase RLS.
 */
export async function fetchTrainingSessionById(
  supabase: SupabaseClient | null,
  sessionId: string
): Promise<FetchTrainingSessionByIdResult | null> {
  if (!supabase || !sessionId?.trim()) return null;

  let { data: row, error } = await supabase
    .from('sessions')
    .select('id, date, youtube_url, title, session_type')
    .eq('id', sessionId)
    .maybeSingle();

  const needsTitleFallback =
    error &&
    ((error.message && /column .*(title|session_type).* does not exist/i.test(error.message)) ||
      (typeof error.details === 'string' && /column .*(title|session_type).* does not exist/i.test(error.details)));

  if (needsTitleFallback) {
    const fb = await supabase.from('sessions').select('id, date, youtube_url').eq('id', sessionId).maybeSingle();
    row = fb.data as typeof row;
    error = fb.error;
  }

  if (!error && row) {
    return {
      session: mapDbSessionToTrainingSession(
        row as { id: string; date: string; youtube_url: string | null; title?: string | null; session_type?: string | null }
      ),
    };
  }

  const { data: shot, error: shotErr } = await supabase
    .from('shot_videos')
    .select('id, video_url, student_id, shot_id, shot_title, created_at')
    .eq('id', sessionId)
    .maybeSingle();

  if (shotErr || !shot) return null;

  const shotRow = shot as ShotVideoRow;
  let studentDisplayName: string | undefined;
  if (shotRow.student_id) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', shotRow.student_id)
      .maybeSingle();
    const p = prof as { full_name: string | null; email: string | null } | null;
    if (p) {
      studentDisplayName = p.full_name?.trim() || p.email?.trim() || undefined;
    }
  }

  return {
    session: shotVideoToSessionLike(shotRow, getYoutubeVideoId),
    studentDisplayName,
  };
}
