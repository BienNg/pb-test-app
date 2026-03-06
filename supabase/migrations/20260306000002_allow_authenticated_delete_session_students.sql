-- Allow authenticated users to delete session_students (needed for admin re-assignment)
drop policy if exists "Authenticated can delete session_students" on public.session_students;
create policy "Authenticated can delete session_students"
  on public.session_students for delete
  to authenticated
  using (true);

