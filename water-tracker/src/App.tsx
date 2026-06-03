import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { useProfile } from './hooks/useProfile';
import { Auth } from './components/Auth';
import { Setup } from './components/Setup';
import { Dashboard } from './components/Dashboard';

export default function App() {
  const [user, setUser]           = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [showSetup, setShowSetup] = useState(false);

  const { profile, loading: profileLoading, saveProfile, clearProfile } = useProfile(user?.id ?? null);

  // Supabase auth listener
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    clearProfile();
  }

  // Loading splash
  if (!authReady || profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-sky-950 flex items-center justify-center">
        <div className="text-5xl animate-pulse">💧</div>
      </div>
    );
  }

  // Auth wall (only when Supabase configured and user not logged in)
  if (isSupabaseConfigured && !user) return <Auth />;

  // Profile setup
  if (!profile || showSetup) {
    return (
      <Setup
        isEditing={showSetup && Boolean(profile)}
        onSave={async (data) => {
          await saveProfile(data);
          setShowSetup(false);
        }}
      />
    );
  }

  return (
    <Dashboard
      profile={profile}
      userId={user?.id ?? null}
      onEditProfile={() => setShowSetup(true)}
      onLogout={handleLogout}
    />
  );
}
