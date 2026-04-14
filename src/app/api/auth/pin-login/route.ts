import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServiceClient } from '@/lib/supabase/service';
import { signKidSession } from '@/lib/auth';
import { SessionUser } from '@/lib/types';

export async function POST(request: NextRequest) {
  const { name, pin } = await request.json();

  if (!name || !pin) {
    return NextResponse.json({ error: 'Name and PIN required' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('name', name)
    .eq('role', 'child')
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  if (!profile.pin_hash) {
    return NextResponse.json({ error: 'PIN not set. Ask a parent to set your PIN.' }, { status: 401 });
  }

  const valid = await bcrypt.compare(pin, profile.pin_hash);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
  }

  const sessionUser: SessionUser = {
    profileId: profile.id,
    name: profile.name,
    role: 'child',
    school: profile.school,
    authType: 'pin',
  };

  const token = await signKidSession(sessionUser);

  const response = NextResponse.json({ user: sessionUser });
  response.cookies.set('kid-session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });

  return response;
}
