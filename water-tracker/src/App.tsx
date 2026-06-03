import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { useProfile } from './hooks/useProfile';
import { usePlan } from './hooks/usePlan';
import { useJournal } from './hooks/useJournal';
import { Auth } from './components/Auth';
import { Setup } from './components/Setup';
import { WaterAssessment } from './components/WaterAssessment';
import { JournalEntryPage } from './components/JournalEntryPage';
import { Dashboard } from './components/Dashboard';

export default function App() {
  const [user, setUser]           = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [showSetup, setShowSetup] = useState(false);

  const userId = user?.id ?? null;
  const { profile, loading: profileLoading, saveProfile, clearProfile } = useProfile(userId);
  const plan = usePlan(profile, userId);
  const journal = useJournal(userId);

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
    // Plan is keyed by userId — preserved in localStorage for when they log back in
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

  // Step 1 — Profile setup
  if (!profile || showSetup) {
    return (
      <Setup
        isEditing={showSetup && Boolean(profile)}
        initialData={showSetup && profile ? {
          weight_kg:     profile.weight_kg,
          activity_level: profile.activity_level,
          wake_time:     profile.wake_time,
          sleep_time:    profile.sleep_time,
          glass_size_ml: profile.glass_size_ml,
        } : undefined}
        onSave={async (data) => {
          await saveProfile(data);
          plan.resetPlan(); // reset assessment when profile changes
          setShowSetup(false);
        }}
      />
    );
  }

  // Step 2 — Initial water assessment (only once, until plan is started)
  if (!plan.hasPlan) {
    return (
      <WaterAssessment
        profile={profile}
        onStart={(initialGlasses) => plan.startPlan(initialGlasses)}
      />
    );
  }

  // Step 3a — Expectation journal (once, right after plan starts)
  if (plan.hasPlan && !journal.hasSeenExpectation) {
    return (
      <JournalEntryPage
        type="expectation"
        weekNumber={1}
        onSave={async (content) => { await journal.addEntry(1, 'expectation', content); }}
        onSkip={() => journal.markSeen('expectation')}
      />
    );
  }

  // Step 3b — Weekly reflection (once per completed week)
  const completedWeek = plan.currentWeekNumber > 1 ? plan.currentWeekNumber - 1 : null;
  if (completedWeek && !journal.hasSeenWeekPrompt(completedWeek)) {
    return (
      <JournalEntryPage
        type="weekly_reflection"
        weekNumber={completedWeek}
        onSave={async (content) => { await journal.addEntry(completedWeek, 'weekly_reflection', content); }}
        onSkip={() => journal.markSeen(`week-${completedWeek}`)}
      />
    );
  }

  // Step 4 — Main dashboard
  return (
    <Dashboard
      profile={profile}
      plan={plan}
      journal={journal}
      userId={user?.id ?? null}
      onEditProfile={() => setShowSetup(true)}
      onLogout={handleLogout}
    />
  );
}
