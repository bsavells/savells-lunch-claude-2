import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export const PRIMARY_PARENT_EMAIL = 'brian@savells.net';

export async function requireParent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const service = createServiceClient();
  const { data: profile } = await service
    .from('profiles')
    .select('role')
    .eq('auth_user_id', user.id)
    .single();
  if (profile?.role !== 'parent') return null;
  return user;
}

export async function requirePrimaryParent() {
  const user = await requireParent();
  if (!user) return null;
  if (user.email?.toLowerCase() !== PRIMARY_PARENT_EMAIL) return null;
  return user;
}

export function isPrimaryParentEmail(email?: string | null) {
  return email?.toLowerCase() === PRIMARY_PARENT_EMAIL;
}
