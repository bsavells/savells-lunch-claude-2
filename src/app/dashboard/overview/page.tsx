'use client';

import { useAuth } from '@/lib/context/auth-context';
import { useWeekNavigation } from '@/lib/hooks/use-menu';
import { useSelections } from '@/lib/hooks/use-selections';
import { format, addDays } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { sortKidsByAge } from '@/lib/constants';

const KIDS_CONFIG: { name: string; emoji: string; color: string; school: string }[] = [
  { name: 'Patrick', emoji: '🏀', color: '#ef4444', school: 'Boles JHS' },
  { name: 'Bridget', emoji: '🎨', color: '#ec4899', school: 'Boles JHS' },
  { name: 'Michael', emoji: '⚡', color: '#f97316', school: 'Moore Elementary' },
  { name: 'Blaise', emoji: '🚀', color: '#8b5cf6', school: 'Moore Elementary' },
  { name: 'Leo', emoji: '🦁', color: '#10b981', school: 'Moore Elementary' },
  { name: 'George', emoji: '🌟', color: '#06b6d4', school: 'Moore Elementary' },
];

export default function OverviewPage() {
  const { user, profiles } = useAuth();
  const router = useRouter();
  const { weekStart, prevWeek, nextWeek, goToCurrentWeek } = useWeekNavigation();
  const { selections, loading } = useSelections(weekStart);

  // Only parent can see overview
  useEffect(() => {
    if (user && user.role !== 'parent') {
      router.replace('/dashboard/menu');
    }
  }, [user, router]);

  const childProfiles = sortKidsByAge(profiles.filter((p) => p.role === 'child'));
  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const date = addDays(weekStart, i);
    return { dateStr: format(date, 'yyyy-MM-dd'), dayShort: format(date, 'EEE'), dayNum: format(date, 'M/d') };
  });

  const getSelection = (profileId: string, dateStr: string) =>
    selections.find((s) => s.profile_id === profileId && s.date === dateStr);

  const getKidConfig = (name: string) => KIDS_CONFIG.find((k) => k.name === name);

  // Count stats
  const totalSlots = childProfiles.length * 5;
  const filledSlots = selections.length;
  const packedCount = selections.filter((s) => s.selection_type === 'packed').length;

  return (
    <div>
      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={prevWeek} className="p-2 rounded-xl hover:bg-cream-dark transition-colors">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 15L7 10L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="text-center">
          <h2 className="font-display font-bold text-xl text-foreground">
            Week of {format(weekStart, 'MMMM d')}
          </h2>
          <button onClick={goToCurrentWeek} className="text-amber-dark font-body text-xs hover:underline mt-0.5">
            Go to this week
          </button>
        </div>
        <button onClick={nextWeek} className="p-2 rounded-xl hover:bg-cream-dark transition-colors">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M8 5L13 10L8 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Stats bar */}
      <div className="flex gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-cream-dark px-4 py-3 flex-1 text-center">
          <p className="font-display text-2xl font-bold text-foreground">{filledSlots}/{totalSlots}</p>
          <p className="font-body text-xs text-warm-gray">Choices made</p>
        </div>
        <div className="bg-white rounded-2xl border border-cream-dark px-4 py-3 flex-1 text-center">
          <p className="font-display text-2xl font-bold text-amber-dark">{filledSlots - packedCount}</p>
          <p className="font-body text-xs text-warm-gray">School lunches</p>
        </div>
        <div className="bg-white rounded-2xl border border-cream-dark px-4 py-3 flex-1 text-center">
          <p className="font-display text-2xl font-bold text-foreground">{packedCount}</p>
          <p className="font-body text-xs text-warm-gray">Packed lunches</p>
        </div>
      </div>

      {/* Summary Grid */}
      <div className="bg-white rounded-2xl border border-cream-dark overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[140px_repeat(5,1fr)] border-b border-cream-dark bg-cream/50">
          <div className="px-4 py-3 font-display font-semibold text-sm text-warm-gray">
            Child
          </div>
          {weekDays.map(({ dayShort, dayNum }) => (
            <div key={dayShort} className="px-2 py-3 text-center">
              <span className="font-display font-semibold text-sm text-foreground block">{dayShort}</span>
              <span className="font-body text-[10px] text-warm-gray">{dayNum}</span>
            </div>
          ))}
        </div>

        {/* Child rows */}
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-pulse font-body text-warm-gray">Loading selections...</div>
          </div>
        ) : (
          childProfiles.map((child, idx) => {
            const config = getKidConfig(child.name);
            return (
              <div
                key={child.id}
                className={`grid grid-cols-[140px_repeat(5,1fr)] ${
                  idx < childProfiles.length - 1 ? 'border-b border-cream-dark' : ''
                }`}
              >
                {/* Child info */}
                <div className="px-4 py-3 flex items-center gap-2">
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                    style={{ backgroundColor: (config?.color || child.avatar_color) + '20' }}
                  >
                    {child.avatar_emoji || config?.emoji}
                  </span>
                  <div className="min-w-0">
                    <span className="font-display text-sm font-medium text-foreground block truncate">
                      {child.name}
                    </span>
                    <span className="font-body text-[10px] text-warm-gray">
                      {config?.school || ''}
                    </span>
                  </div>
                </div>

                {/* Day cells */}
                {weekDays.map(({ dateStr }) => {
                  const sel = getSelection(child.id, dateStr);
                  if (!sel) {
                    return (
                      <div key={dateStr} className="px-1.5 py-3 flex items-center justify-center">
                        <span className="text-warm-gray-light text-lg">·</span>
                      </div>
                    );
                  }
                  const isPacked = sel.selection_type === 'packed';
                  return (
                    <div key={dateStr} className="px-1.5 py-3 flex items-center justify-center">
                      {isPacked ? (
                        <div className="text-center w-full px-1.5 py-2 rounded-lg text-[11px] font-body leading-tight bg-amber text-white shadow-sm ring-2 ring-amber-dark/20">
                          <span className="block text-base mb-0.5">📦</span>
                          <span className="line-clamp-2 font-display font-semibold">
                            {sel.selection_value}
                          </span>
                        </div>
                      ) : (
                        <div className="text-center w-full px-1.5 py-1.5 rounded-lg text-[11px] font-body leading-tight bg-cream-dark/40 text-warm-gray">
                          <span className="line-clamp-2">{sel.selection_value}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
