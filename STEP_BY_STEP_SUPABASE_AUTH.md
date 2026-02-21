# Step-by-step: Supabase sign-in with Vercel and Cursor

This guide adds Supabase authentication to your Next.js app, using Cursor locally and deploying to Vercel.

---

## Step 1: Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in (or create an account).
2. Click **New project**.
3. Choose an organization, set **Name** (e.g. `pb-test-app`), **Database password**, and **Region**.
4. Click **Create new project** and wait for it to finish provisioning.

---

## Step 2: Get your Supabase keys

1. In the Supabase dashboard, open your project.
2. Go to **Project Settings** (gear icon) → **API**.
3. Copy:
   - **Project URL** (e.g. `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

You’ll use these in Step 4 (env vars).

---

## Step 3: Configure Supabase Auth (optional)

1. In the dashboard go to **Authentication** → **Providers**.
2. Enable the providers you want (e.g. **Email**, **Google**, **GitHub**).
3. For **Email**: turn on "Enable Email provider" and, if you want magic links, enable "Confirm email".
4. For **Google/GitHub**: follow the on-screen steps to add OAuth client ID/secret in Supabase and in the provider’s dev console.

---

## Step 4: Add environment variables (local + Vercel)

### In Cursor (local)

1. In your project root create `.env.local` (it’s gitignored by default in Next.js).
2. Add:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

Replace with your Project URL and anon key from Step 2.

### In Vercel

1. Go to [vercel.com](https://vercel.com) → your project (or import this repo as a new project).
2. Open **Settings** → **Environment Variables**.
3. Add the same two variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Choose environments (Production, Preview, Development) and save.
5. Redeploy so the new env vars are applied.

---

## Step 5: Install Supabase in the project (in Cursor)

In the terminal (Cursor’s integrated terminal or your system terminal):

```bash
npm install @supabase/supabase-js @supabase/ssr
```

- `@supabase/supabase-js`: Supabase client.
- `@supabase/ssr`: Helpers for Next.js (cookies, server/client).

---

## Step 6: Use the Supabase client in the app

The project already includes:

- **Browser client** (for client components): `src/lib/supabase/client.ts`
- **Server client** (for Server Components / Route Handlers): `src/lib/supabase/server.ts`

Use `createBrowserClient()` in `'use client'` components and `createServerClient()` (or the server helper) in server code. See those files for usage.

---

## Step 7: Add auth UI and session handling

1. **Sign-in page**  
   Use (or adapt) `app/login/page.tsx` for email/password or OAuth sign-in. It uses the browser client to call `signInWithPassword()` or `signInWithOAuth()`.

2. **Auth provider**  
   Wrap the app with `src/components/providers/AuthProvider.tsx` in `app/layout.tsx` so the rest of the app can read `user` and `session` and show sign-in vs signed-in UI.

3. **Redirect after login**  
   After a successful sign-in, redirect to `/` (or your dashboard). After sign-out, redirect to `/login`.

4. **Protected routes (optional)**  
   Use Next.js middleware (`middleware.ts` at the project root) to redirect unauthenticated users from `/`, `/coach`, `/admin` to `/login`. The middleware uses the server Supabase client to validate the session from cookies.

---

## Step 8: Run and test locally in Cursor

1. Ensure `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. Run:

```bash
npm run dev
```

3. Open `http://localhost:3000`, go to `/login`, sign in (create a user in Supabase **Authentication** → **Users** if using email/password), and confirm redirect and session.

---

## Step 9: Deploy to Vercel

1. Push your code to GitHub (or your linked Git provider).
2. In Vercel, ensure **Environment Variables** are set (Step 4).
3. Trigger a new deployment (push to main or **Redeploy** in Vercel).
4. In Supabase dashboard: **Authentication** → **URL Configuration**:
   - **Site URL**: `https://your-app.vercel.app`
   - **Redirect URLs**: add `https://your-app.vercel.app/**` (and `http://localhost:3000/**` for local).

Without this, OAuth and redirects may fail in production.

---

## Step 10: Optional – Cursor rules for this project

To keep Supabase usage consistent in Cursor:

1. Create or edit `.cursor/rules` (or a rule file under `.cursor/rules/`).
2. Add a short rule, e.g.:
   - “Use `@/lib/supabase/client` in client components and `@/lib/supabase/server` on the server; never put secrets in client code.”

---

## Quick reference

| Task              | Where / How                                      |
|-------------------|---------------------------------------------------|
| Supabase project  | supabase.com → New project                        |
| API keys          | Project Settings → API                            |
| Auth providers    | Authentication → Providers                        |
| Local env         | `.env.local` with `NEXT_PUBLIC_*`                 |
| Vercel env        | Project → Settings → Environment Variables        |
| Redirect URLs     | Supabase → Authentication → URL Configuration    |
| Client-side auth  | `createBrowserClient()` in `src/lib/supabase/client.ts` |
| Server-side auth  | `createServerClient()` in `src/lib/supabase/server.ts` |
| Sign-in UI        | `app/login/page.tsx`                              |
| Session in app    | `AuthProvider` in `app/layout.tsx`                |

---

## Troubleshooting

- **“Invalid API key”**: Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` and Vercel.
- **Redirect loop**: Ensure middleware allows `/login` and static assets; don’t require auth on `/login`.
- **OAuth not redirecting**: Add your Vercel URL to Supabase **Redirect URLs** and use the same protocol (https) in production.
