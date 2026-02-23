-- Sessions table: one row per admin-created session (date, coach, optional YouTube link)
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  youtube_url text,
  coach_id text not null,
  created_at timestamptz not null default now()
);

-- Junction table: which students are in which session (many-to-many)
create table if not exists public.session_students (
  session_id uuid not null references public.sessions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  primary key (session_id, student_id)
);

create index if not exists session_students_session_id_idx on public.session_students(session_id);
create index if not exists session_students_student_id_idx on public.session_students(student_id);
create index if not exists sessions_date_idx on public.sessions(date);

-- RLS
alter table public.sessions enable row level security;
alter table public.session_students enable row level security;

-- Authenticated users can read all sessions and session_students
create policy "Authenticated can read sessions"
  on public.sessions for select
  to authenticated
  using (true);

create policy "Authenticated can read session_students"
  on public.session_students for select
  to authenticated
  using (true);

-- Authenticated users can insert sessions and session_students (admin creates sessions)
create policy "Authenticated can insert sessions"
  on public.sessions for insert
  to authenticated
  with check (true);

create policy "Authenticated can insert session_students"
  on public.session_students for insert
  to authenticated
  with check (true);
