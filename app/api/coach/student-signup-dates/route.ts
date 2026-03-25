import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type SignupDateRequest = {
  studentIds?: string[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SignupDateRequest;
    const studentIds = Array.isArray(body.studentIds)
      ? body.studentIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
      : [];

    if (studentIds.length === 0) {
      return NextResponse.json({ signupDates: {} as Record<string, string> });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role ?? 'student';
    if (role !== 'admin' && role !== 'coach') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminClient = createAdminClient();
    if (!adminClient) {
      return NextResponse.json({ error: 'Admin client not available' }, { status: 500 });
    }

    const entries = await Promise.all(
      studentIds.map(async (studentId): Promise<[string, string | null]> => {
        const { data, error } = await adminClient.auth.admin.getUserById(studentId);
        if (error || !data.user?.created_at) {
          return [studentId, null];
        }
        return [studentId, data.user.created_at];
      })
    );

    const signupDates = entries.reduce<Record<string, string>>((acc, [studentId, createdAt]) => {
      if (createdAt) acc[studentId] = createdAt;
      return acc;
    }, {});

    return NextResponse.json({ signupDates });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load signup dates' },
      { status: 500 }
    );
  }
}
