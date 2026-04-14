import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { verifyKidSession } from './lib/auth';

const PUBLIC_PATHS = ['/login', '/reset-password', '/api/auth', '/api/profiles'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and static assets
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/'
  ) {
    // For root, redirect to dashboard if authenticated
    if (pathname === '/') {
      const session = await getSession(request);
      if (session) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }

    return updateSupabaseResponse(request);
  }

  // Check authentication
  const session = await getSession(request);
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Attach user info to headers for downstream use
  const response = await updateSupabaseResponse(request);
  response.headers.set('x-user-profile', JSON.stringify(session));
  return response;
}

async function getSession(request: NextRequest) {
  // Check kid session first (faster)
  const kidToken = request.cookies.get('kid-session')?.value;
  if (kidToken) {
    const kidUser = await verifyKidSession(kidToken);
    if (kidUser) return kidUser;
  }

  // Check Supabase session
  const response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) return null;

  return {
    profileId: profile.id,
    name: profile.name,
    role: profile.role,
    school: profile.school,
    authType: 'supabase' as const,
  };
}

async function updateSupabaseResponse(request: NextRequest) {
  const response = NextResponse.next({ request });
  createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
