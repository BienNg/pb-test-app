import type { TrainingSession } from '@/components/GameAnalyticsPage';
import type { SupabaseClient } from '@supabase/supabase-js';

function getYoutubeVideoId(url: string): string | null {
  const watchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];
  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];
  return null;
}

/** Map a DB session row to TrainingSession for GameAnalyticsPage. */
export function mapDbSessionToTrainingSession(row: {
  id: string;
  date: string;
  youtube_url: string | null;
  title?: string | null;
  session_type?: string | null;
}): TrainingSession {
  const dateKey = typeof row.date === 'string' && row.date.length >= 10 ? row.date.slice(0, 10) : row.date;
  const d = new Date(dateKey + 'T12:00:00');
  const dateLabel = d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const videoUrl = row.youtube_url ?? '';
  const ytId = videoUrl ? getYoutubeVideoId(videoUrl) : null;
  const thumbnail = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : '🎾';
  return {
    id: row.id,
    dateKey,
    dateLabel,
    time: '—',
    thumbnail,
    duration: '—',
    title: row.title?.trim() || 'Training Session',
    focus: '',
    videoUrl,
    session_type: row.session_type || undefined,
  };
}

/** Fetch session counts per student from DB (session_students). Returns a map of student_id -> count. */
export async function fetchSessionCountsForStudentIds(
  supabase: SupabaseClient | null,
  studentIds: string[]
): Promise<Record<string, number>> {
  if (!supabase || studentIds.length === 0) return {};
  const { data, error } = await supabase
    .from('session_students')
    .select('student_id')
    .in('student_id', studentIds);
  if (error || !data) return {};
  const rows = data as { student_id: string }[];
  const counts: Record<string, number> = {};
  for (const id of studentIds) counts[id] = 0;
  for (const r of rows) {
    counts[r.student_id] = (counts[r.student_id] ?? 0) + 1;
  }
  return counts;
}

/** Fetch the date of the first session for each student. Returns a map of student_id -> first_session_date. */
export async function fetchFirstSessionDateForStudentIds(
  supabase: SupabaseClient | null,
  studentIds: string[]
): Promise<Record<string, string>> {
  if (!supabase || studentIds.length === 0) return {};
  
  const { data, error } = await supabase
    .from('session_students')
    .select('student_id, session_id, sessions!inner(date)')
    .in('student_id', studentIds);
  
  if (error || !data) return {};

  const rows = data as unknown as Array<{
    student_id: string;
    session_id: string;
    sessions: { date: string } | { date: string }[];
  }>;

  const firstDates: Record<string, string> = {};

  for (const row of rows) {
    const studentId = row.student_id;
    const sessionDate = Array.isArray(row.sessions)
      ? row.sessions[0]?.date
      : row.sessions.date;

    if (!sessionDate) continue;

    if (!firstDates[studentId] || sessionDate < firstDates[studentId]) {
      firstDates[studentId] = sessionDate;
    }
  }
  
  return firstDates;
}

/** Fetch sessions for a student from DB (session_students -> sessions). Returns [] on error or no Supabase. */
export async function fetchSessionsForStudent(
  supabase: SupabaseClient | null,
  studentId: string
): Promise<TrainingSession[]> {
  if (!supabase) return [];
  const { data: linkData, error: linkErr } = await supabase
    .from('session_students')
    .select('session_id')
    .eq('student_id', studentId);
  if (linkErr || !linkData?.length) return [];
  const sessionIds = (linkData as { session_id: string }[]).map((r) => r.session_id);
  // Prefer querying the optional "title" column, but gracefully fall back if the DB
  // hasn't been migrated yet (so "title" may not exist in the "sessions" table).
  const { data, error } = await supabase
    .from('sessions')
    .select('id, date, youtube_url, title, session_type')
    .in('id', sessionIds)
    .order('date', { ascending: false });

  if (error || !data) {
    // If the error indicates the "title" column doesn't exist, retry without it so
    // older databases (without the migration) still work.
    const needsFallback =
      (error?.message && /column .*(title|session_type).* does not exist/i.test(error.message)) ||
      (typeof error?.details === 'string' && /column .*(title|session_type).* does not exist/i.test(error.details));

    if (!needsFallback) return [];

    const { data: dataNoTitle, error: fallbackError } = await supabase
      .from('sessions')
      .select('id, date, youtube_url')
      .in('id', sessionIds)
      .order('date', { ascending: false });

    if (fallbackError || !dataNoTitle) return [];
    const fallbackRows = dataNoTitle as { id: string; date: string; youtube_url: string | null }[];
    return fallbackRows.map(mapDbSessionToTrainingSession);
  }

  const rows = data as { id: string; date: string; youtube_url: string | null; title?: string | null; session_type?: string | null }[];
  return rows.map(mapDbSessionToTrainingSession);
}
