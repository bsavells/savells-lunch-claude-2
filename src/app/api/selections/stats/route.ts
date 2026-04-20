import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyKidSession } from '@/lib/auth';

async function getCallerProfile(request: NextRequest) {
  const kidToken = request.cookies.get('kid-session')?.value;
  if (kidToken) {
    const kidUser = await verifyKidSession(kidToken);
    if (kidUser) return kidUser;
  }

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

interface SlotPrediction {
  profile_id: string;
  weekday: number;
  predicted_type: 'packed' | 'entree';
  confidence: number;
  total_samples: number;
}

export async function GET(request: NextRequest) {
  const caller = await getCallerProfile(request);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (caller.role !== 'parent') {
    return NextResponse.json({ error: 'Parents only' }, { status: 403 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('meal_selections')
    .select('profile_id, date, selection_type');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Aggregate per (profile_id, weekday)
  const counts: Record<string, { packed: number; entree: number }> = {};

  for (const row of data) {
    // Parse date parts directly to avoid UTC midnight shift in Node
    const [year, month, day] = (row.date as string).split('-').map(Number);
    const weekday = new Date(year, month - 1, day).getDay(); // 0=Sun … 6=Sat
    if (weekday < 1 || weekday > 5) continue; // skip weekends (shouldn't exist, but guard)

    const key = `${row.profile_id}::${weekday}`;
    if (!counts[key]) counts[key] = { packed: 0, entree: 0 };
    if (row.selection_type === 'packed') {
      counts[key].packed++;
    } else {
      counts[key].entree++;
    }
  }

  // Build predictions — only for slots with ≥3 samples
  const predictions: Record<string, SlotPrediction> = {};

  for (const [key, { packed, entree }] of Object.entries(counts)) {
    const total = packed + entree;
    if (total < 3) continue;

    // Ties resolve to 'entree' (school lunch is the default)
    const predicted_type: 'packed' | 'entree' = packed > entree ? 'packed' : 'entree';
    const majority_count = predicted_type === 'packed' ? packed : entree;
    const confidence = Math.round((majority_count / total) * 100);

    const [profile_id, weekdayStr] = key.split('::');
    predictions[key] = {
      profile_id,
      weekday: Number(weekdayStr),
      predicted_type,
      confidence,
      total_samples: total,
    };
  }

  return NextResponse.json(
    { predictions },
    {
      headers: {
        'Cache-Control': 's-maxage=300, stale-while-revalidate=600',
      },
    }
  );
}
