import type { SupabaseClient } from '@supabase/supabase-js';
import type { SessionCommentWithAuthor } from '@/lib/sessionComments';
import { mapDbCommentToSessionComment } from '@/lib/sessionComments';
import type { SessionComment } from '@/components/GameAnalyticsPage';
import { MOCK_COACHES } from '@/data/mockCoaches';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ShotVideoCommentRow = {
  id: string;
  shot_video_id: string;
  author_id: string;
  text: string;
  timestamp_seconds: number | null;
  example_gif: string | null;
  created_at: string;
};

/** Row + author; no mentions table for shot_video_comments. Compatible with mapDbCommentToSessionComment. */
export type ShotVideoCommentWithAuthor = ShotVideoCommentRow & {
  author?: { id: string; full_name: string | null; role: string | null } | null;
  mentions?: { profile_id: string; full_name: string | null }[];
};

/** Fetch all comments for a shot video. Returns [] on error. */
export async function fetchShotVideoComments(
  supabase: SupabaseClient | null,
  shotVideoId: string
): Promise<ShotVideoCommentWithAuthor[]> {
  if (!supabase) return [];
  const { data: comments, error } = await supabase
    .from('shot_video_comments')
    .select('id, shot_video_id, author_id, text, timestamp_seconds, example_gif, created_at')
    .eq('shot_video_id', shotVideoId)
    .order('created_at', { ascending: true });
  if (error || !comments) return [];
  const rows = comments as ShotVideoCommentRow[];
  if (rows.length === 0) return [];

  const authorIds = [...new Set(rows.map((r) => r.author_id))];
  const validAuthorIds = authorIds.filter((id) => UUID_REGEX.test(id));
  let profiles: { id: string; full_name: string | null; role: string | null }[] | null = null;
  if (validAuthorIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .in('id', validAuthorIds);
    profiles = data as { id: string; full_name: string | null; role: string | null }[];
  }
  const profileMap = new Map<string, { id: string; full_name: string | null; role: string | null }>();
  if (profiles) {
    for (const p of profiles) profileMap.set(p.id, p);
  }
  for (const id of authorIds) {
    if (!profileMap.has(id)) {
      const mockCoach = MOCK_COACHES.find((c) => c.id === id);
      if (mockCoach) {
        profileMap.set(id, { id: mockCoach.id, full_name: mockCoach.name, role: 'coach' });
      }
    }
  }

  return rows.map((r) => ({
    ...r,
    author: profileMap.get(r.author_id) ?? null,
    mentions: [] as { profile_id: string; full_name: string | null }[],
  }));
}

/** Insert a comment on a shot video. Returns the new row with author or null on error. */
export async function insertShotVideoComment(
  supabase: SupabaseClient | null,
  shotVideoId: string,
  authorId: string,
  text: string,
  timestampSeconds: number | null,
  exampleGif: string | null = null
): Promise<ShotVideoCommentWithAuthor | null> {
  if (!supabase) return null;
  const { data: inserted, error } = await supabase
    .from('shot_video_comments')
    .insert({
      shot_video_id: shotVideoId,
      author_id: authorId,
      text,
      timestamp_seconds: timestampSeconds,
      example_gif: exampleGif,
    })
    .select('id, shot_video_id, author_id, text, timestamp_seconds, example_gif, created_at')
    .single();
  if (error || !inserted) return null;
  const row = inserted as ShotVideoCommentRow;
  const authorIds = [row.author_id];
  const validAuthorIds = authorIds.filter((id) => UUID_REGEX.test(id));
  let profiles: { id: string; full_name: string | null; role: string | null }[] | null = null;
  if (validAuthorIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .in('id', validAuthorIds);
    profiles = data as { id: string; full_name: string | null; role: string | null }[];
  }
  const profileMap = new Map<string, { id: string; full_name: string | null; role: string | null }>();
  if (profiles) for (const p of profiles) profileMap.set(p.id, p);
  if (!profileMap.has(row.author_id)) {
    const mockCoach = MOCK_COACHES.find((c) => c.id === row.author_id);
    if (mockCoach) {
      profileMap.set(row.author_id, { id: mockCoach.id, full_name: mockCoach.name, role: 'coach' });
    }
  }
  return {
    ...row,
    author: profileMap.get(row.author_id) ?? null,
    mentions: [],
  };
}

/** Map shot video comment row to SessionComment for UI. */
export function mapShotVideoCommentToSessionComment(
  row: ShotVideoCommentWithAuthor,
  currentUserId: string | null
): SessionComment {
  return mapDbCommentToSessionComment(row as unknown as SessionCommentWithAuthor, currentUserId);
}
