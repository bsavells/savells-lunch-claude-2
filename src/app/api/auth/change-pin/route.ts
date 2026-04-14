import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { verifyKidSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { profileId, currentPin, newPin, parentOverride } = await request.json();

  if (!profileId || !newPin) {
    return NextResponse.json({ error: 'profileId and newPin required' }, { status: 400 });
  }

  if (newPin.length < 3 || newPin.length > 8) {
    return NextResponse.json({ error: 'PIN must be 3-8 digits' }, { status: 400 });
  }

  if (!/^\d+$/.test(newPin)) {
    return NextResponse.json({ error: 'PIN must be digits only' }, { status: 400 });
  }

  const service = createServiceClient();

  // Check who is making the request
  let isParent = false;

  // Check Supabase session (parent)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: parentProfile } = await service
      .from('profiles')
      .select('role')
      .eq('auth_user_id', user.id)
      .single();
    isParent = parentProfile?.role === 'parent';
  }

  // If not parent, check kid session
  if (!isParent) {
    const kidToken = request.cookies.get('kid-session')?.value;
    if (kidToken) {
      const kidUser = await verifyKidSession(kidToken);
      if (kidUser) {
        // Kids can only change their own PIN
        if (kidUser.profileId !== profileId) {
          return NextResponse.json({ error: 'Cannot change another user\'s PIN' }, { status: 403 });
        }

        // Kids must provide current PIN
        if (!currentPin) {
          return NextResponse.json({ error: 'Current PIN required' }, { status: 400 });
        }

        const { data: profile } = await service
          .from('profiles')
          .select('pin_hash')
          .eq('id', profileId)
          .single();

        if (!profile?.pin_hash) {
          return NextResponse.json({ error: 'No current PIN set' }, { status: 400 });
        }

        const valid = await bcrypt.compare(currentPin, profile.pin_hash);
        if (!valid) {
          return NextResponse.json({ error: 'Current PIN is incorrect' }, { status: 401 });
        }
      } else {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // If parent with parentOverride, no need to check current PIN
  // If not parent, current PIN was already verified above

  // Hash and save new PIN
  const pinHash = await bcrypt.hash(newPin, 10);
  const { error } = await service
    .from('profiles')
    .update({ pin_hash: pinHash })
    .eq('id', profileId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
