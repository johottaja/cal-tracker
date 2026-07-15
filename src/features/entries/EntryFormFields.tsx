import { StyleSheet, View } from 'react-native';

import { Field, NumericField } from '@/components/ui';
import { spacing } from '@/constants/theme';

export type EntryFormValue = {
  name: string;
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
  localDate: string;
  notes: string;
};

export const emptyEntryForm = (localDate: string): EntryFormValue => ({
  name: '',
  calories: '',
  proteinG: '',
  carbsG: '',
  fatG: '',
  localDate,
  notes: '',
});

export function parseEntryForm(value: EntryFormValue) {
  const parsed = {
    name: value.name.trim(),
    calories: Number(value.calories),
    proteinG: Number(value.proteinG),
    carbsG: Number(value.carbsG),
    fatG: Number(value.fatG),
    localDate: value.localDate,
    notes: value.notes.trim() || null,
  };
  const macros = [parsed.calories, parsed.proteinG, parsed.carbsG, parsed.fatG];
  if (!parsed.name || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.localDate)) return null;
  if (macros.some((item) => !Number.isFinite(item) || item < 0)) return null;
  return {
    ...parsed,
    calories: Math.round(parsed.calories),
    proteinG: Math.round(parsed.proteinG * 10) / 10,
    carbsG: Math.round(parsed.carbsG * 10) / 10,
    fatG: Math.round(parsed.fatG * 10) / 10,
  };
}

export function EntryFormFields({
  value,
  onChange,
}: {
  value: EntryFormValue;
  onChange: (value: EntryFormValue) => void;
}) {
  const update = (key: keyof EntryFormValue) => (next: string) =>
    onChange({ ...value, [key]: next });

  return (
    <View style={styles.container}>
      <Field
        label="Name"
        placeholder="What did you eat?"
        value={value.name}
        onChangeText={update('name')}
        autoCapitalize="sentences"
      />
      <View style={styles.grid}>
        <View style={styles.column}>
          <NumericField label="Calories (kcal)" value={value.calories} onChangeText={update('calories')} integer />
          <NumericField label="Carbohydrates (g)" value={value.carbsG} onChangeText={update('carbsG')} />
        </View>
        <View style={styles.column}>
          <NumericField label="Protein (g)" value={value.proteinG} onChangeText={update('proteinG')} />
          <NumericField label="Fat (g)" value={value.fatG} onChangeText={update('fatG')} />
        </View>
      </View>
      <Field
        label="Log date"
        placeholder="YYYY-MM-DD"
        value={value.localDate}
        onChangeText={update('localDate')}
        keyboardType="numbers-and-punctuation"
      />
      <Field
        label="Notes (optional)"
        value={value.notes}
        onChangeText={update('notes')}
        placeholder="Serving or preparation notes"
        multiline
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  grid: { flexDirection: 'row', gap: spacing.md },
  column: { flex: 1, gap: spacing.md },
});
