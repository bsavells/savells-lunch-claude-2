'use client';

import { useAuth } from '@/lib/context/auth-context';
import { useWeekNavigation, useMenu } from '@/lib/hooks/use-menu';
import { useSelections } from '@/lib/hooks/use-selections';
import { format, addDays, isToday, isBefore, startOfDay } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DayMenu, School } from '@/lib/types';
import SelectionModal from '@/components/selection-modal';

const KIDS_CONFIG: { name: string; color: string }[] = [
  { name: 'Patrick', color: '#ef4444' },
  { name: 'Bridget', color: '#ec4899' },
  { name: 'Michael', color: '#f97316' },
  { name: 'Blaise', color: '#8b5cf6' },
  { name: 'Leo', color: '#10b981' },
  { name: 'George', color: '#06b6d4' },
];

export default function MyWeekPage() {
  const { user, profiles } = useAuth();
  const router = useRouter();
  const { weekStart, prevWeek, nextWeek, goToCurrentWeek } = useWeekNavigation();

  const myProfile = profiles.find((p) => p.id === user?.profileId);
  const mySchool = myProfile?.school as School | null ?? null;
  const kidConfig = KIDS_CONFIG.find((k) => k.name === myProfile?.name);
  const accentColor = kidConfig?.color || myProfile?.avatar_color || '#d97706';

  const { menu } = useMenu(mySchool, weekStart);
  const { selections, saveSelection, deleteSelection, getSelection, loading } = useSelections(
    weekStart,
    user?.profileId
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState('');
  const [modalMenu, setModalMenu] = useState<DayMenu | null>(null);

  useEffect(() => {
    if (user && user.role !== 'child') {
      router.replace('/dashboard/overview');
    }
  }, [user, router]);

  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const date = addDays(weekStart, i);
    return {
      date,
      dateStr: format(date, 'yyyy-MM-dd'),
      dayName: format(date, 'EEEE'),
      dayShort: format(date, 'EEE'),
      dayNum: format(date, 'MMM d'),
    };
  });

  const packedCount = selections.filter((s) => s.selection_type === 'packed').length;
  const schoolCount = selections.filter((s) => s.selection_type === 'entree').length;
  const unsetCount = 5 - selections.length;

  const openModal = (dateStr: string, dayMenu: DayMenu | undefined) => {
    setModalDate(dateStr);
    setModalMenu(dayMenu || null);
    setModalOpen(true);
  };

  if (!myProfile) return null;

  return (
    <div>
      {/* Week navigation */}
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

      {/* Stats */}
      <div className="flex gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-cream-dark px-4 py-3 flex-1 text-center">
          <p className="font-display text-2xl font-bold" style={{ color: accentColor }}>{schoolCount}</p>
          <p className="font-body text-xs text-warm-gray">School lunch</p>
        </div>
        <div className="bg-white rounded-2xl border border-cream-dark px-4 py-3 flex-1 text-center">
          <p className="font-display text-2xl font-bold text-amber-dark">{packedCount}</p>
          <p className="font-body text-xs text-warm-gray">Packed</p>
        </div>
        <div className="bg-white rounded-2xl border border-cream-dark px-4 py-3 flex-1 text-center">
          <p className="font-display text-2xl font-bold text-warm-gray-light">{unsetCount}</p>
          <p className="font-body text-xs text-warm-gray">Not chosen</p>
        </div>
      </div>

      {/* Day cards */}
      {loading ? (
        <div className="space-y-3">
          {[0,1,2,3,4].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-cream-dark p-4 animate-pulse h-20" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {weekDays.map(({ date, dateStr, dayName, dayShort, dayNum }) => {
            const today = isToday(date);
            const past = isBefore(startOfDay(date), startOfDay(new Date()));
            const sel = getSelection(dateStr);
            const dayMenu = menu?.[dateStr];
            const isPacked = sel?.selection_type === 'packed';
            const isSchool = sel?.selection_type === 'entree';

            return (
              <button
                key={dateStr}
                onClick={() => openModal(dateStr, dayMenu)}
                className={`w-full text-left bg-white rounded-2xl border transition-all hover:shadow-sm active:scale-[0.99] ${
                  today
                    ? 'border-amber shadow-sm ring-1 ring-amber/20'
                    : past
                      ? 'border-cream-dark opacity-60'
                      : 'border-cream-dark hover:border-warm-gray-light'
                }`}
              >
                <div className="flex items-center gap-4 px-5 py-4">
                  {/* Day label */}
                  <div className="w-14 shrink-0">
                    <p className={`font-display font-bold text-base ${today ? 'text-amber-dark' : 'text-foreground'}`}>
                      {dayShort}
                    </p>
                    <p className="font-body text-xs text-warm-gray">{dayNum}</p>
                    {today && (
                      <span className="inline-block bg-amber text-white text-[9px] font-display font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide mt-0.5">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Selection */}
                  <div className="flex-1 min-w-0">
                    {isPacked && (
                      <div className="flex items-center gap-2">
                        <span className="text-xl">📦</span>
                        <div>
                          <p className="font-display font-semibold text-sm text-foreground">Packed lunch</p>
                          <p className="font-body text-xs text-warm-gray truncate">{sel!.selection_value}</p>
                        </div>
                      </div>
                    )}
                    {isSchool && (
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🍽️</span>
                        <div>
                          <p className="font-display font-semibold text-sm text-foreground">School lunch</p>
                          <p className="font-body text-xs text-warm-gray truncate">{sel!.selection_value}</p>
                        </div>
                      </div>
                    )}
                    {!sel && (
                      <p className="font-body text-sm text-warm-gray-light italic">
                        {past ? 'No choice made' : 'Tap to choose'}
                      </p>
                    )}
                  </div>

                  {/* Status badge */}
                  <div className="shrink-0">
                    {isPacked && (
                      <span className="text-xs font-display font-semibold px-2.5 py-1 rounded-full bg-amber text-white">
                        Packed
                      </span>
                    )}
                    {isSchool && (
                      <span
                        className="text-xs font-display font-semibold px-2.5 py-1 rounded-full text-white"
                        style={{ backgroundColor: accentColor }}
                      >
                        Buying
                      </span>
                    )}
                    {!sel && !past && (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-warm-gray-light">
                        <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Selection Modal */}
      {modalOpen && myProfile && (
        <SelectionModal
          child={myProfile}
          date={modalDate}
          dayMenu={modalMenu}
          currentSelection={getSelection(modalDate)}
          onSave={async (type, value) => {
            await saveSelection(myProfile.id, modalDate, type, value);
            setModalOpen(false);
          }}
          onDelete={async () => {
            await deleteSelection(myProfile.id, modalDate);
            setModalOpen(false);
          }}
          onClose={() => setModalOpen(false)}
          kidConfig={kidConfig ? { ...kidConfig, emoji: myProfile.avatar_emoji } : undefined}
        />
      )}
    </div>
  );
}
