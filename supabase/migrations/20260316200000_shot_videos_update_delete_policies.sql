-- Allow authenticated users to update and delete shot_videos (admin/coach use).
create policy "Authenticated can update shot_videos"
  on public.shot_videos for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated can delete shot_videos"
  on public.shot_videos for delete
  to authenticated
  using (true);
