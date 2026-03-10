# Session Delete Debugging Guide

## Changes Made

### 1. Added `onDeleteSession` callbacks to all parents
- **AdminApp.tsx**: Calls `handleSessionUpdated` after delete
- **StudentShell.tsx**: Calls `reloadSessions` after delete  
- **CoachApp.tsx**: Calls `reloadSelectedStudentSessions` after delete

### 2. Added comprehensive logging
All delete operations now log to browser console:
- When component renders (shows if `isDbSession` is true/false)
- When "Delete session" button is clicked
- When "Yes, delete" is clicked
- When delete succeeds or fails (with error details)

### 3. Added user feedback for non-deletable sessions
If `isDbSession` is false, user now sees: "This session cannot be deleted."

### 4. Created migration for RLS policy
Migration: `supabase/migrations/20260308100000_allow_authenticated_delete_sessions.sql`

## How to Debug

### Step 1: Open Browser Console
Open Developer Tools (F12 or Cmd+Option+I) and go to the Console tab.

### Step 2: Try to delete a session
1. Open a session detail view
2. Click the "Edit" button (or however you open the edit panel)
3. Scroll to the bottom where "Delete session" button is
4. Click "Delete session"
5. Click "Yes, delete"

### Step 3: Check console output

You should see something like this:

```
[TrainingSessionDetail] Rendered: {
  sessionId: "abc-123-...",
  hasSessionsProp: true,
  sessionCount: 5,
  foundSession: true,
  isDbSession: true,
  hasOnDeleteSession: true
}
[TrainingSessionDetail] Delete button clicked, showing confirmation
[TrainingSessionDetail] Deleting session: abc-123-...
```

Then either:

**Success:**
```
[TrainingSessionDetail] Session deleted successfully
```

**Failure (RLS policy missing):**
```
[TrainingSessionDetail] Delete error: { code: "42501", message: "new row violates row-level security policy" }
[TrainingSessionDetail] Delete failed: ...
```

**Failure (not a DB session):**
```
[TrainingSessionDetail] isDbSession is false
```

## Common Issues

### Issue: `isDbSession: false`
**Cause:** The component wasn't passed a `sessions` prop, or the session ID doesn't match any session in the array.

**Fix:** Make sure the parent component is passing the `sessions` prop:
```tsx
<TrainingSessionDetail
  sessionId={id}
  sessions={sessionsArray}  // ← Must be provided
  onDeleteSession={...}
  ...
/>
```

### Issue: "permission denied" or "row-level security policy"
**Cause:** The RLS migration hasn't been applied.

**Fix:** Apply the migration in Supabase SQL Editor (see FIX_DELETE.md):
```sql
create policy "Authenticated can delete sessions"
  on public.sessions for delete
  to authenticated
  using (true);
```

### Issue: Delete succeeds but session still appears
**Cause:** Parent component's `onDeleteSession` isn't reloading the session list.

**Fix:** Already fixed - all parents now call their reload functions.

### Issue: Nothing happens when clicking buttons
**Cause:** Click event isn't registering (possibly z-index or pointer-events issue).

**Fix:** Check browser console. If you don't see the log messages, the click isn't reaching the handler.

## Files Modified

- `src/components/TrainingSessionDetail.tsx` - Added logging, error feedback
- `src/components/AdminApp.tsx` - Added `onDeleteSession` callback
- `src/components/StudentShell.tsx` - Added `onDeleteSession` callback  
- `src/components/CoachApp.tsx` - Added `onDeleteSession` callback
- `supabase/migrations/20260308100000_allow_authenticated_delete_sessions.sql` - New RLS policy
- `supabase/README.md` - Updated with migration instructions

## Next Steps

1. **Open browser console** (F12)
2. **Try deleting a session**
3. **Check the console logs**
4. **Report back what you see**

The logs will tell us exactly where the issue is!
