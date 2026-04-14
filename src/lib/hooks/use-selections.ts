'use client';

import { useState, useEffect, useCallback } from 'react';
import { MealSelection } from '../types';
import { format, addDays } from 'date-fns';

export function useSelections(weekStart: Date, profileId?: string) {
  const [selections, setSelections] = useState<MealSelection[]>([]);
  const [loading, setLoading] = useState(true);

  const monday = format(weekStart, 'yyyy-MM-dd');
  const friday = format(addDays(weekStart, 4), 'yyyy-MM-dd');

  const fetchSelections = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ start: monday, end: friday });
      if (profileId) params.set('profileId', profileId);
      const res = await fetch(`/api/selections?${params}`);
      const data = await res.json();
      setSelections(data.selections || []);
    } catch {
      setSelections([]);
    } finally {
      setLoading(false);
    }
  }, [monday, friday, profileId]);

  useEffect(() => {
    fetchSelections();
  }, [fetchSelections]);

  // Supabase Realtime: re-fetch when meal_selections changes
  useEffect(() => {
    let channel: ReturnType<Awaited<ReturnType<typeof import('../supabase/client').createClient>>['channel']> | null = null;

    async function subscribe() {
      const { createClient } = await import('../supabase/client');
      const supabase = createClient();
      channel = supabase
        .channel(`meal-selections-${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'meal_selections' }, () => {
          fetchSelections();
        })
        .subscribe();
    }

    subscribe();

    return () => {
      if (channel) {
        const cleanup = async () => {
          const { createClient } = await import('../supabase/client');
          const supabase = createClient();
          supabase.removeChannel(channel!);
        };
        cleanup();
      }
    };
  }, [fetchSelections]);

  const saveSelection = async (
    targetProfileId: string,
    date: string,
    selectionType: 'entree' | 'packed',
    selectionValue: string
  ) => {
    const res = await fetch('/api/selections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profileId: targetProfileId,
        date,
        selectionType,
        selectionValue,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to save');
    }
    await fetchSelections();
  };

  const deleteSelection = async (targetProfileId: string, date: string) => {
    const res = await fetch(
      `/api/selections?profileId=${targetProfileId}&date=${date}`,
      { method: 'DELETE' }
    );
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete');
    }
    await fetchSelections();
  };

  const getSelection = (date: string, pid?: string): MealSelection | undefined => {
    const targetId = pid || profileId;
    return selections.find((s) => s.date === date && s.profile_id === targetId);
  };

  return { selections, loading, saveSelection, deleteSelection, getSelection, refetch: fetchSelections };
}
