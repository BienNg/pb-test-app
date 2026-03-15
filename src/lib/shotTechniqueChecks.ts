import type { SupabaseClient } from '@supabase/supabase-js';

export interface ShotTechniqueCheckRow {
  id: string;
  shot_video_id: string;
  sub_category_id: string | null;
  item_label: string;
  checked: boolean;
  updated_at: string;
}

/**
 * Build the local state key for a technique item.
 * Matches the key format used in TrainingSessionDetail: "subId:label" or "label".
 */
export function buildTechniqueKey(subCategoryId: string | null, itemLabel: string): string {
  return subCategoryId ? `${subCategoryId}:${itemLabel}` : itemLabel;
}

/**
 * Fetch all technique checks for a shot video and return them as a
 * Record<string, boolean> keyed by "subCategoryId:itemLabel" (or "itemLabel" when no sub).
 */
export async function fetchShotTechniqueChecks(
  supabase: SupabaseClient | null,
  shotVideoId: string
): Promise<Record<string, boolean>> {
  if (!supabase || !shotVideoId) return {};
  const { data, error } = await supabase
    .from('shot_technique_checks')
    .select('sub_category_id, item_label, checked')
    .eq('shot_video_id', shotVideoId);
  if (error) return {};
  const result: Record<string, boolean> = {};
  for (const row of (data ?? []) as Pick<ShotTechniqueCheckRow, 'sub_category_id' | 'item_label' | 'checked'>[]) {
    result[buildTechniqueKey(row.sub_category_id, row.item_label)] = row.checked;
  }
  return result;
}

export interface UpsertTechniqueCheckParams {
  shotVideoId: string;
  subCategoryId: string | null;
  itemLabel: string;
  checked: boolean;
}

/**
 * Upsert a single technique check for a shot video.
 * Uses ON CONFLICT on (shot_video_id, sub_category_id, item_label) to update.
 */
export async function upsertShotTechniqueCheck(
  supabase: SupabaseClient | null,
  params: UpsertTechniqueCheckParams
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'No database client' };
  const { error } = await supabase
    .from('shot_technique_checks')
    .upsert(
      {
        shot_video_id: params.shotVideoId,
        sub_category_id: params.subCategoryId ?? null,
        item_label: params.itemLabel,
        checked: params.checked,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'shot_video_id,sub_category_id,item_label' }
    );
  if (error) return { error: error.message };
  return {};
}
