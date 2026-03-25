import type { SupabaseClient } from '@supabase/supabase-js';
import type { SessionComment, SessionCommentReply } from '@/components/GameAnalyticsPage';
import { MOCK_COACHES } from '@/data/mockCoaches';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SessionCommentRow = {
  id: string;
  session_id: string;
  author_id: string;
  text: string;
  timestamp_seconds: number | null;
  loop_end_timestamp_seconds: number | null;
  example_gif: string | null;
  created_at: string;
};

export type SessionCommentReplyRow = {
  id: string;
  session_id: string;
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

export type SessionCommentWithAuthor = SessionCommentRow & {
  author?: { id: string; full_name: string | null; role: string | null } | null;
  mentions?: { profile_id: string; full_name: string | null }[];
};

export type SessionCommentReplyWithAuthor = SessionCommentReplyRow & {
  author?: { id: string; full_name: string | null; role: string | null } | null;
};

/** Format created_at to relative time for display */
function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (sec < 60) return 'Just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  if (sec < 2592000) return `${Math.floor(sec / 604800)}w ago`;
  return d.toLocaleDateString();
}

/** Map DB row + author + mentions to SessionComment (id as string for DB comments) */
export function mapDbCommentToSessionComment(
  row: SessionCommentWithAuthor,
  currentUserId: string | null
): SessionComment {
  const authorName = row.author?.full_name?.trim() || 'Unknown';
  const role = row.author?.role === 'coach' ? 'Coach' : currentUserId === row.author_id ? 'You' : (row.author?.role ?? 'Student');
  const displayRole = role === 'Coach' ? 'Coach' : role === 'You' ? 'You' : role;
  return {
    id: row.id,
    author: authorName,
    role: displayRole as 'Coach' | 'You',
    createdAt: formatRelativeTime(row.created_at),
    createdAtIso: row.created_at,
    text: row.text,
    timestampSeconds: row.timestamp_seconds ?? undefined,
    loopEndTimestampSeconds: row.loop_end_timestamp_seconds ?? undefined,
    exampleGif: row.example_gif ?? undefined,
    taggedUsers: (row.mentions ?? []).map((m) => ({
      id: m.profile_id,
      name: m.full_name?.trim() || 'Unknown',
    })),
  };
}

/** Map DB reply row + author to SessionCommentReply (id + parentCommentId). */
export function mapDbReplyToSessionCommentReply(
  row: SessionCommentReplyWithAuthor,
  currentUserId: string | null
): SessionCommentReply {
  const authorName = row.author?.full_name?.trim() || 'Unknown';
  const role = row.author?.role === 'coach' ? 'Coach' : currentUserId === row.author_id ? 'You' : (row.author?.role ?? 'Student');
  const displayRole = role === 'Coach' ? 'Coach' : role === 'You' ? 'You' : role;
  return {
    id: row.id,
    parentCommentId: row.parent_comment_id,
    author: authorName,
    role: displayRole as 'Coach' | 'You',
    createdAt: formatRelativeTime(row.created_at),
    createdAtIso: row.created_at,
    text: row.text,
    timestampSeconds: row.timestamp_seconds ?? undefined,
    exampleGif: row.example_gif ?? undefined,
    markerXPercent: row.marker_x_percent ?? undefined,
    markerYPercent: row.marker_y_percent ?? undefined,
    markerRadiusX: row.marker_radius_x ?? undefined,
    markerRadiusY: row.marker_radius_y ?? undefined,
    markerTextBoxXPercent: row.marker_text_box_x_percent ?? undefined,
    markerTextBoxYPercent: row.marker_text_box_y_percent ?? undefined,
    markerTextBoxWidthPercent: row.marker_text_box_width_percent ?? undefined,
    markerTextBoxHeightPercent: row.marker_text_box_height_percent ?? undefined,
  };
}

