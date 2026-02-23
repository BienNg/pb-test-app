-- Session comments: one row per comment on a session (text, optional video timestamp, author, created_at)
create table if not exists public.session_comments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  timestamp_seconds integer,
  created_at timestamptz not null default now()
);

-- Who is @mentioned in a comment (tagged users)
create table if not exists public.session_comment_mentions (
  comment_id uuid not null references public.session_comments(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  primary key (comment_id, profile_id)
);

create index if not exists session_comments_session_id_idx on public.session_comments(session_id);
create index if not exists session_comments_created_at_idx on public.session_comments(created_at);
create index if not exists session_comment_mentions_comment_id_idx on public.session_comment_mentions(comment_id);

-- RLS
alter table public.session_comments enable row level security;
alter table public.session_comment_mentions enable row level security;

-- Helper: true if the user can see comments for this session (coach of session or student in session)
create or replace function public.can_access_session_comments(sid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.sessions s where s.id = sid and s.coach_id = auth.uid()::text
  ) or exists (
    select 1 from public.session_students ss where ss.session_id = sid and ss.student_id = auth.uid()
  );
$$;

-- Comments: read if user can access the session
create policy "Users can read session comments for accessible sessions"
  on public.session_comments for select
  to authenticated
  using (public.can_access_session_comments(session_id));

-- Comments: insert if user can access the session (participant or coach can comment)
create policy "Users can insert session comments for accessible sessions"
  on public.session_comments for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and public.can_access_session_comments(session_id)
  );

-- Comments: update/delete only author
create policy "Authors can update own session comments"
  on public.session_comments for update
  to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "Authors can delete own session comments"
  on public.session_comments for delete
  to authenticated
  using (auth.uid() = author_id);

-- Mentions: read with comment
create policy "Users can read session comment mentions"
  on public.session_comment_mentions for select
  to authenticated
  using (
    exists (
      select 1 from public.session_comments c
      where c.id = comment_id and public.can_access_session_comments(c.session_id)
    )
  );

-- Mentions: insert when inserting a comment (author only, and comment must be theirs)
create policy "Users can insert mentions for own comments"
  on public.session_comment_mentions for insert
  to authenticated
  with check (
    exists (
      select 1 from public.session_comments c
      where c.id = comment_id and c.author_id = auth.uid()
    )
  );

-- Mentions: delete when deleting the comment (handled by cascade) or when editing; allow author to delete
create policy "Users can delete mentions for own comments"
  on public.session_comment_mentions for delete
  to authenticated
  using (
    exists (
      select 1 from public.session_comments c
      where c.id = comment_id and c.author_id = auth.uid()
    )
  );
