'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { SessionUser, Profile } from '../types';

interface AuthContextType {
  user: SessionUser | null;
  profiles: Profile[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  pinLogin: (name: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      setUser(data.user || null);
    } catch {
      setUser(null);
    }
  }, []);

  const fetchProfiles = useCallback(async () => {
    try {
      const res = await fetch('/api/profiles');
      const data = await res.json();
      setProfiles(data.profiles || []);
    } catch {
      setProfiles([]);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchSession(), fetchProfiles()]).finally(() => setLoading(false));
  }, [fetchSession, fetchProfiles]);

  const login = async (email: string, password: string) => {
    const { createClient } = await import('../supabase/client');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await fetchSession();
  };

  const pinLogin = async (name: string, pin: string) => {
    const res = await fetch('/api/auth/pin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, pin }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setUser(data.user);
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  const refresh = async () => {
    await Promise.all([fetchSession(), fetchProfiles()]);
  };

  return (
    <AuthContext.Provider value={{ user, profiles, loading, login, pinLogin, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