/** Fetch all comments for a session (with author and mentions). Returns [] on error. */
export async function fetchSessionComments(
  supabase: SupabaseClient | null,
  sessionId: string
): Promise<SessionCommentWithAuthor[]> {
  if (!supabase) return [];
  const { data: comments, error: commentsError } = await supabase
    .from('session_comments')
    .select(`
      id,
      session_id,
      author_id,
      text,
      timestamp_seconds,
      loop_end_timestamp_seconds,
      example_gif,
      created_at
    `)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  if (commentsError || !comments) return [];
  const rows = comments as SessionCommentRow[];
  if (rows.length === 0) return [];

  const authorIds = [...new Set(rows.map((r) => r.author_id))];
  const validAuthorIds = authorIds.filter(id => UUID_REGEX.test(id));
  
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
  // Add mock coaches to profileMap
  for (const id of authorIds) {
    if (!profileMap.has(id)) {
      const mockCoach = MOCK_COACHES.find(c => c.id === id);
      if (mockCoach) {
        profileMap.set(id, { id: mockCoach.id, full_name: mockCoach.name, role: 'coach' });
      }
    }
  }

  const { data: mentions } = await supabase
    .from('session_comment_mentions')
    .select('comment_id, profile_id')
    .in('comment_id', rows.map((r) => r.id));
  const mentionCommentIds = (mentions as { comment_id: string; profile_id: string }[] | null) ?? [];
  const mentionedProfileIds = [...new Set(mentionCommentIds.map((m) => m.profile_id))];
  const validMentionedProfileIds = mentionedProfileIds.filter(id => UUID_REGEX.test(id));
  
  let mentionProfiles: { id: string; full_name: string | null }[] | null = null;
  if (validMentionedProfileIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', validMentionedProfileIds);
    mentionProfiles = data as { id: string; full_name: string | null }[];
  }
  
  const mentionProfileMap = new Map<string, { id: string; full_name: string | null }>();
  if (mentionProfiles) {
    for (const p of mentionProfiles) mentionProfileMap.set(p.id, p);
  }
  for (const id of mentionedProfileIds) {
    if (!mentionProfileMap.has(id)) {
      const mockCoach = MOCK_COACHES.find(c => c.id === id);
      if (mockCoach) {
        mentionProfileMap.set(id, { id: mockCoach.id, full_name: mockCoach.name });
      }
    }
  }

  const mentionsByComment = new Map<string, { profile_id: string; full_name: string | null }[]>();
  for (const m of mentionCommentIds) {
    const list = mentionsByComment.get(m.comment_id) ?? [];
    list.push({
      profile_id: m.profile_id,
      full_name: mentionProfileMap.get(m.profile_id)?.full_name ?? null,
    });
    mentionsByComment.set(m.comment_id, list);
  }

  return rows.map((r) => ({
    ...r,
    author: profileMap.get(r.author_id) ?? null,
    mentions: mentionsByComment.get(r.id) ?? [],
  }));
}

/** Fetch all replies (subcomments) for a session. Returns [] on error. */
export async function fetchSessionCommentReplies(
  supabase: SupabaseClient | null,
  sessionId: string
): Promise<SessionCommentReplyWithAuthor[]> {
  if (!supabase) return [];
  const { data: replies, error } = await supabase
    .from('session_comment_replies')
    .select(`
      id,
      session_id,
      parent_comment_id,
      author_id,
      text,
      timestamp_seconds,
      example_gif,
      created_at,
      marker_x_percent,
      marker_y_percent,
      marker_radius_x,
      marker_radius_y,
      marker_text_box_x_percent,
      marker_text_box_y_percent,
      marker_text_box_width_percent,
      marker_text_box_height_percent
    `)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  if (error || !replies) return [];
  const rows = replies as SessionCommentReplyRow[];
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
  }));
}

/** Insert a comment and optional mentions. Returns the new comment row or null on error. */
export async function insertSessionComment(
  supabase: SupabaseClient | null,
  sessionId: string,
  authorId: string,
  text: string,
  timestampSeconds: number | null,
  mentionedProfileIds: string[] = [],
  exampleGif: string | null = null
): Promise<SessionCommentWithAuthor | null> {
  if (!supabase) return null;
  const { data: inserted, error: insertError } = await supabase
    .from('session_comments')
    .insert({
      session_id: sessionId,
      author_id: authorId,
      text,
      timestamp_seconds: timestampSeconds,
      example_gif: exampleGif,
    })
    .select('id, session_id, author_id, text, timestamp_seconds, example_gif, created_at')
    .single();
  if (insertError || !inserted) return null;
  const row = inserted as SessionCommentRow;
  if (mentionedProfileIds.length > 0) {
    await supabase.from('session_comment_mentions').insert(
      mentionedProfileIds.map((profile_id) => ({
        comment_id: row.id,
        profile_id,
      }))
    );
  }
  const authorIds = [row.author_id, ...mentionedProfileIds];
  const validAuthorIds = authorIds.filter(id => UUID_REGEX.test(id));
  
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
      const mockCoach = MOCK_COACHES.find(c => c.id === id);
      if (mockCoach) {
        profileMap.set(id, { id: mockCoach.id, full_name: mockCoach.name, role: 'coach' });
      }
    }
  }

  const mentions = mentionedProfileIds
    .filter((id) => id !== row.author_id)
    .map((profile_id) => ({
      profile_id,
      full_name: profileMap.get(profile_id)?.full_name ?? null,
    }));
  return {
    ...row,
    author: profileMap.get(row.author_id) ?? null,
    mentions,
  };
}

