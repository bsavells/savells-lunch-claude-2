'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import { useRouter } from 'next/navigation';

export default function ChangePinPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  if (!user || user.role !== 'child') {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPin.length < 3) {
      setError('New PIN must be at least 3 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setError('New PINs don\'t match');
      return;
    }
    if (!/^\d+$/.test(newPin)) {
      setError('PIN must be digits only');
      return;
    }

    setStatus('saving');
    try {
      const res = await fetch('/api/auth/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: user.profileId,
          currentPin,
          newPin,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus('success');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change PIN');
      setStatus('error');
    }
  };

  return (
    <div className="max-w-sm mx-auto">
      <h2 className="font-display font-bold text-2xl text-foreground mb-6">Change Your PIN</h2>

      {status === 'success' ? (
        <div className="bg-green-50 rounded-2xl p-6 text-center">
          <p className="font-display text-green-600 font-semibold text-lg mb-2">PIN Updated!</p>
          <p className="font-body text-sm text-green-700 mb-4">Use your new PIN next time you log in.</p>
          <button
            onClick={() => router.push('/dashboard/menu')}
            className="px-6 py-2.5 rounded-xl bg-amber text-white font-display font-medium"
          >
            Back to Menu
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-cream-dark p-6 space-y-4">
          <label className="block">
            <span className="font-body text-sm font-medium text-warm-gray mb-1 block">Current PIN</span>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
              className="w-full px-4 py-3 rounded-xl border border-cream-dark bg-cream font-body focus:outline-none focus:ring-2 focus:ring-amber"
              required
            />
          </label>

          <label className="block">
            <span className="font-body text-sm font-medium text-warm-gray mb-1 block">New PIN</span>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
              className="w-full px-4 py-3 rounded-xl border border-cream-dark bg-cream font-body focus:outline-none focus:ring-2 focus:ring-amber"
              required
              minLength={3}
            />
          </label>

          <label className="block">
            <span className="font-body text-sm font-medium text-warm-gray mb-1 block">Confirm New PIN</span>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
              className="w-full px-4 py-3 rounded-xl border border-cream-dark bg-cream font-body focus:outline-none focus:ring-2 focus:ring-amber"
              required
              minLength={3}
            />
          </label>

          {error && (
            <p className="text-red-500 font-body text-sm bg-red-50 px-3 py-2 rounded-xl">{error}</p>
          )}

          <button
            type="submit"
            disabled={status === 'saving'}
            className="w-full py-3 rounded-xl bg-amber text-white font-display font-semibold disabled:opacity-50"
          >
            {status === 'saving' ? 'Saving...' : 'Update PIN'}
          </button>
        </form>
      )}
    </div>
  );
}
