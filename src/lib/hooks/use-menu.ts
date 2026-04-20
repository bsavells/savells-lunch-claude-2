'use client';

import { useState, useEffect, useCallback } from 'react';
import { WeekMenu, School } from '../types';
import { format, startOfWeek, addWeeks } from 'date-fns';

export function useMenu(school: School | null, weekStart: Date) {
  const [menu, setMenu] = useState<WeekMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const monday = format(startOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const fetchMenu = useCallback(async () => {
    if (!school) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/menu/${school}?date=${monday}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load menu');
      setMenu(data.menu);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load menu');
    } finally {
      setLoading(false);
    }
  }, [school, monday]);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  return { menu, loading, error, refetch: fetchMenu };
}

function getDefaultWeekStart(): Date {
  const now = new Date();
  const isFriday = now.getDay() === 5;
  const isPastCutoff = now.getHours() >= 15; // 3 PM
  const base = isFriday && isPastCutoff ? addWeeks(now, 1) : now;
  return startOfWeek(base, { weekStartsOn: 1 });
}

export function useWeekNavigation() {
  const [weekStart, setWeekStart] = useState(getDefaultWeekStart);

  const prevWeek = () => setWeekStart((w) => addWeeks(w, -1));
  const nextWeek = () => setWeekStart((w) => addWeeks(w, 1));
  const goToCurrentWeek = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  return { weekStart, prevWeek, nextWeek, goToCurrentWeek };
}
