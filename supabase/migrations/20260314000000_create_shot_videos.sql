-- Shot videos: videos added per student per shot (e.g. from ShotDetailView "Add video")
-- Stores: video URL, student, shot (id + title), and date added
create table if not exists public.shot_videos (
  id uuid primary key default gen_random_uuid(),
  video_url text not null,
  student_id uuid not null references public.profiles(id) on delete cascade,
  shot_id text not null,
  shot_title text not null,
  created_at timestamptz not null default now()
);

create index if not exists shot_videos_student_id_idx on public.shot_videos(student_id);
create index if not exists shot_videos_shot_id_idx on public.shot_videos(shot_id);
create index if not exists shot_videos_created_at_idx on public.shot_videos(created_at);

-- RLS
alter table public.shot_videos enable row level security;

-- Authenticated users can read all shot videos (coaches/admins view students; students view own)
create policy "Authenticated can read shot_videos"
  on public.shot_videos for select
  to authenticated
  using (true);

-- Authenticated users can insert (coach/admin adding a video for a student)
create policy "Authenticated can insert shot_videos"
  on public.shot_videos for insert
  to authenticated
  with check (true);
