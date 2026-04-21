'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import { useMenu, useWeekNavigation } from '@/lib/hooks/use-menu';
import { useSelections } from '@/lib/hooks/use-selections';
import { format, addDays, isToday, isBefore, startOfDay } from 'date-fns';
import { School, Profile, DayMenu } from '@/lib/types';
import { SCHOOL_MAP, sortKidsByAge } from '@/lib/constants';
import SelectionModal from '@/components/selection-modal';

const KIDS_CONFIG: { name: string; emoji: string; color: string }[] = [
  { name: 'Patrick', emoji: '🏀', color: '#ef4444' },
  { name: 'Bridget', emoji: '🎨', color: '#ec4899' },
  { name: 'Michael', emoji: '⚡', color: '#f97316' },
  { name: 'Blaise', emoji: '🚀', color: '#8b5cf6' },
  { name: 'Leo', emoji: '🦁', color: '#10b981' },
  { name: 'George', emoji: '🌟', color: '#06b6d4' },
];

export default function MenuPage() {
  const { user, profiles, loading: authLoading } = useAuth();
  const { weekStart, prevWeek, nextWeek, goToCurrentWeek } = useWeekNavigation();

  // Parent: select which child to view; Kid: always themselves
  const childProfiles = sortKidsByAge(profiles.filter((p) => p.role === 'child'));
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  // Determine the active child profile
  const activeChild: Profile | undefined =
    user?.role === 'child'
      ? profiles.find((p) => p.id === user.profileId)
      : selectedChildId
        ? profiles.find((p) => p.id === selectedChildId)
        : undefined;

  const activeSchool: School | null = activeChild?.school as School | null ?? null;

  // For parent: if viewing both schools, fetch both
  const [viewSchool, setViewSchool] = useState<School | 'all'>('all');
  const effectiveSchool = user?.role === 'child' ? activeSchool : (viewSchool === 'all' ? 'boles-jhs' : viewSchool);

  const { menu: bolesMenu, loading: bolesLoading } = useMenu('boles-jhs', weekStart);
  const { menu: mooreMenu, loading: mooreLoading } = useMenu('moore-elementary-school', weekStart);
  const { menu: martinMenu, loading: martinLoading } = useMenu('martin-hs', weekStart);

  const { selections, saveSelection, deleteSelection, getSelection } = useSelections(
    weekStart,
    user?.role === 'child' ? user.profileId : undefined
  );

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState('');
  const [modalChild, setModalChild] = useState<Profile | null>(null);
  const [modalMenu, setModalMenu] = useState<DayMenu | null>(null);

  const profilesNotReady = profiles.length === 0;
  const loading = authLoading || profilesNotReady || bolesLoading || mooreLoading || martinLoading;

  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const date = addDays(weekStart, i);
    return { date, dateStr: format(date, 'yyyy-MM-dd'), dayName: format(date, 'EEE'), dayNum: format(date, 'MMM d') };
  });

  const openSelection = (dateStr: string, child: Profile, dayMenu: DayMenu | undefined) => {
    setModalDate(dateStr);
    setModalChild(child);
    setModalMenu(dayMenu || null);
    setModalOpen(true);
  };

  const getKidConfig = (name: string) => KIDS_CONFIG.find((k) => k.name === name);

  const getMenuForSchool = (school: string | null, dateStr: string): DayMenu | undefined => {
    if (school === 'boles-jhs') return bolesMenu?.[dateStr];
    if (school === 'moore-elementary-school') return mooreMenu?.[dateStr];
    if (school === 'martin-hs') return martinMenu?.[dateStr];
    return undefined;
  };

  return (
    <div>
      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={prevWeek}
          className="p-2 rounded-xl hover:bg-cream-dark transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 15L7 10L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div className="text-center">
          <h2 className="font-display font-bold text-xl text-foreground">
            Week of {format(weekStart, 'MMMM d')}
          </h2>
          <button
            onClick={goToCurrentWeek}
            className="text-amber-dark font-body text-xs hover:underline mt-0.5"
          >
            Go to this week
          </button>
        </div>

        <button
          onClick={nextWeek}
          className="p-2 rounded-xl hover:bg-cream-dark transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M8 5L13 10L8 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Parent: Child selector */}
      {user?.role === 'parent' && (
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {childProfiles.map((child) => {
              const config = getKidConfig(child.name);
              const isSelected = selectedChildId === child.id;
              return (
                <button
                  key={child.id}
                  onClick={() => setSelectedChildId(isSelected ? null : child.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl font-display text-sm font-medium whitespace-nowrap transition-all ${
                    isSelected
                      ? 'text-white shadow-md scale-[1.02]'
                      : 'bg-white text-foreground border border-cream-dark hover:border-warm-gray-light'
                  }`}
                  style={isSelected ? { backgroundColor: config?.color || child.avatar_color } : undefined}
                >
                  <span className="text-base">{child.avatar_emoji || config?.emoji}</span>
                  {child.name}
                </button>
              );
            })}
          </div>
          {!selectedChildId && (
            <p className="text-warm-gray font-body text-sm mt-2">
              Select a child to choose their meals, or view all menus below
            </p>
          )}
        </div>
      )}

      {/* Day Cards */}
      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-cream-dark animate-pulse">
              <div className="h-6 bg-cream-dark rounded w-32 mb-4" />
              <div className="h-4 bg-cream-dark rounded w-48 mb-2" />
              <div className="h-4 bg-cream-dark rounded w-40" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {weekDays.map(({ date, dateStr, dayName, dayNum }) => {
            const today = isToday(date);
            const past = isBefore(startOfDay(date), startOfDay(new Date()));

            // Determine which menus to show
            const showBoles = user?.role === 'parent'
              ? (!selectedChildId || activeChild?.school === 'boles-jhs')
              : activeSchool === 'boles-jhs';
            const showMoore = user?.role === 'parent'
              ? (!selectedChildId || activeChild?.school === 'moore-elementary-school')
              : activeSchool === 'moore-elementary-school';
            const showMartin = user?.role === 'parent'
              ? (!selectedChildId || activeChild?.school === 'martin-hs')
              : activeSchool === 'martin-hs';

            const bolesDay = bolesMenu?.[dateStr];
            const mooreDay = mooreMenu?.[dateStr];
            const martinDay = martinMenu?.[dateStr];
            const shownCount = [showBoles && bolesDay, showMoore && mooreDay, showMartin && martinDay].filter(Boolean).length;

            return (
              <div
                key={dateStr}
                className={`bg-white rounded-2xl border transition-all ${
                  today
                    ? 'border-amber shadow-sm ring-1 ring-amber/20'
                    : past
                      ? 'border-cream-dark opacity-75'
                      : 'border-cream-dark'
                }`}
              >
                {/* Day header */}
                <div className={`px-5 py-3 flex items-center justify-between border-b ${
                  today ? 'border-amber/20 bg-amber/5' : 'border-cream-dark'
                }`}>
                  <div className="flex items-center gap-3">
                    <span className={`font-display font-bold text-lg ${today ? 'text-amber-dark' : 'text-foreground'}`}>
                      {dayName}
                    </span>
                    <span className="font-body text-warm-gray text-sm">{dayNum}</span>
                    {today && (
                      <span className="bg-amber text-white text-[10px] font-display font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide">
                        Today
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5">
                  {/* Show menus by school */}
                  {showBoles && bolesDay && (
                    <SchoolMenuSection
                      schoolLabel="Boles JHS"
                      dayMenu={bolesDay}
                      showLabel={shownCount > 1}
                      childProfiles={
                        user?.role === 'parent'
                          ? (selectedChildId && activeChild
                              ? [activeChild]
                              : childProfiles.filter((c) => c.school === 'boles-jhs'))
                          : activeChild ? [activeChild] : []
                      }
                      dateStr={dateStr}
                      getSelection={getSelection}
                      getKidConfig={getKidConfig}
                      onSelect={openSelection}
                    />
                  )}

                  {showBoles && bolesDay && showMoore && mooreDay && (
                    <hr className="my-4 border-cream-dark" />
                  )}

                  {showMoore && mooreDay && (
                    <SchoolMenuSection
                      schoolLabel="Moore Elementary"
                      dayMenu={mooreDay}
                      showLabel={shownCount > 1}
                      childProfiles={
                        user?.role === 'parent'
                          ? (selectedChildId && activeChild
                              ? [activeChild]
                              : childProfiles.filter((c) => c.school === 'moore-elementary-school'))
                          : activeChild ? [activeChild] : []
                      }
                      dateStr={dateStr}
                      getSelection={getSelection}
                      getKidConfig={getKidConfig}
                      onSelect={openSelection}
                    />
                  )}

                  {(showMoore && mooreDay || showBoles && bolesDay) && showMartin && martinDay && (
                    <hr className="my-4 border-cream-dark" />
                  )}

                  {showMartin && martinDay && (
                    <SchoolMenuSection
                      schoolLabel="Martin High School"
                      dayMenu={martinDay}
                      showLabel={shownCount > 1}
                      childProfiles={
                        user?.role === 'parent'
                          ? (selectedChildId && activeChild
                              ? [activeChild]
                              : childProfiles.filter((c) => c.school === 'martin-hs'))
                          : activeChild ? [activeChild] : []
                      }
                      dateStr={dateStr}
                      getSelection={getSelection}
                      getKidConfig={getKidConfig}
                      onSelect={openSelection}
                    />
                  )}

                  {!bolesDay && !mooreDay && !martinDay && (
                    <div className="flex items-center gap-3 py-1">
                      <span className="text-2xl">📋</span>
                      <div>
                        <p className="font-display font-semibold text-sm text-foreground">
                          Menu not published yet
                        </p>
                        <p className="font-body text-xs text-warm-gray mt-0.5">
                          Arlington ISD usually posts menus by Thursday — check back then.
                          You can still log a packed lunch.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selection Modal */}
      {modalOpen && modalChild && (
        <SelectionModal
          child={modalChild}
          date={modalDate}
          dayMenu={modalMenu}
          currentSelection={getSelection(modalDate, modalChild.id)}
          onSave={async (type, value) => {
            await saveSelection(modalChild.id, modalDate, type, value);
            setModalOpen(false);
          }}
          onDelete={async () => {
            await deleteSelection(modalChild.id, modalDate);
            setModalOpen(false);
          }}
          onClose={() => setModalOpen(false)}
          kidConfig={getKidConfig(modalChild.name)}
        />
      )}
    </div>
  );
}

function SchoolMenuSection({
  schoolLabel,
  dayMenu,
  showLabel,
  childProfiles,
  dateStr,
  getSelection,
  getKidConfig,
  onSelect,
}: {
  schoolLabel: string;
  dayMenu: DayMenu;
  showLabel: boolean;
  childProfiles: Profile[];
  dateStr: string;
  getSelection: (date: string, pid?: string) => ReturnType<ReturnType<typeof import('@/lib/hooks/use-selections').useSelections>['getSelection']>;
  getKidConfig: (name: string) => { name: string; emoji: string; color: string } | undefined;
  onSelect: (date: string, child: Profile, menu: DayMenu | undefined) => void;
}) {
  return (
    <div>
      {showLabel && (
        <h3 className="font-display font-semibold text-sm text-warm-gray mb-3 uppercase tracking-wide">
          {schoolLabel}
        </h3>
      )}

      {/* Menu items */}
      <div className="mb-3">
        {dayMenu.entrees.length === 0 ? (
          <p className="text-warm-gray font-body text-sm italic">
            Menu not published yet — you can still pack a lunch
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {dayMenu.entrees.map((item) => (
                <span
                  key={item.id}
                  className="inline-block bg-amber/10 text-amber-dark px-2.5 py-1 rounded-lg font-body text-sm"
                >
                  {item.name}
                </span>
              ))}
            </div>
            {dayMenu.sides.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {dayMenu.sides.map((item) => (
                  <span
                    key={item.id}
                    className="inline-block text-warm-gray px-2 py-0.5 rounded font-body text-xs bg-cream-dark"
                  >
                    {item.name}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Child selections */}
      {childProfiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {childProfiles.map((child) => {
            const selection = getSelection(dateStr, child.id);
            const config = getKidConfig(child.name);
            return (
              <button
                key={child.id}
                onClick={() => onSelect(dateStr, child, dayMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all hover:shadow-sm group text-left"
                style={{
                  borderColor: selection ? (config?.color || child.avatar_color) + '40' : undefined,
                  backgroundColor: selection ? (config?.color || child.avatar_color) + '08' : undefined,
                }}
              >
                <span className="text-sm">{child.avatar_emoji || config?.emoji}</span>
                <span className="font-display text-xs font-medium text-foreground">
                  {child.name}
                </span>
                {selection ? (
                  <span
                    className="text-[10px] font-body max-w-[120px] truncate"
                    style={{ color: config?.color || child.avatar_color }}
                  >
                    {selection.selection_type === 'packed' ? '📦 ' : ''}{selection.selection_value}
                  </span>
                ) : (
                  <span className="text-[10px] text-warm-gray-light font-body group-hover:text-warm-gray">
                    choose...
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
