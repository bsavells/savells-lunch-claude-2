import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { verifyKidSession } from '@/lib/auth';
import { ALL_AVATARS } from '@/lib/avatar-options';

export async function POST(request: NextRequest) {
  const { profileId, emoji } = await request.json();

  if (!profileId || !emoji) {
    return NextResponse.json({ error: 'profileId and emoji required' }, { status: 400 });
  }

  if (!ALL_AVATARS.includes(emoji)) {
    return NextResponse.json({ error: 'Invalid emoji' }, { status: 400 });
  }

  const service = createServiceClient();

  // Authorize: kid changing own, OR parent changing any kid's
  const kidToken = request.cookies.get('kid-session')?.value;
  let authorized = false;

  if (kidToken) {
    const kidUser = await verifyKidSession(kidToken);
    if (kidUser && kidUser.profileId === profileId) {
      authorized = true;
    }
  }

  if (!authorized) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: parentProfile } = await service
        .from('profiles')
        .select('role')
        .eq('auth_user_id', user.id)
        .single();
      if (parentProfile?.role === 'parent') authorized = true;
    }
  }

  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await service
    .from('profiles')
    .update({ avatar_emoji: emoji })
    .eq('id', profileId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
