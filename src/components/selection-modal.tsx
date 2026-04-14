'use client';

import { useState } from 'react';
import { Profile, DayMenu, MealSelection, MenuItem } from '@/lib/types';
import { format, parseISO } from 'date-fns';

interface SelectionModalProps {
  child: Profile;
  date: string;
  dayMenu: DayMenu | null;
  currentSelection?: MealSelection;
  onSave: (type: 'entree' | 'packed', value: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
  kidConfig?: { name: string; emoji: string; color: string };
}

export default function SelectionModal({
  child,
  date,
  dayMenu,
  currentSelection,
  onSave,
  onDelete,
  onClose,
  kidConfig,
}: SelectionModalProps) {
  const [mode, setMode] = useState<'entree' | 'packed'>(
    currentSelection?.selection_type ||
      (dayMenu && dayMenu.entrees.length === 0 ? 'packed' : 'entree')
  );
  const [selectedEntree, setSelectedEntree] = useState(
    currentSelection?.selection_type === 'entree' ? currentSelection.selection_value : ''
  );
  const [packedText, setPackedText] = useState(
    currentSelection?.selection_type === 'packed' ? currentSelection.selection_value : ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const color = kidConfig?.color || child.avatar_color;
  const emoji = kidConfig?.emoji || child.avatar_emoji;

  const handleSave = async () => {
    const value = mode === 'entree' ? selectedEntree : packedText.trim();
    if (!value) {
      setError(mode === 'entree' ? 'Pick an entree' : 'Describe the packed lunch');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(mode, value);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-3xl sm:rounded-t-3xl border-b border-cream-dark px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <span
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ backgroundColor: color + '20' }}
            >
              {emoji}
            </span>
            <div>
              <h3 className="font-display font-bold text-foreground">{child.name}</h3>
              <p className="font-body text-xs text-warm-gray">
                {format(parseISO(date), 'EEEE, MMMM d')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-cream-dark transition-colors text-warm-gray"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="p-5">
          {/* Mode toggle */}
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => { setMode('entree'); setError(''); }}
              className={`flex-1 py-2.5 rounded-xl font-display font-medium text-sm transition-all ${
                mode === 'entree'
                  ? 'text-white shadow-sm'
                  : 'bg-cream-dark text-warm-gray'
              }`}
              style={mode === 'entree' ? { backgroundColor: color } : undefined}
            >
              🍽 School Lunch
            </button>
            <button
              onClick={() => { setMode('packed'); setError(''); }}
              className={`flex-1 py-2.5 rounded-xl font-display font-medium text-sm transition-all ${
                mode === 'packed'
                  ? 'text-white shadow-sm'
                  : 'bg-cream-dark text-warm-gray'
              }`}
              style={mode === 'packed' ? { backgroundColor: color } : undefined}
            >
              📦 Packed Lunch
            </button>
          </div>

          {/* Entree selection */}
          {mode === 'entree' && dayMenu && (
            <div className="space-y-2">
              {dayMenu.entrees.length === 0 ? (
                <p className="text-warm-gray font-body text-sm italic text-center py-4">
                  No entrees listed for this day
                </p>
              ) : (
                dayMenu.entrees.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setSelectedEntree(item.name); setError(''); }}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all font-body ${
                      selectedEntree === item.name
                        ? 'border-current shadow-sm'
                        : 'border-cream-dark hover:border-warm-gray-light'
                    }`}
                    style={selectedEntree === item.name ? { borderColor: color, backgroundColor: color + '08' } : undefined}
                  >
                    <span className="font-medium text-foreground">{item.name}</span>
                  </button>
                ))
              )}

              {dayMenu.sides.length > 0 && (
                <div className="mt-4 pt-4 border-t border-cream-dark">
                  <p className="font-display text-xs font-medium text-warm-gray mb-2 uppercase tracking-wide">
                    Sides included
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {dayMenu.sides.map((item) => (
                      <span
                        key={item.id}
                        className="bg-cream-dark text-warm-gray px-2.5 py-1 rounded-lg font-body text-xs"
                      >
                        {item.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === 'entree' && !dayMenu && (
            <p className="text-warm-gray font-body text-sm italic text-center py-8">
              Menu not available for this day
            </p>
          )}

          {/* Packed lunch */}
          {mode === 'packed' && (
            <div>
              <label className="block">
                <span className="font-body text-sm font-medium text-warm-gray mb-1.5 block">
                  What are you packing?
                </span>
                <input
                  type="text"
                  value={packedText}
                  onChange={(e) => { setPackedText(e.target.value); setError(''); }}
                  placeholder="e.g. PB&J, apple, chips"
                  className="w-full px-4 py-3 rounded-xl border border-cream-dark bg-cream font-body text-foreground placeholder:text-warm-gray-light focus:outline-none focus:ring-2 focus:border-transparent transition-shadow"
                  style={{ '--tw-ring-color': color } as React.CSSProperties}
                  autoFocus
                />
              </label>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-red-500 font-body text-sm mt-3 bg-red-50 px-3 py-2 rounded-xl">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            {currentSelection && (
              <button
                onClick={onDelete}
                className="px-4 py-3 rounded-xl border border-red-200 text-red-500 font-display font-medium text-sm hover:bg-red-50 transition-colors"
              >
                Clear
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 rounded-xl text-white font-display font-semibold text-base transition-colors disabled:opacity-50 flex items-center justify-center"
              style={{ backgroundColor: color }}
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                currentSelection ? 'Update' : 'Save'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
