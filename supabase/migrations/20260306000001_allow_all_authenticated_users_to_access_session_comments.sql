-- Allow any authenticated user to read and write session comments.
-- Existing policies already target the `authenticated` role and call this helper,
-- so replacing it is enough to relax access without touching each policy.
create or replace function public.can_access_session_comments(sid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select auth.role() = 'authenticated';
$$;
