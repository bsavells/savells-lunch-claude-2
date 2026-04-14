import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyKidSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { addDays, format } from 'date-fns';
import { getMonday } from '@/lib/menu';

export async function GET(request: NextRequest) {
  // Verify authentication
  const kidToken = request.cookies.get('kid-session')?.value;
  let authenticated = false;

  if (kidToken) {
    const kidUser = await verifyKidSession(kidToken);
    authenticated = !!kidUser;
  }

  if (!authenticated) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    authenticated = !!user;
  }

  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const dateStr = searchParams.get('weekStart');
  const monday = dateStr || getMonday(new Date());
  const friday = format(addDays(new Date(monday), 4), 'yyyy-MM-dd');

  const supabase = createServiceClient();

  const { data: selections, error } = await supabase
    .from('meal_selections')
    .select('*, profile:profiles(name, avatar_color, avatar_emoji, school)')
    .gte('date', monday)
    .lte('date', friday)
    .order('date');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ selections });
}
