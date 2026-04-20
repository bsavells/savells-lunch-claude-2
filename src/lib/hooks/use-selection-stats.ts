'use client';

import { useState, useEffect } from 'react';
import { MealSelection } from '../types';

export interface SlotPrediction {
  profile_id: string;
  weekday: number; // 1–5 (Mon–Fri)
  predicted_type: 'packed' | 'entree';
  confidence: number; // 0–100 integer
  total_samples: number;
}

export interface SelectionStatsResult {
  predictions: Record<string, SlotPrediction>;
  loading: boolean;
  error: string | null;
}

/** Look up the prediction for a given profile + weekday (1–5). */
export function getPrediction(
  predictions: Record<string, SlotPrediction>,
  profileId: string,
  weekday: number
): SlotPrediction | null {
  return predictions[`${profileId}::${weekday}`] ?? null;
}

/**
 * For all current-week selections that have a matching prediction,
 * count how many the prediction got right.
 * Returns null when no predictions overlap with filled selections.
 */
export function computeWeekAccuracy(
  predictions: Record<string, SlotPrediction>,
  selections: MealSelection[]
): { correct: number; total: number } | null {
  let correct = 0;
  let total = 0;

  for (const sel of selections) {
    const [year, month, day] = sel.date.split('-').map(Number);
    const weekday = new Date(year, month - 1, day).getDay();
    const prediction = getPrediction(predictions, sel.profile_id, weekday);
    if (!prediction) continue;

    total++;
    if (prediction.predicted_type === sel.selection_type) correct++;
  }

  return total === 0 ? null : { correct, total };
}

/** Fetches the prediction model once per session. */
export function useSelectionStats(): SelectionStatsResult {
  const [predictions, setPredictions] = useState<Record<string, SlotPrediction>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/selections/stats')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) throw new Error(data.error);
        setPredictions(data.predictions ?? {});
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load stats');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { predictions, loading, error };
}
