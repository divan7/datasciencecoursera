import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { profilesDb, type Profile } from '../lib/db';

export interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
}

export function useAuth(): AuthState & {
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithPassword: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null; needsConfirmation: boolean }>;
  setPassword: (password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
} {
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    // Initial session check
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) loadProfile();
      else setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) loadProfile();
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile() {
    const p = await profilesDb.getMe();
    setProfile(p);
    setLoading(false);
    if (p) profilesDb.updateLastSeen().catch(() => null);
  }

  async function signInWithMagicLink(email: string) {
    if (!supabase) return { error: new Error('Supabase no configurado') };
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error: error as Error | null };
  }

  async function signInWithPassword(email: string, password: string) {
    if (!supabase) return { error: new Error('Supabase no configurado') };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  }

  async function signUpWithPassword(email: string, password: string, displayName?: string) {
    if (!supabase) return { error: new Error('Supabase no configurado'), needsConfirmation: false };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: displayName ? { display_name: displayName } : undefined,
      },
    });
    // If email confirmation is enabled in Supabase, no session is returned and
    // the user must confirm via email before logging in.
    const needsConfirmation = !error && !data.session;
    return { error: error as Error | null, needsConfirmation };
  }

  async function setPassword(password: string) {
    if (!supabase) return { error: new Error('Supabase no configurado') };
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error as Error | null };
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  return {
    user,
    profile,
    loading,
    isAdmin: profile?.isAdmin ?? false,
    signInWithMagicLink,
    signInWithPassword,
    signUpWithPassword,
    setPassword,
    signOut,
  };
}
