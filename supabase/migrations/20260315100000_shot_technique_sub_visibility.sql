-- Per shot video: which technique sub-categories are visible to the student.
-- When no row exists or visible_sub_category_ids is empty, app defaults to "first sub only".
-- Admin can show/hide sub-categories; at least one must remain visible (enforced in app).
create table if not exists public.shot_video_technique_visibility (
  shot_video_id uuid primary key references public.shot_videos(id) on delete cascade,
  visible_sub_category_ids text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create index if not exists shot_video_technique_visibility_shot_video_id_idx
  on public.shot_video_technique_visibility(shot_video_id);

alter table public.shot_video_technique_visibility enable row level security;

create policy "Authenticated can read shot_video_technique_visibility"
  on public.shot_video_technique_visibility for select
  to authenticated
  using (true);

create policy "Authenticated can insert shot_video_technique_visibility"
  on public.shot_video_technique_visibility for insert
  to authenticated
  with check (true);

create policy "Authenticated can update shot_video_technique_visibility"
  on public.shot_video_technique_visibility for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated can delete shot_video_technique_visibility"
  on public.shot_video_technique_visibility for delete
  to authenticated
  using (true);
