import type { SupabaseClient } from '@supabase/supabase-js';

export interface ShotTechniqueSubVisibilityRow {
  shot_video_id: string;
  visible_sub_category_ids: string[];
  updated_at: string;
}

/**
 * Fetch visible sub-category IDs for a shot video.
 * Returns empty array when no row exists (caller should treat as "use default: first sub only").
 */
export async function fetchShotTechniqueSubVisibility(
  supabase: SupabaseClient | null,
  shotVideoId: string
): Promise<string[]> {
  if (!supabase || !shotVideoId) return [];
  const { data, error } = await supabase
    .from('shot_video_technique_visibility')
    .select('visible_sub_category_ids')
    .eq('shot_video_id', shotVideoId)
    .maybeSingle();
  if (error || !data) return [];
  const ids = (data as { visible_sub_category_ids: string[] }).visible_sub_category_ids;
  return Array.isArray(ids) ? ids : [];
}

/**
 * Update which sub-categories are visible to the student.
 * visibleSubCategoryIds must contain at least one ID (enforced by caller).
 */
export async function upsertShotTechniqueSubVisibility(
  supabase: SupabaseClient | null,
  shotVideoId: string,
  visibleSubCategoryIds: string[]
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'No database client' };
  if (visibleSubCategoryIds.length === 0) return { error: 'At least one sub-category must be visible' };
  const { error } = await supabase
    .from('shot_video_technique_visibility')
    .upsert(
      {
        shot_video_id: shotVideoId,
        visible_sub_category_ids: visibleSubCategoryIds,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'shot_video_id' }
    );
  if (error) return { error: error.message };
  return {};
}
