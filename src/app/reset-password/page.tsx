'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<'idle' | 'exchanging' | 'ready' | 'saving' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      setStatus('error');
      setMessage('Invalid or expired reset link. Please request a new one.');
      return;
    }
    setStatus('exchanging');
    const supabase = createClient();
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setStatus('error');
        setMessage('This link has expired or already been used. Please request a new one.');
      } else {
        setStatus('ready');
      }
    });
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setMessage('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setMessage('Passwords do not match.');
      return;
    }
    setStatus('saving');
    setMessage('');
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setStatus('ready');
      setMessage(error.message);
    } else {
      setStatus('done');
    }
  };

  return (
    <div className="linen-bg min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-4xl">🍱</span>
          <h1 className="font-display text-3xl font-bold text-foreground mt-2">Savells Lunch</h1>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-cream-dark">
          {status === 'exchanging' && (
            <p className="font-body text-warm-gray text-center animate-pulse">Verifying link…</p>
          )}

          {status === 'error' && (
            <>
              <h2 className="font-display text-xl font-bold text-foreground mb-3">Link invalid</h2>
              <p className="font-body text-sm text-warm-gray mb-6">{message}</p>
              <button
                onClick={() => router.push('/login')}
                className="w-full py-3 rounded-xl bg-amber text-white font-display font-semibold"
              >
                Back to login
              </button>
            </>
          )}

          {(status === 'ready' || status === 'saving') && (
            <>
              <h2 className="font-display text-xl font-bold text-foreground mb-2">Set new password</h2>
              <p className="font-body text-sm text-warm-gray mb-6">Choose a strong password (8+ characters).</p>

              {message && (
                <p className="mb-4 text-sm font-body text-red-600 bg-red-50 px-4 py-3 rounded-xl">{message}</p>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block">
                  <span className="font-body text-sm font-medium text-warm-gray block mb-1.5">New password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setMessage(''); }}
                    required
                    minLength={8}
                    className="w-full px-4 py-3 rounded-xl border border-cream-dark bg-cream font-body text-foreground focus:outline-none focus:ring-2 focus:ring-amber focus:border-transparent"
                    placeholder="At least 8 characters"
                  />
                </label>
                <label className="block">
                  <span className="font-body text-sm font-medium text-warm-gray block mb-1.5">Confirm password</span>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => { setConfirm(e.target.value); setMessage(''); }}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-cream-dark bg-cream font-body text-foreground focus:outline-none focus:ring-2 focus:ring-amber focus:border-transparent"
                    placeholder="Repeat password"
                  />
                </label>
                <button
                  type="submit"
                  disabled={status === 'saving'}
                  className="w-full py-3.5 rounded-xl bg-amber text-white font-display font-semibold text-lg disabled:opacity-50 flex items-center justify-center"
                >
                  {status === 'saving' ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : 'Update password'}
                </button>
              </form>
            </>
          )}

          {status === 'done' && (
            <>
              <div className="text-center mb-6">
                <span className="text-4xl">✅</span>
                <h2 className="font-display text-xl font-bold text-foreground mt-3 mb-2">Password updated!</h2>
                <p className="font-body text-sm text-warm-gray">You can now sign in with your new password.</p>
              </div>
              <button
                onClick={() => router.push('/login')}
                className="w-full py-3 rounded-xl bg-amber text-white font-display font-semibold"
              >
                Go to login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="linen-bg min-h-screen flex items-center justify-center">
        <div className="animate-pulse font-display text-2xl text-amber-dark">Loading…</div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
