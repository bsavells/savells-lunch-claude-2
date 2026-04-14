import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  const { data: me } = await service
    .from('profiles')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single();
  if (me?.role !== 'parent') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (me.id === id) {
    return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });
  }

  const { data: target } = await service
    .from('profiles')
    .select('auth_user_id, role')
    .eq('id', id)
    .single();
  if (!target || target.role !== 'parent') {
    return NextResponse.json({ error: 'Parent not found' }, { status: 404 });
  }

  const { error: delProfileErr } = await service.from('profiles').delete().eq('id', id);
  if (delProfileErr) {
    return NextResponse.json({ error: delProfileErr.message }, { status: 500 });
  }

  if (target.auth_user_id) {
    await service.auth.admin.deleteUser(target.auth_user_id);
  }

  return NextResponse.json({ success: true });
}
