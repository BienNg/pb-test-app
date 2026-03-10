-- Add optional example GIF reference to session comments
alter table public.session_comments
  add column if not exists example_gif text;
