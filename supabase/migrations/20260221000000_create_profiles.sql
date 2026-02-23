-- Create public.profiles table (expected by AdminApp for Students list)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text default 'student'
);

-- Optional: index for filtering by role
create index if not exists profiles_role_idx on public.profiles(role);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Policy: authenticated users can read all profiles (needed for Admin "Students" dropdown and coach views)
create policy "Authenticated can read profiles"
  on public.profiles for select
  to authenticated
  using (true);

-- Policy: users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Policy: allow insert so trigger and signup flow can create rows (authenticated can insert own)
create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Trigger: create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'student')
  );
  return new;
end;
$$;

-- Drop trigger if it exists (idempotent)
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: add profile rows for any existing auth.users that don't have one (runs with definer rights so RLS doesn't block)
create or replace function public.backfill_profiles_from_auth()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  select id, email, coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)), coalesce(raw_user_meta_data->>'role', 'student')
  from auth.users
  on conflict (id) do nothing;
end;
$$;

select public.backfill_profiles_from_auth();