/** Frame marker data for a reply (position and size of the ellipse on the video). */
export type ReplyFrameMarker = {
  markerXPercent: number;
  markerYPercent: number;
  markerRadiusX: number;
  markerRadiusY: number;
  markerTextBoxXPercent?: number;
  markerTextBoxYPercent?: number;
  markerTextBoxWidthPercent?: number;
  markerTextBoxHeightPercent?: number;
};

/** Insert a reply (subcomment) for a comment. Returns the new reply row or null on error. */
export async function insertSessionCommentReply(
  supabase: SupabaseClient | null,
  sessionId: string,
  parentCommentId: string,
  authorId: string,
  text: string,
  timestampSeconds: number | null,
  marker?: ReplyFrameMarker | null
): Promise<SessionCommentReplyWithAuthor | null> {
  if (!supabase) return null;
  const insertPayload: Record<string, unknown> = {
    session_id: sessionId,
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
  const selectCols = 'id, session_id, parent_comment_id, author_id, text, timestamp_seconds, example_gif, created_at, marker_x_percent, marker_y_percent, marker_radius_x, marker_radius_y, marker_text_box_x_percent, marker_text_box_y_percent, marker_text_box_width_percent, marker_text_box_height_percent';
  const { data: inserted, error } = await supabase
    .from('session_comment_replies')
    .insert(insertPayload)
    .select(selectCols)
    .single();
  if (error || !inserted) return null;

  const row = inserted as SessionCommentReplyRow;

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

  return {
    ...row,
    author: profileMap.get(row.author_id) ?? null,
  };
}

/** Update a reply (subcomment) text and optional frame marker. Returns true on success. */
export async function updateSessionCommentReply(
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
    .from('session_comment_replies')
    .update(updatePayload)
    .eq('id', replyId);
  return !error;
}

/** Delete a reply (subcomment). Returns true on success. */
export async function deleteSessionCommentReply(
  supabase: SupabaseClient | null,
  replyId: string
): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from('session_comment_replies')
    .delete()
    .eq('id', replyId);
  return !error;
}

/** Update the example GIF attached to a comment. Returns true on success. */
export async function updateCommentExampleGif(
  supabase: SupabaseClient | null,
  commentId: string,
  exampleGif: string | null
): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from('session_comments')
    .update({ example_gif: exampleGif })
    .eq('id', commentId);
  return !error;
}

/** Update a comment text. Returns true on success. */
export async function updateSessionComment(
  supabase: SupabaseClient | null,
  commentId: string,
  text: string
): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from('session_comments')
    .update({ text })
    .eq('id', commentId);
  return !error;
}

/** Update a comment's loop end timestamp. Returns true on success. */
export async function updateSessionCommentLoopEnd(
  supabase: SupabaseClient | null,
  commentId: string,
  loopEndTimestampSeconds: number
): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from('session_comments')
    .update({ loop_end_timestamp_seconds: loopEndTimestampSeconds })
    .eq('id', commentId);
  return !error;
}

/** Delete a comment. Returns true on success. */
export async function deleteSessionComment(
  supabase: SupabaseClient | null,
  commentId: string
): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from('session_comments')
    .delete()
    .eq('id', commentId);
  return !error;
}

/** Fetch profiles that can be tagged in a session (students in session + coach). */
export async function fetchSessionTaggableProfiles(
  supabase: SupabaseClient | null,
  sessionId: string
): Promise<{ id: string; name: string }[]> {
  if (!supabase) return [];
  const { data: sessionRow, error: sessionError } = await supabase
    .from('sessions')
    .select('coach_id')
    .eq('id', sessionId)
    .single();
  if (sessionError || !sessionRow) return [];
  const { data: studentLinks } = await supabase
    .from('session_students')
    .select('student_id')
    .eq('session_id', sessionId);
  const studentIds = (studentLinks as { student_id: string }[] | null)?.map((r) => r.student_id) ?? [];
  const coachId = (sessionRow as { coach_id: string }).coach_id;
  const ids = [...new Set([coachId, ...studentIds])].filter(Boolean);
  if (ids.length === 0) return [];
  
  const validIds = ids.filter(id => UUID_REGEX.test(id));
  
  let profiles: { id: string; full_name: string | null }[] | null = null;
  if (validIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', validIds);
    profiles = data as { id: string; full_name: string | null; role: string | null }[];
  }
  
  const results = (profiles ?? []).map((p) => ({
    id: p.id,
    name: p.full_name?.trim() || 'Unknown',
  }));
  
  for (const id of ids) {
    if (!validIds.includes(id)) {
      const mockCoach = MOCK_COACHES.find(c => c.id === id);
      if (mockCoach) {
        results.push({ id: mockCoach.id, name: mockCoach.name });
      }
    }
  }
  
  return results;
}
