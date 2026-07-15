import type { MacroKey, MacroValues } from './models';

export class DomainValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainValidationError';
  }
}

const MACRO_KEYS: readonly MacroKey[] = [
  'calories',
  'proteinG',
  'carbsG',
  'fatG',
];

function requireNonNegativeFinite(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new DomainValidationError(`${label} must be a non-negative number`);
  }
  return value;
}

export function roundGrams(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

export function normalizeMacroValues(values: MacroValues): MacroValues {
  return {
    calories: Math.round(
      requireNonNegativeFinite(values.calories, 'Calories'),
    ),
    proteinG: roundGrams(
      requireNonNegativeFinite(values.proteinG, 'Protein'),
    ),
    carbsG: roundGrams(
      requireNonNegativeFinite(values.carbsG, 'Carbohydrates'),
    ),
    fatG: roundGrams(requireNonNegativeFinite(values.fatG, 'Fat')),
  };
}

export function zeroMacros(): MacroValues {
  return { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
}

export function addMacros(...values: readonly MacroValues[]): MacroValues {
  const total = values.reduce<MacroValues>(
    (sum, item) => ({
      calories: sum.calories + item.calories,
      proteinG: sum.proteinG + item.proteinG,
      carbsG: sum.carbsG + item.carbsG,
      fatG: sum.fatG + item.fatG,
    }),
    zeroMacros(),
  );
  return normalizeMacroValues(total);
}

export function subtractMacros(
  minuend: MacroValues,
  subtrahend: MacroValues,
): MacroValues {
  return {
    calories: Math.round(minuend.calories - subtrahend.calories),
    proteinG: roundGrams(minuend.proteinG - subtrahend.proteinG),
    carbsG: roundGrams(minuend.carbsG - subtrahend.carbsG),
    fatG: roundGrams(minuend.fatG - subtrahend.fatG),
  };
}

export function macroProgress(
  consumed: MacroValues,
  goals: MacroValues,
): Record<MacroKey, number> {
  return MACRO_KEYS.reduce<Record<MacroKey, number>>(
    (result, key) => {
      result[key] = goals[key] > 0 ? consumed[key] / goals[key] : 0;
      return result;
    },
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}

export function normalizeRequiredText(
  value: string,
  label: string,
  maxLength = 200,
): string {
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized) {
    throw new DomainValidationError(`${label} is required`);
  }
  if (normalized.length > maxLength) {
    throw new DomainValidationError(
      `${label} must be ${maxLength} characters or fewer`,
    );
  }
  return normalized;
}

export function normalizeOptionalText(
  value: string | null | undefined,
  maxLength = 500,
): string | null {
  if (value == null) return null;
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized) return null;
  if (normalized.length > maxLength) {
    throw new DomainValidationError(
      `Text must be ${maxLength} characters or fewer`,
    );
  }
  return normalized;
}
