-- Allow authenticated users to delete sessions (e.g. from TrainingSessionDetail)
create policy "Authenticated can delete sessions"
  on public.sessions for delete
  to authenticated
  using (true);
