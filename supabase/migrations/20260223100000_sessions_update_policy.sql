-- Allow authenticated users to update sessions (e.g. admin adding youtube_url)
create policy "Authenticated can update sessions"
  on public.sessions for update
  to authenticated
  using (true)
  with check (true);
