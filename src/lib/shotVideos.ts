import type { SupabaseClient } from '@supabase/supabase-js';

export interface ShotVideoRow {
  id: string;
  video_url: string;
  student_id: string;
  shot_id: string;
  shot_title: string;
  created_at: string;
}

export interface InsertShotVideoParams {
  videoUrl: string;
  studentId: string;
  shotId: string;
  shotTitle: string;
}

/**
 * Fetch shot video counts per shot_id for a student (for roadmap card badges and sorting).
 */
export async function fetchShotVideoCountsByShot(
  supabase: SupabaseClient | null,
  studentId: string
): Promise<Record<string, number>> {
  if (!supabase || !studentId) return {};
  const { data, error } = await supabase
    .from('shot_videos')
    .select('shot_id')
    .eq('student_id', studentId);
  if (error) return {};
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const id = (row as { shot_id: string }).shot_id;
    if (id) counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

/**
 * Fetch shot videos for a student and shot (for "Your Sessions" tab in ShotDetailView).
 */
export async function fetchShotVideos(
  supabase: SupabaseClient | null,
  studentId: string,
  shotId: string
): Promise<ShotVideoRow[]> {
  if (!supabase || !studentId || !shotId) return [];
  const { data, error } = await supabase
    .from('shot_videos')
    .select('id, video_url, student_id, shot_id, shot_title, created_at')
    .eq('student_id', studentId)
    .eq('shot_id', shotId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as ShotVideoRow[];
}

/**
 * Insert a shot video for a student (e.g. from ShotDetailView "Add video").
 * Stores video URL, student, shot id/title, and created_at as the date.
 */
export async function insertShotVideo(
  supabase: SupabaseClient | null,
  params: InsertShotVideoParams
): Promise<{ id: string } | { error: string }> {
  if (!supabase) {
    return { error: 'Database client not configured' };
  }
  const { data, error } = await supabase
    .from('shot_videos')
    .insert({
      video_url: params.videoUrl,
      student_id: params.studentId,
      shot_id: params.shotId,
      shot_title: params.shotTitle,
    })
    .select('id')
    .single();
  if (error) {
    return { error: error.message };
  }
  return { id: (data as { id: string }).id };
}

/** Shape used to open a shot video in TrainingSessionDetail (matches TrainingSession from MySessionsPage). */
export interface ShotVideoAsSession {
  id: string;
  dateKey: string;
  dateLabel: string;
  time: string;
  thumbnail: string;
  duration: string;
  title: string;
  focus: string;
  videoUrl: string;
  session_type?: string;
}

/**
 * Convert a shot_videos row to a session-like object for TrainingSessionDetail.
 * Caller must pass a getYoutubeVideoId function to avoid importing from @/lib/youtube (avoids circular deps).
 */
export function shotVideoToSessionLike(
  row: ShotVideoRow,
  getYoutubeVideoId: (url: string) => string | null
): ShotVideoAsSession {
  const dateKey =
    row.created_at && row.created_at.length >= 10
      ? row.created_at.slice(0, 10)
      : new Date().toISOString().slice(0, 10);
  let dateLabel = '';
  try {
    const d = new Date(dateKey + 'T12:00:00');
    dateLabel = d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    dateLabel = dateKey;
  }
  const ytId = getYoutubeVideoId(row.video_url);
  const thumbnail = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : '';
  return {
    id: row.id,
    dateKey,
    dateLabel,
    time: '—',
    thumbnail,
    duration: '—',
    title: row.shot_title,
    focus: '',
    videoUrl: row.video_url,
    session_type: 'shot_video',
  };
}
