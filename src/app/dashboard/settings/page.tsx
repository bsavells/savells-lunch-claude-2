'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import { useRouter } from 'next/navigation';

const KIDS_CONFIG: { name: string; emoji: string; color: string }[] = [
  { name: 'Patrick', emoji: '🏀', color: '#ef4444' },
  { name: 'Bridget', emoji: '🎨', color: '#ec4899' },
  { name: 'Michael', emoji: '⚡', color: '#f97316' },
  { name: 'Blaise', emoji: '🚀', color: '#8b5cf6' },
  { name: 'Leo', emoji: '🦁', color: '#10b981' },
  { name: 'George', emoji: '🌟', color: '#06b6d4' },
];

export default function SettingsPage() {
  const { user, profiles } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== 'parent') {
      router.replace('/dashboard/menu');
    }
  }, [user, router]);

  const childProfiles = profiles.filter((p) => p.role === 'child');

  return (
    <div>
      <h2 className="font-display font-bold text-2xl text-foreground mb-6">Settings</h2>

      <div className="bg-white rounded-2xl border border-cream-dark p-6 mb-6">
        <h3 className="font-display font-semibold text-lg text-foreground mb-4">
          Manage Kid PINs
        </h3>
        <p className="font-body text-sm text-warm-gray mb-5">
          Reset or change PINs for each child. They can also change their own PIN from their settings.
        </p>

        <div className="space-y-3">
          {childProfiles.map((child) => {
            const config = KIDS_CONFIG.find((k) => k.name === child.name);
            return (
              <PinResetRow
                key={child.id}
                profileId={child.id}
                name={child.name}
                emoji={config?.emoji || child.avatar_emoji}
                color={config?.color || child.avatar_color}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PinResetRow({ profileId, name, emoji, color }: {
  profileId: string;
  name: string;
  emoji: string;
  color: string;
}) {
  const [newPin, setNewPin] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleReset = async () => {
    if (!newPin || newPin.length < 3) {
      setErrorMsg('PIN must be at least 3 digits');
      setStatus('error');
      return;
    }
    if (!/^\d+$/.test(newPin)) {
      setErrorMsg('PIN must be digits only');
      setStatus('error');
      return;
    }

    setStatus('saving');
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, newPin, parentOverride: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus('success');
      setNewPin('');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update PIN');
      setStatus('error');
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-cream-dark">
      <span
        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
        style={{ backgroundColor: color + '20' }}
      >
        {emoji}
      </span>
      <span className="font-display font-medium text-sm text-foreground w-20">{name}</span>

      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={newPin}
        onChange={(e) => {
          const val = e.target.value.replace(/\D/g, '').slice(0, 8);
          setNewPin(val);
          setStatus('idle');
          setErrorMsg('');
        }}
        placeholder="New PIN"
        className="flex-1 px-3 py-2 rounded-lg border border-cream-dark font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber focus:border-transparent"
      />

      <button
        onClick={handleReset}
        disabled={status === 'saving' || !newPin}
        className="px-4 py-2 rounded-lg font-display font-medium text-sm text-white transition-all disabled:opacity-40"
        style={{ backgroundColor: color }}
      >
        {status === 'saving' ? '...' : status === 'success' ? '✓' : 'Set'}
      </button>

      {status === 'error' && (
        <span className="text-red-500 text-xs font-body">{errorMsg}</span>
      )}
    </div>
  );
}
