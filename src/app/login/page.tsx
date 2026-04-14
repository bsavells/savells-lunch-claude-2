'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/auth-context';

const KIDS_BASE: { name: string; emoji: string; color: string; school: string }[] = [
  { name: 'Patrick', emoji: '🏀', color: '#ef4444', school: 'Boles JHS' },
  { name: 'Bridget', emoji: '🎨', color: '#ec4899', school: 'Boles JHS' },
  { name: 'Michael', emoji: '⚡', color: '#f97316', school: 'Moore Elementary' },
  { name: 'Blaise', emoji: '🚀', color: '#8b5cf6', school: 'Moore Elementary' },
  { name: 'Leo', emoji: '🦁', color: '#10b981', school: 'Moore Elementary' },
  { name: 'George', emoji: '🌟', color: '#06b6d4', school: 'Moore Elementary' },
];

export default function LoginPage() {
  const [mode, setMode] = useState<'kids' | 'parent'>('kids');
  const [selectedKid, setSelectedKid] = useState<typeof KIDS_BASE[0] | null>(null);
  const [kids, setKids] = useState(KIDS_BASE);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shaking, setShaking] = useState(false);

  const { user, loading, login, pinLogin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !loading) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/profiles')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data.profiles) return;
        setKids((current) =>
          current.map((k) => {
            const p = data.profiles.find(
              (x: { name: string; avatar_emoji: string }) => x.name === k.name
            );
            return p?.avatar_emoji ? { ...k, emoji: p.avatar_emoji } : k;
          })
        );
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const handlePinDigit = (digit: string) => {
    if (pin.length >= 8) return;
    setPin(pin + digit);
    setError('');
  };

  const handlePinBackspace = () => {
    setPin((p) => p.slice(0, -1));
    setError('');
  };

  const submitPin = async (pinValue: string) => {
    if (!selectedKid) return;
    setIsSubmitting(true);
    setError('');
    try {
      await pinLogin(selectedKid.name, pinValue);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wrong PIN');
      setPin('');
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotStatus('sending');
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotStatus('sent');
  };

  const handleParentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="linen-bg min-h-screen flex items-center justify-center">
        <div className="animate-pulse font-display text-2xl text-amber-dark">Loading...</div>
      </div>
    );
  }

  return (
    <div className="linen-bg min-h-screen flex flex-col items-center justify-center px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8 animate-slide-up" style={{ animationDelay: '0ms' }}>
        <div className="inline-flex items-center gap-3 mb-2">
          <span className="text-4xl">🍱</span>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
            Savells Lunch
          </h1>
        </div>
        <p className="font-body text-warm-gray text-lg mt-1">
          What&apos;s for lunch this week?
        </p>
      </div>

      {/* Tab Switcher */}
      <div
        className="relative flex bg-cream-dark rounded-2xl p-1.5 mb-8 animate-slide-up"
        style={{ animationDelay: '100ms' }}
      >
        <div
          className="tab-indicator absolute top-1.5 bottom-1.5 bg-white rounded-xl shadow-sm"
          style={{
            width: 'calc(50% - 3px)',
            transform: mode === 'kids' ? 'translateX(0)' : 'translateX(calc(100% + 6px))',
          }}
        />
        <button
          onClick={() => { setMode('kids'); setSelectedKid(null); setPin(''); setError(''); }}
          className={`relative z-10 px-6 py-2.5 rounded-xl font-display font-semibold text-base transition-colors duration-200 ${
            mode === 'kids' ? 'text-foreground' : 'text-warm-gray'
          }`}
        >
          👋 Kids
        </button>
        <button
          onClick={() => { setMode('parent'); setSelectedKid(null); setPin(''); setError(''); }}
          className={`relative z-10 px-6 py-2.5 rounded-xl font-display font-semibold text-base transition-colors duration-200 ${
            mode === 'parent' ? 'text-foreground' : 'text-warm-gray'
          }`}
        >
          👤 Parent
        </button>
      </div>

      {/* Content */}
      <div className="w-full max-w-md">
        {mode === 'kids' && !selectedKid && (
          <div className="animate-slide-up" style={{ animationDelay: '150ms' }}>
            <p className="text-center font-display text-warm-gray mb-5 text-lg">
              Who&apos;s hungry?
            </p>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {kids.map((kid, i) => (
                <button
                  key={kid.name}
                  onClick={() => { setSelectedKid(kid); setPin(''); setError(''); }}
                  className="animate-slide-up group relative overflow-hidden rounded-2xl p-5 sm:p-6 text-white font-display font-semibold text-lg transition-all duration-200 hover:scale-[1.03] hover:shadow-lg active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-cream"
                  style={{
                    backgroundColor: kid.color,
                    animationDelay: `${200 + i * 60}ms`,
                    focusRingColor: kid.color,
                  } as React.CSSProperties}
                >
                  {/* Subtle gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                  <div className="relative">
                    <span className="text-3xl sm:text-4xl block mb-2 drop-shadow-sm">
                      {kid.emoji}
                    </span>
                    <span className="block text-base sm:text-lg drop-shadow-sm">
                      {kid.name}
                    </span>
                    <span className="block text-[11px] sm:text-xs opacity-80 mt-0.5 font-body font-normal">
                      {kid.school}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === 'kids' && selectedKid && (
          <div className="animate-slide-up flex flex-col items-center">
            {/* Back button + selected kid */}
            <button
              onClick={() => { setSelectedKid(null); setPin(''); setError(''); }}
              className="self-start mb-6 flex items-center gap-2 text-warm-gray hover:text-foreground transition-colors font-body text-sm"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-px">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back
            </button>

            {/* Kid avatar */}
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-3 shadow-md"
              style={{ backgroundColor: selectedKid.color }}
            >
              {selectedKid.emoji}
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-1">
              Hi, {selectedKid.name}!
            </h2>
            <p className="font-body text-warm-gray text-sm mb-6">
              Enter your PIN
            </p>

            {/* PIN dots */}
            <div className={`flex gap-3 mb-8 min-h-[20px] items-center ${shaking ? 'shake' : ''}`}>
              {pin.length === 0 ? (
                <span className="text-warm-gray-light font-body text-sm">Enter PIN</span>
              ) : (
                Array.from({ length: pin.length }).map((_, i) => (
                  <div
                    key={i}
                    className="w-3.5 h-3.5 rounded-full pin-dot-enter"
                    style={{ backgroundColor: selectedKid.color }}
                  />
                ))
              )}
            </div>

            {/* Error message */}
            {error && (
              <p className="text-red-500 font-body text-sm mb-4 bg-red-50 px-4 py-2 rounded-xl">
                {error}
              </p>
            )}

            {/* PIN pad */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'enter'].map(
                (key) => {
                  if (key === 'back') {
                    return (
                      <button
                        key={key}
                        onClick={handlePinBackspace}
                        disabled={isSubmitting}
                        className="pin-btn h-16 rounded-2xl bg-cream-dark text-warm-gray font-body text-lg flex items-center justify-center hover:bg-warm-gray-light disabled:opacity-50"
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <path d="M19 12H5M5 12L12 5M5 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    );
                  }
                  if (key === 'enter') {
                    return (
                      <button
                        key={key}
                        onClick={() => pin.length >= 3 && submitPin(pin)}
                        disabled={pin.length < 3 || isSubmitting}
                        className="pin-btn h-16 rounded-2xl font-display font-semibold text-white text-sm flex items-center justify-center disabled:opacity-30 transition-opacity"
                        style={{ backgroundColor: selectedKid.color }}
                      >
                        {isSubmitting ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          'GO'
                        )}
                      </button>
                    );
                  }
                  return (
                    <button
                      key={key}
                      onClick={() => handlePinDigit(key)}
                      disabled={isSubmitting}
                      className="pin-btn h-16 rounded-2xl bg-white text-foreground font-display text-xl font-semibold shadow-sm hover:shadow-md disabled:opacity-50 border border-cream-dark"
                    >
                      {key}
                    </button>
                  );
                }
              )}
            </div>
          </div>
        )}

        {mode === 'parent' && !forgotMode && (
          <form
            onSubmit={handleParentLogin}
            className="animate-slide-up bg-white rounded-3xl p-8 shadow-sm border border-cream-dark"
            style={{ animationDelay: '150ms' }}
          >
            <h2 className="font-display text-2xl font-bold text-foreground mb-6 text-center">
              Parent Login
            </h2>

            {error && (
              <div className="mb-4 bg-red-50 text-red-600 px-4 py-3 rounded-xl font-body text-sm">
                {error}
              </div>
            )}

            <label className="block mb-4">
              <span className="font-body text-sm font-medium text-warm-gray block mb-1.5">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                className="w-full px-4 py-3 rounded-xl border border-cream-dark bg-cream font-body text-foreground placeholder:text-warm-gray-light focus:outline-none focus:ring-2 focus:ring-amber focus:border-transparent transition-shadow"
                placeholder="you@email.com"
                required
              />
            </label>

            <label className="block mb-2">
              <span className="font-body text-sm font-medium text-warm-gray block mb-1.5">
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className="w-full px-4 py-3 rounded-xl border border-cream-dark bg-cream font-body text-foreground placeholder:text-warm-gray-light focus:outline-none focus:ring-2 focus:ring-amber focus:border-transparent transition-shadow"
                placeholder="Enter password"
                required
              />
            </label>

            <div className="flex justify-end mb-6">
              <button
                type="button"
                onClick={() => { setForgotMode(true); setForgotEmail(email); setForgotStatus('idle'); setError(''); }}
                className="font-body text-xs text-warm-gray hover:text-amber-dark transition-colors"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-amber text-white font-display font-semibold text-lg hover:bg-amber-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        )}

        {mode === 'parent' && forgotMode && (
          <div className="animate-slide-up bg-white rounded-3xl p-8 shadow-sm border border-cream-dark">
            <h2 className="font-display text-2xl font-bold text-foreground mb-2 text-center">
              Reset password
            </h2>
            <p className="font-body text-sm text-warm-gray mb-6 text-center">
              Enter your email and we&apos;ll send a reset link.
            </p>

            {forgotStatus === 'sent' ? (
              <div className="text-center">
                <span className="text-3xl">📬</span>
                <p className="font-body text-sm text-foreground mt-3 mb-6">
                  Check your inbox — a reset link is on its way to <strong>{forgotEmail}</strong>.
                </p>
                <button
                  onClick={() => { setForgotMode(false); setForgotStatus('idle'); }}
                  className="font-body text-sm text-amber-dark hover:underline"
                >
                  Back to login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <label className="block">
                  <span className="font-body text-sm font-medium text-warm-gray block mb-1.5">Email</span>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-cream-dark bg-cream font-body text-foreground placeholder:text-warm-gray-light focus:outline-none focus:ring-2 focus:ring-amber focus:border-transparent transition-shadow"
                    placeholder="you@email.com"
                    required
                  />
                </label>
                <button
                  type="submit"
                  disabled={forgotStatus === 'sending'}
                  className="w-full py-3.5 rounded-xl bg-amber text-white font-display font-semibold text-lg disabled:opacity-50 flex items-center justify-center"
                >
                  {forgotStatus === 'sending' ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : 'Send reset link'}
                </button>
                <button
                  type="button"
                  onClick={() => { setForgotMode(false); setForgotStatus('idle'); }}
                  className="w-full font-body text-sm text-warm-gray hover:text-foreground transition-colors"
                >
                  Back to login
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <p
        className="mt-12 text-warm-gray/50 font-body text-xs animate-slide-up"
        style={{ animationDelay: '400ms' }}
      >
        Arlington ISD Lunch Tracker
      </p>
    </div>
  );
}
