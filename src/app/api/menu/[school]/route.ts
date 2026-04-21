import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { fetchMenuFromNutrislice, getMonday } from '@/lib/menu';
import { MENU_CACHE_HOURS } from '@/lib/constants';
import { School } from '@/lib/types';
import { parseISO } from 'date-fns';

const VALID_SCHOOLS: School[] = ['boles-jhs', 'moore-elementary-school', 'martin-hs'];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ school: string }> }
) {
  const { school } = await params;

  if (!VALID_SCHOOLS.includes(school as School)) {
    return NextResponse.json({ error: 'Invalid school' }, { status: 400 });
  }

  const searchParams = request.nextUrl.searchParams;
  const dateStr = searchParams.get('date');
  // Use parseISO to avoid timezone issues (new Date('YYYY-MM-DD') parses as UTC midnight,
  // which shifts to the previous day in US timezones)
  const monday = dateStr ? getMonday(parseISO(dateStr)) : getMonday(new Date());

  const supabase = createServiceClient();

  // Check cache
  const { data: cached } = await supabase
    .from('menu_cache')
    .select('*')
    .eq('school', school)
    .eq('week_start_date', monday)
    .single();

  if (cached) {
    const fetchedAt = new Date(cached.fetched_at);
    const hoursOld = (Date.now() - fetchedAt.getTime()) / (1000 * 60 * 60);
    if (hoursOld < MENU_CACHE_HOURS) {
      return NextResponse.json({ menu: cached.menu_data, cached: true });
    }
  }

  // Fetch from Nutrislice
  try {
    const menu = await fetchMenuFromNutrislice(school as School, monday);

    // Only cache when the menu actually has content — don't lock in empty results
    // for 24 hours, since the district may publish the menu later in the week.
    const hasItems = Object.values(menu).some(
      (day) => day.entrees.length > 0 || day.sides.length > 0
    );

    if (hasItems) {
      await supabase
        .from('menu_cache')
        .upsert(
          { school, week_start_date: monday, menu_data: menu, fetched_at: new Date().toISOString() },
          { onConflict: 'school,week_start_date' }
        );
    }

    return NextResponse.json({ menu, cached: false, published: hasItems });
  } catch (error) {
    // If fetch fails but we have stale cache, serve it
    if (cached) {
      return NextResponse.json({ menu: cached.menu_data, cached: true, stale: true });
    }
    return NextResponse.json(
      { error: 'Failed to fetch menu', detail: String(error) },
      { status: 502 }
    );
  }
}
