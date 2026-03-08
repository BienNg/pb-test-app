-- Make coach optional when adding a session
alter table if exists public.sessions
  alter column coach_id drop not null;

-- Add session type: 'game' or 'drill' (optional)
alter table if exists public.sessions
  add column if not exists session_type text
  check (session_type is null or session_type in ('game', 'drill'));
