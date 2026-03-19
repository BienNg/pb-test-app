import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Supabase redirects email links (signup confirmation, password reset) to /auth/confirm.
 * This route handles the code exchange and redirects appropriately.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  const redirectTo = next.startsWith('/') ? next : '/';
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    const params = new URLSearchParams({
      error: 'auth_callback',
      message: errorDescription || error,
    });
    return NextResponse.redirect(`${origin}/login?${params.toString()}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (!exchangeError) {
      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${redirectTo}`);
      }
      if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${redirectTo}`);
      }
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
