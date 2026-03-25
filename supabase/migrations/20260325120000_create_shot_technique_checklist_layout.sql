-- Per shot video + technique sub-category: custom checklist item order and highlighted items (coach focus).
-- sub_category_key is '' for shots without sub-categories; otherwise the sub id (e.g. forehand-dink-normal).
create table if not exists public.shot_technique_checklist_layout (
  shot_video_id uuid not null references public.shot_videos(id) on delete cascade,
  sub_category_key text not null default '',
  ordered_item_labels text[] not null default '{}',
  highlighted_item_labels text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (shot_video_id, sub_category_key)
);

create index if not exists shot_technique_checklist_layout_shot_video_id_idx
  on public.shot_technique_checklist_layout(shot_video_id);

alter table public.shot_technique_checklist_layout enable row level security;

create policy "Authenticated can read shot_technique_checklist_layout"
  on public.shot_technique_checklist_layout for select
  to authenticated
  using (true);

create policy "Authenticated can insert shot_technique_checklist_layout"
  on public.shot_technique_checklist_layout for insert
  to authenticated
  with check (true);

create policy "Authenticated can update shot_technique_checklist_layout"
  on public.shot_technique_checklist_layout for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated can delete shot_technique_checklist_layout"
  on public.shot_technique_checklist_layout for delete
  to authenticated
  using (true);
