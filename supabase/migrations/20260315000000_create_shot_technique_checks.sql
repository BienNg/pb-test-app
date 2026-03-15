-- Shot technique checks: tracks which technique checklist items an admin has checked
-- for a specific shot video session. Keyed by shot_video_id + sub_category_id + item_label.
create table if not exists public.shot_technique_checks (
  id uuid primary key default gen_random_uuid(),
  shot_video_id uuid not null references public.shot_videos(id) on delete cascade,
  -- null for shots without sub-categories (e.g. Serve), populated for shots like Forehand Dink
  sub_category_id text,
  item_label text not null,
  checked boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (shot_video_id, sub_category_id, item_label)
);

create index if not exists shot_technique_checks_shot_video_id_idx
  on public.shot_technique_checks(shot_video_id);

-- RLS
alter table public.shot_technique_checks enable row level security;

-- Authenticated users can read all checks (coaches/admins view students)
create policy "Authenticated can read shot_technique_checks"
  on public.shot_technique_checks for select
  to authenticated
  using (true);

-- Authenticated users can insert checks
create policy "Authenticated can insert shot_technique_checks"
  on public.shot_technique_checks for insert
  to authenticated
  with check (true);

-- Authenticated users can update checks
create policy "Authenticated can update shot_technique_checks"
  on public.shot_technique_checks for update
  to authenticated
  using (true)
  with check (true);

-- Authenticated users can delete checks
create policy "Authenticated can delete shot_technique_checks"
  on public.shot_technique_checks for delete
  to authenticated
  using (true);
