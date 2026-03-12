-- Replies to session comments, stored as subcomments.
-- Each reply has the same core fields as session_comments plus a parent comment reference.
create table if not exists public.session_comment_replies (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  parent_comment_id uuid not null references public.session_comments(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  timestamp_seconds integer,
  example_gif text,
  created_at timestamptz not null default now()
);

create index if not exists session_comment_replies_session_id_idx
  on public.session_comment_replies(session_id);

create index if not exists session_comment_replies_parent_comment_id_idx
  on public.session_comment_replies(parent_comment_id);

create index if not exists session_comment_replies_created_at_idx
  on public.session_comment_replies(created_at);

-- RLS
alter table public.session_comment_replies enable row level security;

-- Read replies when the user can access comments for the session.
create policy "Users can read session comment replies for accessible sessions"
  on public.session_comment_replies for select
  to authenticated
  using (public.can_access_session_comments(session_id));

-- Insert replies when the user can access the session and is the author.
create policy "Users can insert session comment replies for accessible sessions"
  on public.session_comment_replies for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and public.can_access_session_comments(session_id)
  );

-- Update/delete only by the reply author.
create policy "Authors can update own session comment replies"
  on public.session_comment_replies for update
  to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "Authors can delete own session comment replies"
  on public.session_comment_replies for delete
  to authenticated
  using (auth.uid() = author_id);

