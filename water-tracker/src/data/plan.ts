export interface PlanWeek {
  weekNumber: number;
  dailyGoalMl: number;
  glassesPerDay: number;
  isGoalWeek: boolean;
}

export interface CurrentIntakeOption {
  value: string;
  glasses: number;
  label: string;
  desc: string;
  emoji: string;
}

export const INTAKE_OPTIONS: CurrentIntakeOption[] = [
  { value: '0', glasses: 0, label: 'Casi nada', desc: '0–1 vasos al día', emoji: '🏜️' },
  { value: '2', glasses: 2, label: 'Poco',      desc: '2–3 vasos al día', emoji: '💧' },
  { value: '4', glasses: 4, label: 'Regular',   desc: '4–5 vasos al día', emoji: '🥛' },
  { value: '6', glasses: 6, label: 'Bastante',  desc: '6 o más vasos',    emoji: '🌊' },
];

/**
 * Frank Suarez's gradual approach:
 * Start at current + 2 glasses, add 2 per week until reaching final goal.
 */
export function buildHydrationPlan(
  currentGlasses: number,
  finalGoalMl: number,
  glassSizeMl: number,
): PlanWeek[] {
  const finalGlasses = Math.ceil(finalGoalMl / glassSizeMl);
  const INCREMENT = 2;
  const startGlasses = Math.max(INCREMENT, currentGlasses + INCREMENT);

  if (startGlasses >= finalGlasses) {
    return [{
      weekNumber: 1,
      dailyGoalMl: finalGoalMl,
      glassesPerDay: finalGlasses,
      isGoalWeek: true,
    }];
  }

  const weeks: PlanWeek[] = [];
  let glasses = startGlasses;
  let weekNum = 1;

  while (glasses < finalGlasses) {
    weeks.push({
      weekNumber: weekNum,
      dailyGoalMl: glasses * glassSizeMl,
      glassesPerDay: glasses,
      isGoalWeek: false,
    });
    glasses = Math.min(glasses + INCREMENT, finalGlasses);
    weekNum++;
  }

  weeks.push({
    weekNumber: weekNum,
    dailyGoalMl: finalGoalMl,
    glassesPerDay: finalGlasses,
    isGoalWeek: true,
  });

  return weeks;
}
