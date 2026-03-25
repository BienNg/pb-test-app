import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAllowedAdminEmail } from '@/lib/admin-access';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id: studentId } = body as { id?: string };

    if (!studentId || typeof studentId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid student id' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAllowedAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminClient = createAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { error: 'Server configuration error: admin client not available' },
        { status: 500 }
      );
    }

    const { error } = await adminClient.auth.admin.deleteUser(studentId);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete student error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete student' },
      { status: 500 }
    );
  }
}
