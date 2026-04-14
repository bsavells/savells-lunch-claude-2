import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';

async function requireParent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const service = createServiceClient();
  const { data: profile } = await service
    .from('profiles')
    .select('role')
    .eq('auth_user_id', user.id)
    .single();
  if (profile?.role !== 'parent') return null;
  return user;
}

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
      return { ...p, email };
    })
  );

  return NextResponse.json({ parents: withEmails });
}

export async function POST(request: NextRequest) {
  if (!(await requireParent())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { name, email, password } = await request.json();
  if (!name || !email || !password) {
    return NextResponse.json({ error: 'name, email, password required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
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

  const { data: created, error: createErr } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    return NextResponse.json({ error: createErr?.message || 'Failed to create user' }, { status: 500 });
  }

  const { error: profileErr } = await service.from('profiles').insert({
    auth_user_id: created.user.id,
    name,
    role: 'parent',
    avatar_emoji: '👤',
    avatar_color: '#6366f1',
  });

  if (profileErr) {
    await service.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
