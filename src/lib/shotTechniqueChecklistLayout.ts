import type { SupabaseClient } from '@supabase/supabase-js';

export interface ShotTechniqueChecklistLayoutRow {
  shot_video_id: string;
  sub_category_key: string;
  ordered_item_labels: string[];
  highlighted_item_labels: string[];
  updated_at: string;
}

/** Map sub_category_key -> { order, highlighted labels } */
export type ChecklistLayoutStateMap = Record<
  string,
  { orderedItemLabels: string[]; highlightedItemLabels: string[] }
>;

export function techniqueSubKey(subCategoryId: string | null | undefined): string {
  return subCategoryId && subCategoryId.length > 0 ? subCategoryId : '';
}

function dedupeLabels(labels: string[] | null | undefined): string[] {
  if (!labels?.length) return [];
  return [...new Set(labels)];
}

/**
 * Apply saved order to canonical roadmap items; append any new labels not in saved order.
 */
export function mergeChecklistItemOrder<T extends { label: string }>(
  canonicalItems: T[],
  savedOrder: string[] | undefined
): T[] {
  const byLabel = new Map(canonicalItems.map((i) => [i.label, i]));
  const labels = canonicalItems.map((i) => i.label);
  const seen = new Set<string>();
  const ordered: T[] = [];
  for (const l of savedOrder ?? []) {
    const item = byLabel.get(l);
    if (item && !seen.has(l)) {
      ordered.push(item);
      seen.add(l);
    }
  }
  for (const l of labels) {
    if (!seen.has(l)) {
      const item = byLabel.get(l);
      if (item) ordered.push(item);
    }
  }
  return ordered;
}

export async function fetchShotTechniqueChecklistLayouts(
  supabase: SupabaseClient | null,
  shotVideoId: string
): Promise<ChecklistLayoutStateMap> {
  if (!supabase || !shotVideoId) return {};
  const { data, error } = await supabase
    .from('shot_technique_checklist_layout')
    .select('sub_category_key, ordered_item_labels, highlighted_item_labels')
    .eq('shot_video_id', shotVideoId);
  if (error || !data) return {};
  const result: ChecklistLayoutStateMap = {};
  for (const row of data as Pick<
    ShotTechniqueChecklistLayoutRow,
    'sub_category_key' | 'ordered_item_labels' | 'highlighted_item_labels'
  >[]) {
    const key = row.sub_category_key ?? '';
    const order = Array.isArray(row.ordered_item_labels) ? row.ordered_item_labels : [];
    const highlights = dedupeLabels(
      Array.isArray(row.highlighted_item_labels) ? row.highlighted_item_labels : []
    );
    result[key] = {
      orderedItemLabels: order,
      highlightedItemLabels: highlights,
    };
  }
  return result;
}

export interface UpsertChecklistLayoutParams {
  shotVideoId: string;
  subCategoryKey: string;
  orderedItemLabels: string[];
  highlightedItemLabels: string[];
}

export async function upsertShotTechniqueChecklistLayout(
  supabase: SupabaseClient | null,
  params: UpsertChecklistLayoutParams
): Promise<{ error?: string }> {
  if (!supabase) return { error: 'No database client' };
  const { error } = await supabase.from('shot_technique_checklist_layout').upsert(
    {
      shot_video_id: params.shotVideoId,
      sub_category_key: params.subCategoryKey,
      ordered_item_labels: params.orderedItemLabels,
      highlighted_item_labels: dedupeLabels(params.highlightedItemLabels),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'shot_video_id,sub_category_key' }
  );
  if (error) return { error: error.message };
  return {};
}
