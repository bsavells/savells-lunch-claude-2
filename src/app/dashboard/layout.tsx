'use client';

import { useAuth } from '@/lib/context/auth-context';
import { useTheme } from '@/lib/context/theme-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="w-9 h-9 rounded-xl flex items-center justify-center text-warm-gray hover:text-foreground hover:bg-cream-dark transition-colors"
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
    >
      {theme === 'dark' ? (
        <svg className="theme-icon-enter" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        <svg className="theme-icon-enter" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, profiles } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="linen-bg min-h-screen flex items-center justify-center">
        <div className="animate-pulse font-display text-2xl text-amber-dark">Loading...</div>
      </div>
    );
  }

  const currentProfile = profiles.find((p) => p.id === user.profileId);

  return (
    <div className="linen-bg min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-cream-dark">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl">🍱</span>
            <span className="font-display font-bold text-lg text-foreground hidden sm:block">
              Savells Lunch
            </span>
          </Link>

          {/* Nav links - parent gets overview + menu, kid gets menu only */}
          <nav className="flex items-center gap-1">
            {user.role === 'parent' && (
              <Link
                href="/dashboard/overview"
                className={`px-3 py-1.5 rounded-lg font-display text-sm font-medium transition-colors ${
                  pathname === '/dashboard/overview'
                    ? 'bg-amber/10 text-amber-dark'
                    : 'text-warm-gray hover:text-foreground'
                }`}
              >
                Overview
              </Link>
            )}
            <Link
              href="/dashboard/menu"
              className={`px-3 py-1.5 rounded-lg font-display text-sm font-medium transition-colors ${
                pathname.startsWith('/dashboard/menu') || pathname.startsWith('/dashboard/select')
                  ? 'bg-amber/10 text-amber-dark'
                  : 'text-warm-gray hover:text-foreground'
              }`}
            >
              Menu
            </Link>
            {user.role === 'parent' ? (
              <Link
                href="/dashboard/settings"
                className={`px-3 py-1.5 rounded-lg font-display text-sm font-medium transition-colors ${
                  pathname === '/dashboard/settings'
                    ? 'bg-amber/10 text-amber-dark'
                    : 'text-warm-gray hover:text-foreground'
                }`}
              >
                Settings
              </Link>
            ) : (
              <>
                <Link
                  href="/dashboard/my-week"
                  className={`px-3 py-1.5 rounded-lg font-display text-sm font-medium transition-colors ${
                    pathname === '/dashboard/my-week'
                      ? 'bg-amber/10 text-amber-dark'
                      : 'text-warm-gray hover:text-foreground'
                  }`}
                >
                  My Week
                </Link>
                <Link
                  href="/dashboard/change-icon"
                  className={`px-3 py-1.5 rounded-lg font-display text-sm font-medium transition-colors ${
                    pathname === '/dashboard/change-icon'
                      ? 'bg-amber/10 text-amber-dark'
                      : 'text-warm-gray hover:text-foreground'
                  }`}
                >
                  Icon
                </Link>
                <Link
                  href="/dashboard/change-pin"
                  className={`px-3 py-1.5 rounded-lg font-display text-sm font-medium transition-colors ${
                    pathname === '/dashboard/change-pin'
                      ? 'bg-amber/10 text-amber-dark'
                      : 'text-warm-gray hover:text-foreground'
                  }`}
                >
                  PIN
                </Link>
              </>
            )}
          </nav>

          {/* Theme toggle + User info + logout */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="flex items-center gap-2">
              {currentProfile && (
                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
                  style={{ backgroundColor: currentProfile.avatar_color + '20' }}
                >
                  {currentProfile.avatar_emoji}
                </span>
              )}
              <span className="font-display font-medium text-sm text-foreground hidden sm:block">
                {user.name}
              </span>
            </div>
            <button
              onClick={() => { logout(); router.push('/login'); }}
              className="text-warm-gray hover:text-foreground transition-colors text-xs font-body"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
