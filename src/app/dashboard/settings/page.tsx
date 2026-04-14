'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import { useRouter } from 'next/navigation';
import { sortKidsByAge, SCHOOLS } from '@/lib/constants';
import { School, Profile } from '@/lib/types';

interface ParentRow {
  id: string;
  name: string;
  email: string | null;
  avatar_emoji: string;
  avatar_color: string;
  isPrimary: boolean;
}

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

  const childProfiles = sortKidsByAge(profiles.filter((p) => p.role === 'child'));

  return (
    <div>
      <h2 className="font-display font-bold text-2xl text-foreground mb-6">Settings</h2>

      <ParentsSection currentProfileId={user?.profileId} />

      <ChangePasswordSection />

      <SchoolAssignmentSection childProfiles={childProfiles} />

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
                emoji={child.avatar_emoji || config?.emoji || '👤'}
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

function ParentsSection({ currentProfileId }: { currentProfileId?: string }) {
  const [parents, setParents] = useState<ParentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/parents');
      const data = await res.json();
      if (res.ok) setParents(data.parents);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    setError('');
    if (!name.trim() || !email.trim()) {
      setError('Name and email required');
      return;
    }
    setAdding(true);
    try {
      const res = await fetch('/api/parents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          redirectTo: `${window.location.origin}/login`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setName(''); setEmail('');
      setShowAdd(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: string, parentName: string) => {
    if (!confirm(`Remove parent "${parentName}"? Their login will be deleted.`)) return;
    const res = await fetch(`/api/parents/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Failed to remove');
      return;
    }
    await load();
  };

  const currentParent = parents.find((p) => p.id === currentProfileId);
  const isPrimaryUser = !!currentParent?.isPrimary;

  return (
    <div className="bg-white rounded-2xl border border-cream-dark p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-lg text-foreground">
          Parent Accounts
        </h3>
        {isPrimaryUser && !showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="px-3 py-1.5 rounded-lg bg-amber text-white font-display font-medium text-sm hover:bg-amber-dark transition-colors"
          >
            + Add parent
          </button>
        )}
      </div>
      <p className="font-body text-sm text-warm-gray mb-5">
        {isPrimaryUser
          ? 'Add another parent login to manage menus and selections together.'
          : 'Only the primary parent can add or remove other parent accounts.'}
      </p>

      {loading ? (
        <p className="font-body text-sm text-warm-gray">Loading…</p>
      ) : (
        <div className="space-y-2 mb-4">
          {parents.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-cream-dark">
              <span
                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                style={{ backgroundColor: p.avatar_color + '20' }}
              >
                {p.avatar_emoji}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-display font-medium text-sm text-foreground flex items-center gap-2">
                  {p.name}
                  {p.isPrimary && (
                    <span className="text-[10px] font-body uppercase tracking-wide bg-amber/15 text-amber-dark px-1.5 py-0.5 rounded">
                      primary
                    </span>
                  )}
                </p>
                <p className="font-body text-xs text-warm-gray truncate">{p.email || 'no login linked'}</p>
              </div>
              {isPrimaryUser && !p.isPrimary && (
                <button
                  onClick={() => handleRemove(p.id, p.name)}
                  className="text-xs font-body text-red-500 hover:text-red-700 px-2"
                >
                  Remove
                </button>
              )}
              {p.id === currentProfileId && (
                <span className="text-xs font-body text-warm-gray px-2">You</span>
              )}
            </div>
          ))}
        </div>
      )}

      {isPrimaryUser && showAdd && (
        <div className="border-t border-cream-dark pt-4 space-y-3">
          <p className="font-body text-xs text-warm-gray">
            They&apos;ll receive an email invitation to set their own password.
          </p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (e.g. Sarah)"
            className="w-full px-3 py-2 rounded-lg border border-cream-dark font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full px-3 py-2 rounded-lg border border-cream-dark font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber"
          />
          {error && <p className="text-red-500 text-xs font-body">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={adding}
              className="flex-1 px-4 py-2 rounded-lg bg-amber text-white font-display font-medium text-sm disabled:opacity-40"
            >
              {adding ? 'Sending…' : 'Send invitation'}
            </button>
            <button
              onClick={() => { setShowAdd(false); setError(''); setName(''); setEmail(''); }}
              className="px-4 py-2 rounded-lg border border-cream-dark font-display font-medium text-sm text-warm-gray"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ChangePasswordSection() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    if (next.length < 8) { setMessage('New password must be at least 8 characters.'); setStatus('error'); return; }
    if (next !== confirm) { setMessage('Passwords do not match.'); setStatus('error'); return; }

    setStatus('saving');
    try {
      // Re-authenticate with current password first
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('Not signed in');

      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
      if (signInErr) throw new Error('Current password is incorrect.');

      const { error: updateErr } = await supabase.auth.updateUser({ password: next });
      if (updateErr) throw updateErr;

      setStatus('success');
      setCurrent(''); setNext(''); setConfirm('');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to update password.');
      setStatus('error');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-cream-dark p-6 mb-6">
      <h3 className="font-display font-semibold text-lg text-foreground mb-2">Change password</h3>
      <p className="font-body text-sm text-warm-gray mb-5">Update your parent login password.</p>

      {(status === 'error') && message && (
        <p className="mb-4 text-sm font-body text-red-600 bg-red-50 px-4 py-3 rounded-xl">{message}</p>
      )}
      {status === 'success' && (
        <p className="mb-4 text-sm font-body text-green-700 bg-green-50 px-4 py-3 rounded-xl">Password updated successfully.</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
        <input
          type="password"
          value={current}
          onChange={(e) => { setCurrent(e.target.value); setStatus('idle'); setMessage(''); }}
          placeholder="Current password"
          required
          className="w-full px-3 py-2 rounded-lg border border-cream-dark font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber"
        />
        <input
          type="password"
          value={next}
          onChange={(e) => { setNext(e.target.value); setStatus('idle'); setMessage(''); }}
          placeholder="New password (8+ characters)"
          required
          className="w-full px-3 py-2 rounded-lg border border-cream-dark font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber"
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => { setConfirm(e.target.value); setStatus('idle'); setMessage(''); }}
          placeholder="Confirm new password"
          required
          className="w-full px-3 py-2 rounded-lg border border-cream-dark font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber"
        />
        <button
          type="submit"
          disabled={status === 'saving'}
          className="px-5 py-2 rounded-lg bg-amber text-white font-display font-medium text-sm disabled:opacity-40"
        >
          {status === 'saving' ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}

function SchoolAssignmentSection({ childProfiles }: { childProfiles: Profile[] }) {
  const { refresh } = useAuth();
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const handleChange = async (profileId: string, school: School) => {
    setSaving(profileId);
    try {
      const res = await fetch(`/api/children/${profileId}/school`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || 'Failed to update school');
        return;
      }
      await refresh();
      setSaved(profileId);
      setTimeout(() => setSaved(null), 2000);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-cream-dark p-6 mb-6">
      <h3 className="font-display font-semibold text-lg text-foreground mb-2">School assignments</h3>
      <p className="font-body text-sm text-warm-gray mb-5">
        Change which school each child attends. This updates their lunch menu.
      </p>
      <div className="space-y-3">
        {childProfiles.map((child) => (
          <div key={child.id} className="flex items-center gap-3 p-3 rounded-xl border border-cream-dark">
            <span
              className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
              style={{ backgroundColor: child.avatar_color + '20' }}
            >
              {child.avatar_emoji}
            </span>
            <span className="font-display font-medium text-sm text-foreground w-20 shrink-0">
              {child.name}
            </span>
            <select
              value={child.school || ''}
              onChange={(e) => handleChange(child.id, e.target.value as School)}
              disabled={saving === child.id}
              className="flex-1 px-3 py-2 rounded-lg border border-cream-dark font-body text-sm focus:outline-none focus:ring-2 focus:ring-amber bg-white disabled:opacity-50"
            >
              {SCHOOLS.map((s) => (
                <option key={s.slug} value={s.slug}>{s.label}</option>
              ))}
            </select>
            <span className="text-xs font-body w-10 text-center">
              {saving === child.id ? (
                <span className="text-warm-gray">…</span>
              ) : saved === child.id ? (
                <span className="text-green-600">✓</span>
              ) : null}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
