-- Add optional title to sessions so admins can label sessions (e.g. "Serve clinic")
alter table if exists public.sessions
  add column if not exists title text;

-- Allow authenticated users to update sessions and session_students
-- (this matches the existing insert/select policies; tighten later if needed)
drop policy if exists "Authenticated can update sessions" on public.sessions;
create policy "Authenticated can update sessions"
  on public.sessions for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated can update session_students" on public.session_students;
create policy "Authenticated can update session_students"
  on public.session_students for update
  to authenticated
  using (true)
  with check (true);

