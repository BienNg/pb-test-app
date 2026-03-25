import type { SupabaseClient } from '@supabase/supabase-js';
import type { SessionCommentWithAuthor } from '@/lib/sessionComments';
import {
  mapDbCommentToSessionComment,
  mapDbReplyToSessionCommentReply,
  type ReplyFrameMarker,
} from '@/lib/sessionComments';
import type { SessionComment } from '@/components/GameAnalyticsPage';
import type { SessionCommentReply } from '@/components/GameAnalyticsPage';
import { MOCK_COACHES } from '@/data/mockCoaches';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ShotVideoCommentRow = {
  id: string;
  shot_video_id: string;
  author_id: string;
  text: string;
  timestamp_seconds: number | null;
  loop_end_timestamp_seconds: number | null;
  example_gif: string | null;
  text_box_x_percent: number | null;
  text_box_y_percent: number | null;
  text_box_width_percent: number | null;
  text_box_height_percent: number | null;
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
    .select('id, shot_video_id, author_id, text, timestamp_seconds, loop_end_timestamp_seconds, example_gif, text_box_x_percent, text_box_y_percent, text_box_width_percent, text_box_height_percent, created_at')
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
    .select('id, shot_video_id, author_id, text, timestamp_seconds, loop_end_timestamp_seconds, example_gif, text_box_x_percent, text_box_y_percent, text_box_width_percent, text_box_height_percent, created_at')
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

// --- Shot video comment replies (mirror session_comment_replies) ---

export type ShotVideoCommentReplyRow = {
  id: string;
  shot_video_id: string;
  parent_comment_id: string;
  author_id: string;
  text: string;
  timestamp_seconds: number | null;
  example_gif: string | null;
  created_at: string;
  marker_x_percent: number | null;
  marker_y_percent: number | null;
  marker_radius_x: number | null;
  marker_radius_y: number | null;
  marker_text_box_x_percent: number | null;
  marker_text_box_y_percent: number | null;
  marker_text_box_width_percent: number | null;
  marker_text_box_height_percent: number | null;
};

export type ShotVideoCommentReplyWithAuthor = ShotVideoCommentReplyRow & {
  author?: { id: string; full_name: string | null; role: string | null } | null;
};

/** Fetch all replies for a shot video's comments. Returns [] on error. */
export async function fetchShotVideoCommentReplies(
  supabase: SupabaseClient | null,
  shotVideoId: string,
  currentUserId: string | null
): Promise<SessionCommentReply[]> {
  if (!supabase) return [];
  const { data: replies, error } = await supabase
    .from('shot_video_comment_replies')
    .select(
      'id, shot_video_id, parent_comment_id, author_id, text, timestamp_seconds, example_gif, created_at, marker_x_percent, marker_y_percent, marker_radius_x, marker_radius_y, marker_text_box_x_percent, marker_text_box_y_percent, marker_text_box_width_percent, marker_text_box_height_percent'
    )
    .eq('shot_video_id', shotVideoId)
    .order('created_at', { ascending: true });
  if (error || !replies) return [];
  const rows = replies as ShotVideoCommentReplyRow[];
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
  if (profiles) for (const p of profiles) profileMap.set(p.id, p);
  for (const id of authorIds) {
    if (!profileMap.has(id)) {
      const mockCoach = MOCK_COACHES.find((c) => c.id === id);
      if (mockCoach) {
        profileMap.set(id, { id: mockCoach.id, full_name: mockCoach.name, role: 'coach' });
      }
    }
  }

  return rows.map((r) => {
    const withAuthor: ShotVideoCommentReplyWithAuthor = {
      ...r,
      author: profileMap.get(r.author_id) ?? null,
    };
    return mapDbReplyToSessionCommentReply(
      { ...withAuthor, session_id: withAuthor.shot_video_id } as Parameters<typeof mapDbReplyToSessionCommentReply>[0],
      currentUserId
    );
  });
}

/** Insert a reply to a shot video comment. Returns the new reply as SessionCommentReply or null on error. */
export async function insertShotVideoCommentReply(
  supabase: SupabaseClient | null,
  shotVideoId: string,
  parentCommentId: string,
  authorId: string,
  text: string,
  timestampSeconds: number | null,
  marker?: ReplyFrameMarker | null
): Promise<SessionCommentReply | null> {
  if (!supabase) return null;
  const insertPayload: Record<string, unknown> = {
    shot_video_id: shotVideoId,
    parent_comment_id: parentCommentId,
    author_id: authorId,
    text,
    timestamp_seconds: timestampSeconds,
  };
  if (marker != null) {
    insertPayload.marker_x_percent = marker.markerXPercent;
    insertPayload.marker_y_percent = marker.markerYPercent;
    insertPayload.marker_radius_x = marker.markerRadiusX;
    insertPayload.marker_radius_y = marker.markerRadiusY;
    insertPayload.marker_text_box_x_percent = marker.markerTextBoxXPercent ?? null;
    insertPayload.marker_text_box_y_percent = marker.markerTextBoxYPercent ?? null;
    insertPayload.marker_text_box_width_percent = marker.markerTextBoxWidthPercent ?? null;
    insertPayload.marker_text_box_height_percent = marker.markerTextBoxHeightPercent ?? null;
  }
  const { data: inserted, error } = await supabase
    .from('shot_video_comment_replies')
    .insert(insertPayload)
    .select(
      'id, shot_video_id, parent_comment_id, author_id, text, timestamp_seconds, example_gif, created_at, marker_x_percent, marker_y_percent, marker_radius_x, marker_radius_y, marker_text_box_x_percent, marker_text_box_y_percent, marker_text_box_width_percent, marker_text_box_height_percent'
    )
    .single();
  if (error || !inserted) return null;
  const row = inserted as ShotVideoCommentReplyRow;
  const authorIds = [row.author_id];
  const validAuthorIds = authorIds.filter((id) => UUID_REGEX.test(id));
  let profiles: { id: string; full_name: string | null; role: string | null }[] | null = null;
  if (validAuthorIds.length > 0) {
    const { data } = await supabase.from('profiles').select('id, full_name, role').in('id', validAuthorIds);
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
  const withAuthor: ShotVideoCommentReplyWithAuthor = {
    ...row,
    author: profileMap.get(row.author_id) ?? null,
  };
  return mapDbReplyToSessionCommentReply(
    { ...withAuthor, session_id: withAuthor.shot_video_id } as Parameters<typeof mapDbReplyToSessionCommentReply>[0],
    authorId
  );
}

/** Update a shot video comment's text. Returns true on success. */
export async function updateShotVideoComment(
  supabase: SupabaseClient | null,
  commentId: string,
  text: string,
  textBoxLayout?: { x: number; y: number; width: number; height: number } | null
): Promise<boolean> {
  if (!supabase) return false;
  const updatePayload: Record<string, unknown> = { text };
  if (textBoxLayout != null) {
    updatePayload.text_box_x_percent = textBoxLayout.x;
    updatePayload.text_box_y_percent = textBoxLayout.y;
    updatePayload.text_box_width_percent = textBoxLayout.width;
    updatePayload.text_box_height_percent = textBoxLayout.height;
  }
  const { error } = await supabase
    .from('shot_video_comments')
    .update(updatePayload)
    .eq('id', commentId);
  return !error;
}

/** Update a shot video comment's loop end timestamp. Returns true on success. */
export async function updateShotVideoCommentLoopEnd(
  supabase: SupabaseClient | null,
  commentId: string,
  loopEndTimestampSeconds: number
): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from('shot_video_comments')
    .update({ loop_end_timestamp_seconds: loopEndTimestampSeconds })
    .eq('id', commentId);
  return !error;
}

/** Update a shot video comment reply (text and optional frame marker). Returns true on success. */
export async function updateShotVideoCommentReply(
  supabase: SupabaseClient | null,
  replyId: string,
  text: string,
  marker?: ReplyFrameMarker | null
): Promise<boolean> {
  if (!supabase) return false;
  const updatePayload: Record<string, unknown> = { text };
  if (marker != null) {
    updatePayload.marker_x_percent = marker.markerXPercent;
    updatePayload.marker_y_percent = marker.markerYPercent;
    updatePayload.marker_radius_x = marker.markerRadiusX;
    updatePayload.marker_radius_y = marker.markerRadiusY;
    updatePayload.marker_text_box_x_percent = marker.markerTextBoxXPercent ?? null;
    updatePayload.marker_text_box_y_percent = marker.markerTextBoxYPercent ?? null;
    updatePayload.marker_text_box_width_percent = marker.markerTextBoxWidthPercent ?? null;
    updatePayload.marker_text_box_height_percent = marker.markerTextBoxHeightPercent ?? null;
  }
  const { error } = await supabase
    .from('shot_video_comment_replies')
    .update(updatePayload)
    .eq('id', replyId);
  return !error;
}

/** Delete a shot video comment reply. Returns true on success. */
export async function deleteShotVideoCommentReply(
  supabase: SupabaseClient | null,
  replyId: string
): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('shot_video_comment_replies').delete().eq('id', replyId);
  return !error;
}

/** Delete a shot video comment. Returns true on success. */
export async function deleteShotVideoComment(
  supabase: SupabaseClient | null,
  commentId: string
): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('shot_video_comments').delete().eq('id', commentId);
  return !error;
}
