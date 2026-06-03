import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { calculateDailyGoalMl } from '../utils/formula';
import type { UserProfile, ActivityLevel } from '../types';

const STORAGE_KEY = 'aquavital-profile';

export function useProfile(userId: string | null) {
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as UserProfile) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured || !supabase) return;
    setLoading(true);
    supabase
      .from('water_profiles')
      .select('*')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile(data as UserProfile);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }
        setLoading(false);
      });
  }, [userId]);

  async function saveProfile(updates: {
    weight_kg: number;
    activity_level: ActivityLevel;
    wake_time: string;
    sleep_time: string;
    glass_size_ml: number;
  }) {
    const daily_goal_ml = calculateDailyGoalMl(updates.weight_kg, updates.activity_level);
    const newProfile: UserProfile = {
      id: userId ?? 'local',
      ...updates,
      daily_goal_ml,
    };
    setProfile(newProfile);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));

    if (userId && isSupabaseConfigured && supabase) {
      await supabase
        .from('water_profiles')
        .upsert({ ...newProfile, id: userId, updated_at: new Date().toISOString() });
    }
    return newProfile;
  }

  function clearProfile() {
    setProfile(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  return { profile, loading, saveProfile, clearProfile };
}
