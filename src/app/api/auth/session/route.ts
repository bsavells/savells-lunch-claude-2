import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyKidSession } from '@/lib/auth';
import { SessionUser } from '@/lib/types';

export async function GET(request: NextRequest) {
  // Check kid session
  const kidToken = request.cookies.get('kid-session')?.value;
  if (kidToken) {
    const kidUser = await verifyKidSession(kidToken);
    if (kidUser) {
      return NextResponse.json({ user: kidUser });
    }
  }

  // Check Supabase session
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ user: null });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ user: null });
  }

  const sessionUser: SessionUser = {
    profileId: profile.id,
    name: profile.name,
    role: profile.role,
    school: profile.school,
    authType: 'supabase',
  };

  return NextResponse.json({ user: sessionUser });
}
