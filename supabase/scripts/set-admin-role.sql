-- Set your user as admin so you can delete students.
-- Run this in Supabase Dashboard: SQL Editor
--
-- Replace 'your@email.com' with your actual login email:
UPDATE profiles SET role = 'admin' WHERE id = (SELECT id FROM auth.users WHERE email = 'bien-nguyen@outlook.com');
