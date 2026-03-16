-- Comments on shot videos (from roadmap). session_comments references sessions(id);
-- shot videos use shot_videos.id, so we store comments here.
create table if not exists public.shot_video_comments (
  id uuid primary key default gen_random_uuid(),
  shot_video_id uuid not null references public.shot_videos(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  timestamp_seconds double precision,
  example_gif text,
  created_at timestamptz not null default now()
);

create index if not exists shot_video_comments_shot_video_id_idx on public.shot_video_comments(shot_video_id);
create index if not exists shot_video_comments_created_at_idx on public.shot_video_comments(created_at);

-- RLS: any authenticated user can read/insert (matches relaxed session_comments access)
alter table public.shot_video_comments enable row level security;

create policy "Authenticated can read shot_video_comments"
  on public.shot_video_comments for select
  to authenticated
  using (true);

create policy "Authenticated can insert shot_video_comments"
  on public.shot_video_comments for insert
  to authenticated
  with check (auth.uid() = author_id);

create policy "Authors can update own shot_video_comments"
  on public.shot_video_comments for update
  to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "Authors can delete own shot_video_comments"
  on public.shot_video_comments for delete
  to authenticated
  using (auth.uid() = author_id);
