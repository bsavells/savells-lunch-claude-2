import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { PRIMARY_PARENT_EMAIL, requirePrimaryParent } from '@/lib/parent-auth';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const primary = await requirePrimaryParent();
  if (!primary) {
    return NextResponse.json(
      { error: 'Only the primary parent can remove accounts' },
      { status: 403 }
    );
  }

  const service = createServiceClient();

  const { data: target } = await service
    .from('profiles')
    .select('auth_user_id, role')
    .eq('id', id)
    .single();
  if (!target || target.role !== 'parent') {
    return NextResponse.json({ error: 'Parent not found' }, { status: 404 });
  }

  if (target.auth_user_id) {
    const { data: targetUser } = await service.auth.admin.getUserById(target.auth_user_id);
    if (targetUser?.user?.email?.toLowerCase() === PRIMARY_PARENT_EMAIL) {
      return NextResponse.json(
        { error: 'Cannot remove the primary parent account' },
        { status: 400 }
      );
    }
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
