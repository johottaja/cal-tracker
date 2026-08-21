import { Text, View } from 'react-native';

import { NumericField } from '@/components/ui';
import type { MacroValues } from '@/domain/models';
import { MacroSummary } from '@/features/shared/FeatureUI';

type MacroForm = Record<keyof MacroValues, string>;

export function ConfirmMacrosStep({
  values,
  onChange,
  validationError,
  fromCalculator,
}: {
  values: MacroForm;
  onChange: (key: keyof MacroForm, value: string) => void;
  validationError: string | null;
  fromCalculator: boolean;
}) {
  const parsed: MacroValues = {
    calories: Number(values.calories),
    proteinG: Number(values.proteinG),
    carbsG: Number(values.carbsG),
    fatG: Number(values.fatG),
  };
  const previewValid = Object.values(parsed).every(
    (value) => Number.isFinite(value) && value >= 0,
  );

  return (
    <View className="gap-4">
      <Text className="text-base leading-[22px] text-muted-foreground">
        {fromCalculator
          ? 'Here’s what we calculated. Adjust anything that doesn’t feel right.'
          : 'Enter your daily targets. You can change these anytime in Settings.'}
      </Text>
      {previewValid ? <MacroSummary values={parsed} /> : null}
      <NumericField
        label="Calories (kcal)"
        value={values.calories}
        onChangeText={(calories) => onChange('calories', calories)}
        integer
      />
      <NumericField
        label="Protein (g)"
        value={values.proteinG}
        onChangeText={(proteinG) => onChange('proteinG', proteinG)}
      />
      <NumericField
        label="Carbohydrates (g)"
        value={values.carbsG}
        onChangeText={(carbsG) => onChange('carbsG', carbsG)}
      />
      <NumericField
        label="Fat (g)"
        value={values.fatG}
        onChangeText={(fatG) => onChange('fatG', fatG)}
      />
      {validationError ? (
        <Text accessibilityRole="alert" className="text-[13px] leading-[18px] text-destructive">
          {validationError}
        </Text>
      ) : null}
    </View>
  );
}

export function macroFormFromValues(values: MacroValues): MacroForm {
  return {
    calories: String(values.calories),
    proteinG: String(values.proteinG),
    carbsG: String(values.carbsG),
    fatG: String(values.fatG),
  };
}

export function parseMacroForm(values: MacroForm): MacroValues | null {
  const parsed: MacroValues = {
    calories: Number(values.calories),
    proteinG: Number(values.proteinG),
    carbsG: Number(values.carbsG),
    fatG: Number(values.fatG),
  };
  if (Object.values(parsed).some((value) => !Number.isFinite(value) || value < 0)) {
    return null;
  }
  return parsed;
}
