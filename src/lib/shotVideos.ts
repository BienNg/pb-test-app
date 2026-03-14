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
