'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import { useRouter } from 'next/navigation';
import { AVATAR_CATEGORIES } from '@/lib/avatar-options';

export default function ChangeIconPage() {
  const { user, profiles, refresh } = useAuth();
  const router = useRouter();

  const myProfile = profiles.find((p) => p.id === user?.profileId);
  const [selected, setSelected] = useState<string>(myProfile?.avatar_emoji || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (myProfile?.avatar_emoji && !selected) {
      setSelected(myProfile.avatar_emoji);
    }
  }, [myProfile?.avatar_emoji, selected]);

  useEffect(() => {
    if (user && user.role !== 'child') {
      router.replace('/dashboard/menu');
    }
  }, [user, router]);

  const save = async (emoji: string) => {
    if (!user) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/auth/update-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: user.profileId, emoji }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSelected(emoji);
      setMessage('Saved!');
      await refresh();
      setTimeout(() => setMessage(''), 1500);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="font-display font-bold text-2xl text-foreground mb-2">Change your icon</h2>
      <p className="text-warm-gray font-body text-sm mb-6">
        Pick an icon that&apos;s all you. Tap to save.
      </p>

      {/* Current selection preview */}
      <div className="bg-white rounded-2xl border border-cream-dark p-5 mb-6 flex items-center gap-4">
        <span
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl"
          style={{ backgroundColor: (myProfile?.avatar_color || '#f3f4f6') + '20' }}
        >
          {selected || '❓'}
        </span>
        <div>
          <p className="font-display font-bold text-foreground text-lg">{myProfile?.name}</p>
          <p className="font-body text-xs text-warm-gray">
            {saving ? 'Saving…' : message || 'Your current icon'}
          </p>
        </div>
      </div>

      {/* Picker */}
      <div className="space-y-6">
        {AVATAR_CATEGORIES.map((cat) => (
          <div key={cat.label}>
            <h3 className="font-display font-semibold text-sm text-warm-gray mb-3 uppercase tracking-wide">
              {cat.label}
            </h3>
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
              {cat.emojis.map((emoji) => {
                const isSelected = selected === emoji;
                return (
                  <button
                    key={emoji}
                    onClick={() => save(emoji)}
                    disabled={saving}
                    className={`aspect-square rounded-xl text-2xl sm:text-3xl flex items-center justify-center transition-all disabled:opacity-50 ${
                      isSelected
                        ? 'bg-amber/15 ring-2 ring-amber scale-105 shadow-sm'
                        : 'bg-white border border-cream-dark hover:border-amber hover:scale-105'
                    }`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
