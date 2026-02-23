# Supabase setup

## Running the profiles migration

The app expects a `public.profiles` table. To create it (and sync new sign-ups):

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
