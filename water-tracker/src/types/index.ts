export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active';

export interface UserProfile {
  id: string;
  weight_kg: number;
  activity_level: ActivityLevel;
  wake_time: string;
  sleep_time: string;
  glass_size_ml: number;
  daily_goal_ml: number;
}

export interface IntakeLog {
  id: string;
  user_id: string;
  amount_ml: number;
  logged_at: string;
}
