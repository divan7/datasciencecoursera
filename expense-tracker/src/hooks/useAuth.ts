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
    signOut,
  };
}
