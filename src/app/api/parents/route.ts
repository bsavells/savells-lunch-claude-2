import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { PRIMARY_PARENT_EMAIL, requireParent } from '@/lib/parent-auth';

export async function GET() {
  if (!(await requireParent())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const service = createServiceClient();
  const { data, error } = await service
    .from('profiles')
    .select('id, name, auth_user_id, avatar_emoji, avatar_color, created_at')
    .eq('role', 'parent')
    .order('created_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const withEmails = await Promise.all(
    (data || []).map(async (p) => {
      let email: string | null = null;
      if (p.auth_user_id) {
        const { data: userData } = await service.auth.admin.getUserById(p.auth_user_id);
        email = userData?.user?.email ?? null;
      }
      return { ...p, email, isPrimary: email?.toLowerCase() === PRIMARY_PARENT_EMAIL };
    })
  );

  return NextResponse.json({ parents: withEmails });
}

export async function POST(request: NextRequest) {
  const user = await requireParent();
  if (!user || user.email?.toLowerCase() !== PRIMARY_PARENT_EMAIL) {
    return NextResponse.json({ error: 'Only the primary parent can add accounts' }, { status: 403 });
  }

  const { name, email, redirectTo } = await request.json();
  if (!name || !email) {
    return NextResponse.json({ error: 'name and email required' }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: existing } = await service
    .from('profiles')
    .select('id')
    .eq('name', name)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'A profile with that name already exists' }, { status: 400 });
  }

  const { data: invited, error: inviteErr } = await service.auth.admin.inviteUserByEmail(email, {
    redirectTo: redirectTo || 'https://lunch.savells.net/login',
  });
  if (inviteErr || !invited.user) {
    return NextResponse.json({ error: inviteErr?.message || 'Failed to send invitation' }, { status: 500 });
  }

  const { error: profileErr } = await service.from('profiles').insert({
    auth_user_id: invited.user.id,
    name,
    role: 'parent',
    avatar_emoji: '👤',
    avatar_color: '#6366f1',
  });

  if (profileErr) {
    await service.auth.admin.deleteUser(invited.user.id);
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
