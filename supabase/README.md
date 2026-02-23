# Supabase setup

## Running migrations

Run each migration in order (profiles first, then sessions) in the Supabase SQL Editor.

### 1. Profiles migration (`20260221000000_create_profiles.sql`)

1. Open your [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Go to **SQL Editor** → **New query**.
3. Copy the contents of `migrations/20260221000000_create_profiles.sql` and paste into the editor.
4. Click **Run**.

This will:

- Create `public.profiles` with columns: `id`, `email`, `full_name`, `role`.
- Enable RLS and add policies so authenticated users can read profiles and users can update their own row.
- Add a trigger so new sign-ups in Auth get a matching `profiles` row.
- Backfill `profiles` for any existing Auth users.

After it runs, the “Add session” → Students list in the admin app should work.

### 2. Sessions migration (`20260223000000_create_sessions.sql`)

1. In **SQL Editor** → **New query**.
2. Copy the contents of `migrations/20260223000000_create_sessions.sql` and paste into the editor.
3. Click **Run**.

This will:

- Create `public.sessions` (id, date, youtube_url, coach_id, created_at) for admin-created sessions.
- Create `public.session_students` (session_id, student_id) to link sessions to students.
- Enable RLS so authenticated users can read and insert sessions and session_students.

After it runs, the “Add session” button in the admin app will persist new sessions (date, YouTube URL, coach, students) to Supabase.
