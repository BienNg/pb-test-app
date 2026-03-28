-- Per-student list of focused roadmap skill/shot IDs (set by admin/coach).
-- One row per student; shot_ids is a text array of ROADMAP_SKILLS id values.
create table if not exists public.student_focused_skills (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  shot_ids text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.student_focused_skills enable row level security;

create policy "Authenticated can read student_focused_skills"
  on public.student_focused_skills for select
  to authenticated
  using (true);

create policy "Authenticated can insert student_focused_skills"
  on public.student_focused_skills for insert
  to authenticated
  with check (true);

create policy "Authenticated can update student_focused_skills"
  on public.student_focused_skills for update
  to authenticated
  using (true)
  with check (true);
