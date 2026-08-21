import { normalizeMacroValues, roundGrams } from './macros';
import type { MacroValues } from './models';

export type BiologicalSex = 'male' | 'female';

export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extra_active';

export type NutritionGoal =
  | 'body_recomposition'
  | 'build_muscle'
  | 'caloric_deficit'
  | 'slight_caloric_deficit'
  | 'maintenance';

export interface BodyStats {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: BiologicalSex;
  activity: ActivityLevel;
}

export interface TdeeResult {
  bmr: number;
  tdee: number;
}

export interface CalorieTargetResult {
  tdee: number;
  bmr: number;
  targetCalories: number;
  clampedToBmr: boolean;
}

export const ACTIVITY_LEVELS: readonly {
  id: ActivityLevel;
  label: string;
  description: string;
  multiplier: number;
}[] = [
  {
    id: 'sedentary',
    label: 'Sedentary',
    description: 'Little or no exercise, mostly seated.',
    multiplier: 1.2,
  },
  {
    id: 'lightly_active',
    label: 'Lightly active',
    description: 'Light exercise 1–3 days per week.',
    multiplier: 1.375,
  },
  {
    id: 'moderately_active',
    label: 'Moderately active',
    description: 'Moderate exercise 3–5 days per week.',
    multiplier: 1.55,
  },
  {
    id: 'very_active',
    label: 'Very active',
    description: 'Hard exercise 6–7 days per week.',
    multiplier: 1.725,
  },
  {
    id: 'extra_active',
    label: 'Extra active',
    description: 'Very hard daily exercise or a physical job.',
    multiplier: 1.9,
  },
] as const;

export const NUTRITION_GOALS: readonly {
  id: NutritionGoal;
  label: string;
  description: string;
  calorieOffset: number;
}[] = [
  {
    id: 'body_recomposition',
    label: 'Body recomposition',
    description:
      'Eat around maintenance with enough protein to lose fat and build muscle at the same time.',
    calorieOffset: 0,
  },
  {
    id: 'build_muscle',
    label: 'Build muscle',
    description: 'Eat a modest surplus so training has extra energy to add muscle.',
    calorieOffset: 300,
  },
  {
    id: 'caloric_deficit',
    label: 'Caloric deficit',
    description: 'Eat 500 kcal below maintenance for faster fat loss.',
    calorieOffset: -500,
  },
  {
    id: 'slight_caloric_deficit',
    label: 'Slight caloric deficit',
    description: 'Eat 300 kcal below maintenance for slower, easier fat loss.',
    calorieOffset: -300,
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    description: 'Eat about as much as you burn to keep your current weight.',
    calorieOffset: 0,
  },
] as const;

const BODY_STATS_LIMITS = {
  weightKg: { min: 30, max: 300 },
  heightCm: { min: 100, max: 250 },
  age: { min: 13, max: 100 },
} as const;

function activityMultiplier(level: ActivityLevel): number {
  return ACTIVITY_LEVELS.find((item) => item.id === level)?.multiplier ?? 1.2;
}

function proteinGramsPerKg(goal: NutritionGoal): number {
  switch (goal) {
    case 'body_recomposition':
      return 2.0;
    case 'caloric_deficit':
    case 'slight_caloric_deficit':
      return 2.2;
    case 'build_muscle':
    case 'maintenance':
    default:
      return 1.8;
  }
}

export function roundTdee(value: number): number {
  return Math.round(value / 10) * 10;
}

/** Mifflin-St Jeor (1990) resting metabolic rate. */
export function calculateBmr(stats: BodyStats): number {
  const { weightKg, heightCm, age, sex } = stats;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

export function calculateTdee(stats: BodyStats): TdeeResult {
  const bmr = calculateBmr(stats);
  const tdee = roundTdee(bmr * activityMultiplier(stats.activity));
  return { bmr: Math.round(bmr), tdee };
}

export function calculateCalorieTarget(
  stats: BodyStats,
  goal: NutritionGoal,
): CalorieTargetResult {
  const { bmr, tdee } = calculateTdee(stats);
  const offset =
    NUTRITION_GOALS.find((item) => item.id === goal)?.calorieOffset ?? 0;
  const rawTarget = tdee + offset;
  const clampedToBmr = rawTarget < bmr;
  const targetCalories = Math.max(rawTarget, bmr);
  return {
    bmr,
    tdee,
    targetCalories: roundTdee(targetCalories),
    clampedToBmr,
  };
}

export function calculateMacrosFromGoal(
  stats: BodyStats,
  goal: NutritionGoal,
): MacroValues {
  const { targetCalories } = calculateCalorieTarget(stats, goal);
  const proteinG = roundGrams(stats.weightKg * proteinGramsPerKg(goal));
  let fatG = roundGrams((targetCalories * 0.25) / 9);
  const minFatG = roundGrams(stats.weightKg * 0.6);
  fatG = Math.max(fatG, minFatG);

  let carbsG = roundGrams(
    (targetCalories - proteinG * 4 - fatG * 9) / 4,
  );

  if (carbsG < 0) {
    fatG = roundGrams(Math.max(minFatG, (targetCalories - proteinG * 4) / 9));
    carbsG = roundGrams(
      (targetCalories - proteinG * 4 - fatG * 9) / 4,
    );
    if (carbsG < 0) carbsG = 0;
  }

  return normalizeMacroValues({
    calories: targetCalories,
    proteinG,
    carbsG,
    fatG,
  });
}

export function validateBodyStats(input: {
  weightKg: number;
  heightCm: number;
  age: number;
}): string | null {
  const { weightKg, heightCm, age } = input;
  if (
    !Number.isFinite(weightKg) ||
    weightKg < BODY_STATS_LIMITS.weightKg.min ||
    weightKg > BODY_STATS_LIMITS.weightKg.max
  ) {
    return `Weight must be between ${BODY_STATS_LIMITS.weightKg.min} and ${BODY_STATS_LIMITS.weightKg.max} kg.`;
  }
  if (
    !Number.isFinite(heightCm) ||
    heightCm < BODY_STATS_LIMITS.heightCm.min ||
    heightCm > BODY_STATS_LIMITS.heightCm.max
  ) {
    return `Height must be between ${BODY_STATS_LIMITS.heightCm.min} and ${BODY_STATS_LIMITS.heightCm.max} cm.`;
  }
  if (
    !Number.isFinite(age) ||
    age < BODY_STATS_LIMITS.age.min ||
    age > BODY_STATS_LIMITS.age.max
  ) {
    return `Age must be between ${BODY_STATS_LIMITS.age.min} and ${BODY_STATS_LIMITS.age.max}.`;
  }
  return null;
}

export const DEFAULT_MACRO_GOALS: MacroValues = {
  calories: 2000,
  proteinG: 120,
  carbsG: 230,
  fatG: 70,
};
