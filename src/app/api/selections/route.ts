import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyKidSession } from '@/lib/auth';

async function getCallerProfile(request: NextRequest) {
  // Check kid session
  const kidToken = request.cookies.get('kid-session')?.value;
  if (kidToken) {
    const kidUser = await verifyKidSession(kidToken);
    if (kidUser) return kidUser;
  }

  // Check Supabase session
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) return null;

  return {
    profileId: profile.id,
    name: profile.name,
    role: profile.role as 'parent' | 'child',
    school: profile.school,
    authType: 'supabase' as const,
  };
}

export async function GET(request: NextRequest) {
  const caller = await getCallerProfile(request);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get('start');
  const endDate = searchParams.get('end');
  const profileId = searchParams.get('profileId');

  const supabase = createServiceClient();
  let query = supabase.from('meal_selections').select('*');

  if (startDate) query = query.gte('date', startDate);
  if (endDate) query = query.lte('date', endDate);
  if (profileId) {
    query = query.eq('profile_id', profileId);
  } else if (caller.role === 'child') {
    // Kids can only see their own selections
    query = query.eq('profile_id', caller.profileId);
  }

  const { data, error } = await query.order('date');
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ selections: data });
}

export async function POST(request: NextRequest) {
  const caller = await getCallerProfile(request);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { profileId, date, selectionType, selectionValue } = await request.json();

  // Kids can only select for themselves
  if (caller.role === 'child' && profileId !== caller.profileId) {
    return NextResponse.json({ error: 'Cannot select for another child' }, { status: 403 });
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('meal_selections')
    .upsert(
      {
        profile_id: profileId,
        date,
        selection_type: selectionType,
        selection_value: selectionValue,
        selected_by: caller.profileId,
      },
      { onConflict: 'profile_id,date' }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ selection: data });
}

export async function DELETE(request: NextRequest) {
  const caller = await getCallerProfile(request);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const profileId = searchParams.get('profileId');
  const date = searchParams.get('date');

  if (!profileId || !date) {
    return NextResponse.json({ error: 'profileId and date required' }, { status: 400 });
  }

  if (caller.role === 'child' && profileId !== caller.profileId) {
    return NextResponse.json({ error: 'Cannot delete for another child' }, { status: 403 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from('meal_selections')
    .delete()
    .eq('profile_id', profileId)
    .eq('date', date);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
