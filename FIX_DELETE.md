# 🔥 URGENT: Apply this migration to fix session deletion

## The Problem

Session deletion doesn't work because there's no RLS policy allowing authenticated users to delete sessions.

## The Fix

You need to apply this migration: `20260308100000_allow_authenticated_delete_sessions.sql`

## How to apply it (2 minutes)

1. **Open your Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project (`eyyhojwyesoueznmivfd`)

2. **Open SQL Editor**
   - Click **SQL Editor** in the left sidebar
   - Click **New query**

3. **Copy and paste this SQL**:
   ```sql
   -- Allow authenticated users to delete sessions (e.g. from TrainingSessionDetail)
   create policy "Authenticated can delete sessions"
     on public.sessions for delete
     to authenticated
     using (true);
   ```

4. **Click Run** (or press Cmd+Enter)

5. **Done!** Now try deleting a session again.

---

## How to verify it worked

After applying the migration, open your browser console (F12) and try deleting a session. You should see:

```
[TrainingSessionDetail] Deleting session: <uuid>
[TrainingSessionDetail] Session deleted successfully
```

If you still see an error, check the console for the specific error message.
