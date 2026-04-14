import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireParent } from '@/lib/parent-auth';
import { SCHOOLS } from '@/lib/constants';
import { School } from '@/lib/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!(await requireParent())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { school } = await request.json();
  const validSlugs = SCHOOLS.map((s) => s.slug);
  if (!school || !validSlugs.includes(school as School)) {
    return NextResponse.json({ error: 'Invalid school' }, { status: 400 });
  }

  const service = createServiceClient();

  // Ensure target is a child profile
  const { data: profile } = await service
    .from('profiles')
    .select('role')
    .eq('id', id)
    .single();

  if (!profile || profile.role !== 'child') {
    return NextResponse.json({ error: 'Child not found' }, { status: 404 });
  }

  const { error } = await service
    .from('profiles')
    .update({ school })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
