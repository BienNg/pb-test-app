-- Replies to shot_video_comments (frame comments, etc.). Mirrors session_comment_replies structure.
create table if not exists public.shot_video_comment_replies (
  id uuid primary key default gen_random_uuid(),
  shot_video_id uuid not null references public.shot_videos(id) on delete cascade,
  parent_comment_id uuid not null references public.shot_video_comments(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  timestamp_seconds double precision,
  example_gif text,
  created_at timestamptz not null default now(),
  marker_x_percent double precision,
  marker_y_percent double precision,
  marker_radius_x integer,
  marker_radius_y integer
);

create index if not exists shot_video_comment_replies_shot_video_id_idx
  on public.shot_video_comment_replies(shot_video_id);
create index if not exists shot_video_comment_replies_parent_comment_id_idx
  on public.shot_video_comment_replies(parent_comment_id);
create index if not exists shot_video_comment_replies_created_at_idx
  on public.shot_video_comment_replies(created_at);

-- RLS: same pattern as shot_video_comments (authenticated read/insert, authors update/delete)
alter table public.shot_video_comment_replies enable row level security;

create policy "Authenticated can read shot_video_comment_replies"
  on public.shot_video_comment_replies for select
  to authenticated
  using (true);

create policy "Authenticated can insert shot_video_comment_replies"
  on public.shot_video_comment_replies for insert
  to authenticated
  with check (auth.uid() = author_id);

create policy "Authors can update own shot_video_comment_replies"
  on public.shot_video_comment_replies for update
  to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "Authors can delete own shot_video_comment_replies"
  on public.shot_video_comment_replies for delete
  to authenticated
  using (auth.uid() = author_id);
