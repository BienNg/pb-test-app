import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Fetch the focused shot/skill IDs for a student.
 * Returns an empty array if none are stored yet.
 */
export async function fetchFocusedSkillIds(
  supabase: SupabaseClient | null,
  studentId: string
): Promise<string[]> {
  if (!supabase || !studentId) return [];
  const { data, error } = await supabase
    .from('student_focused_skills')
    .select('shot_ids')
    .eq('student_id', studentId)
    .maybeSingle();
  if (error || !data) return [];
  return (data as { shot_ids: string[] }).shot_ids ?? [];
}

/**
 * Upsert the full set of focused shot/skill IDs for a student.
 * Replaces the previous list atomically.
 */
export async function upsertFocusedSkillIds(
  supabase: SupabaseClient | null,
  studentId: string,
  shotIds: string[]
): Promise<void> {
  if (!supabase || !studentId) return;
  await supabase
    .from('student_focused_skills')
    .upsert(
      { student_id: studentId, shot_ids: shotIds, updated_at: new Date().toISOString() },
      { onConflict: 'student_id' }
    );
}
