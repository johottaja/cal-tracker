import type {
  MacroKey,
  MacroValues,
  SuccessState,
} from './models';

export const SUCCESS_RULE_VERSION = '1' as const;

export function macroSuccess(
  macro: MacroKey,
  consumed: number,
  goal: number,
  hasData: boolean,
): SuccessState {
  if (!hasData) return 'no_data';
  if (!Number.isFinite(consumed) || !Number.isFinite(goal) || goal < 0) {
    throw new Error('Success values must be finite and goals non-negative');
  }
  const met =
    macro === 'proteinG' ? consumed >= goal : consumed <= goal;
  return met ? 'met' : 'not_met';
}

export function dailySuccess(
  consumed: MacroValues,
  goals: MacroValues,
  hasData: boolean,
): Record<MacroKey, SuccessState> {
  return {
    calories: macroSuccess(
      'calories',
      consumed.calories,
      goals.calories,
      hasData,
    ),
    proteinG: macroSuccess(
      'proteinG',
      consumed.proteinG,
      goals.proteinG,
      hasData,
    ),
    carbsG: macroSuccess(
      'carbsG',
      consumed.carbsG,
      goals.carbsG,
      hasData,
    ),
    fatG: macroSuccess('fatG', consumed.fatG, goals.fatG, hasData),
  };
}
