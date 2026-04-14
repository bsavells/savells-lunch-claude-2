import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, role, school, avatar_color, avatar_emoji')
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profiles: data });
}
