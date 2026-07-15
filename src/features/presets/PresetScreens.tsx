import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import {
  AppButton,
  Card,
  EmptyState,
  Field,
  Heading,
  NumericField,
  Screen,
  Section,
  SegmentedControl,
} from '@/components/ui';
import { spacing, useAppTheme } from '@/constants/theme';
import type { Preset, PresetKind } from '@/domain/models';
import { presetInputFromParams } from '@/features/entries/EntryScreens';
import { InlineNotice, MacroSummary, StatusPill } from '@/features/shared/FeatureUI';
import { useApp } from '@/providers/AppProvider';

const filters = ['All', 'Meals', 'Items', 'Portions'] as const;
type Filter = (typeof filters)[number];
const kinds = ['Meal', 'Item', 'Portion'] as const;
type KindLabel = (typeof kinds)[number];

const filterKind: Record<Exclude<Filter, 'All'>, PresetKind> = {
  Meals: 'meal',
  Items: 'item',
  Portions: 'portion',
};

function PresetRow({
  preset,
  onQuickAdd,
  onFavorite,
}: {
  preset: Preset;
  onQuickAdd: () => void;
  onFavorite: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Card style={styles.presetCard}>
      <View style={styles.presetHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${preset.name}`}
          onPress={() => router.push({ pathname: '/preset-editor', params: { id: preset.id } })}
          style={styles.presetCopy}>
          <Text style={[styles.presetName, { color: theme.text }]}>{preset.name}</Text>
          <View style={styles.metaRow}>
            <StatusPill label={preset.kind} />
            {preset.servingLabel ? (
              <Text style={[styles.caption, { color: theme.muted }]}>{preset.servingLabel}</Text>
            ) : null}
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            preset.isFavorite ? `Remove ${preset.name} from favorites` : `Favorite ${preset.name}`
          }
          onPress={onFavorite}
          hitSlop={12}
          style={styles.starButton}>
          <Text style={[styles.star, { color: preset.isFavorite ? theme.warning : theme.muted }]}>
            {preset.isFavorite ? '★' : '☆'}
          </Text>
        </Pressable>
      </View>
      <MacroSummary values={preset} />
      <View style={styles.row}>
        <View style={styles.flex}>
          <AppButton label="Quick add" onPress={onQuickAdd} />
        </View>
        <View style={styles.flex}>
          <AppButton
            label="Edit"
            variant="secondary"
            onPress={() => router.push({ pathname: '/preset-editor', params: { id: preset.id } })}
          />
        </View>
      </View>
    </Card>
  );
}

export function PresetsScreen() {
  const { presets, quickAddPreset, togglePresetFavorite, deleteEntry } = useApp();
  const [filter, setFilter] = useState<Filter>('All');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState<{ text: string; entryId?: string } | null>(null);
  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return [...presets]
      .filter((preset) => filter === 'All' || preset.kind === filterKind[filter])
      .filter((preset) => !query || preset.name.toLocaleLowerCase().includes(query))
      .sort(
        (a, b) =>
          Number(b.isFavorite) - Number(a.isFavorite) ||
          a.sortOrder - b.sortOrder ||
          a.name.localeCompare(b.name),
      );
  }, [filter, presets, search]);

  const quickAdd = async (preset: Preset) => {
    try {
      const entry = await quickAddPreset(preset);
      setNotice({ text: `${preset.name} added to today.`, entryId: entry.id });
    } catch (caught) {
      setNotice({ text: caught instanceof Error ? caught.message : 'Could not add preset.' });
    }
  };

  const undo = async () => {
    if (!notice?.entryId) return;
    await deleteEntry(notice.entryId);
    setNotice({ text: 'Quick add undone.' });
  };

  return (
    <Screen>
      <Heading title="Presets" subtitle="Reusable meal and portion snapshots for quick logging." />
      <AppButton label="Create preset" onPress={() => router.push('/preset-editor')} />
      {notice ? (
        <InlineNotice
          kind={notice.entryId ? 'success' : 'info'}
          action={
            notice.entryId ? (
              <AppButton label="Undo" variant="ghost" onPress={() => void undo()} />
            ) : undefined
          }>
          {notice.text}
        </InlineNotice>
      ) : null}
      <Field
        label="Search presets"
        placeholder="Search by name"
        value={search}
        onChangeText={setSearch}
        returnKeyType="search"
      />
      <SegmentedControl values={filters} value={filter} onChange={setFilter} />
      <Section title={filter === 'All' ? 'All presets' : filter} detail={`${visible.length}`}>
        {visible.length ? (
          <View style={styles.list}>
            {visible.map((preset) => (
              <PresetRow
                key={preset.id}
                preset={preset}
                onQuickAdd={() => void quickAdd(preset)}
                onFavorite={() => void togglePresetFavorite(preset.id, !preset.isFavorite)}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            title={search ? 'No matching presets' : 'No presets here'}
            body={search ? 'Try another name or filter.' : 'Create a preset from a usual meal or entry.'}
          />
        )}
      </Section>
    </Screen>
  );
}

type PresetForm = {
  name: string;
  kind: KindLabel;
  servingLabel: string;
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
  isFavorite: boolean;
};

function formFromPreset(preset: Preset): PresetForm {
  return {
    name: preset.name,
    kind: `${preset.kind[0]?.toUpperCase()}${preset.kind.slice(1)}` as KindLabel,
    servingLabel: preset.servingLabel ?? '',
    calories: String(preset.calories),
    proteinG: String(preset.proteinG),
    carbsG: String(preset.carbsG),
    fatG: String(preset.fatG),
    isFavorite: preset.isFavorite,
  };
}

export function PresetEditorScreen() {
  const theme = useAppTheme();
  const params = useLocalSearchParams() as Record<string, string | string[] | undefined>;
  const { presets, createPreset, updatePreset, deletePreset } = useApp();
  const idValue = params.id;
  const id = Array.isArray(idValue) ? idValue[0] : idValue;
  const existing = presets.find((preset) => preset.id === id);
  const prefill = presetInputFromParams(params);
  const [form, setForm] = useState<PresetForm>(() =>
    existing
      ? formFromPreset(existing)
      : {
          name: prefill.name ?? '',
          kind: 'Meal',
          servingLabel: '',
          calories: String(prefill.calories ?? ''),
          proteinG: String(prefill.proteinG ?? ''),
          carbsG: String(prefill.carbsG ?? ''),
          fatG: String(prefill.fatG ?? ''),
          isFavorite: false,
        },
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (id && !existing) {
    return (
      <Screen>
        <Heading title="Preset unavailable" />
        <EmptyState title="Preset not found" body="It may have been deleted on another device." />
      </Screen>
    );
  }

  const save = async () => {
    const values = {
      calories: Number(form.calories),
      proteinG: Number(form.proteinG),
      carbsG: Number(form.carbsG),
      fatG: Number(form.fatG),
    };
    if (
      !form.name.trim() ||
      Object.values(values).some((value) => !Number.isFinite(value) || value < 0)
    ) {
      setError('Add a name and non-negative values for every macro.');
      return;
    }
    setSaving(true);
    setError(null);
    const input = {
      name: form.name.trim(),
      kind: form.kind.toLowerCase() as PresetKind,
      servingLabel: form.servingLabel.trim() || null,
      calories: Math.round(values.calories),
      proteinG: Math.round(values.proteinG * 10) / 10,
      carbsG: Math.round(values.carbsG * 10) / 10,
      fatG: Math.round(values.fatG * 10) / 10,
      isFavorite: form.isFavorite,
    };
    try {
      if (existing) await updatePreset(existing.id, input);
      else await createPreset(input);
      router.replace('/presets');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save this preset.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!existing) return;
    Alert.alert('Delete this preset?', 'Previously logged entries will not change.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deletePreset(existing.id);
          router.replace('/presets');
        },
      },
    ]);
  };

  return (
    <Screen>
      <Heading
        title={existing ? 'Edit preset' : 'New preset'}
        subtitle="Preset values are copied into each new log entry."
      />
      {error ? <InlineNotice kind="error">{error}</InlineNotice> : null}
      <Card style={styles.form}>
        <Field
          label="Name"
          placeholder="e.g. Breakfast oats"
          value={form.name}
          onChangeText={(name) => setForm({ ...form, name })}
        />
        <View style={styles.fieldGap}>
          <Text style={[styles.label, { color: theme.text }]}>Kind</Text>
          <SegmentedControl
            values={kinds}
            value={form.kind}
            onChange={(kind) => setForm({ ...form, kind })}
          />
        </View>
        <Field
          label="Serving label (optional)"
          placeholder="e.g. 1 bowl"
          value={form.servingLabel}
          onChangeText={(servingLabel) => setForm({ ...form, servingLabel })}
        />
        <View style={styles.numericGrid}>
          <View style={styles.flex}>
            <NumericField
              label="Calories"
              value={form.calories}
              onChangeText={(calories) => setForm({ ...form, calories })}
              integer
            />
            <NumericField
              label="Carbohydrates (g)"
              value={form.carbsG}
              onChangeText={(carbsG) => setForm({ ...form, carbsG })}
            />
          </View>
          <View style={styles.flex}>
            <NumericField
              label="Protein (g)"
              value={form.proteinG}
              onChangeText={(proteinG) => setForm({ ...form, proteinG })}
            />
            <NumericField
              label="Fat (g)"
              value={form.fatG}
              onChangeText={(fatG) => setForm({ ...form, fatG })}
            />
          </View>
        </View>
        <View style={styles.switchRow}>
          <View style={styles.switchCopy}>
            <Text style={[styles.label, { color: theme.text }]}>Favorite</Text>
            <Text style={[styles.caption, { color: theme.muted }]}>
              Show this preset in the Log tab.
            </Text>
          </View>
          <Switch
            accessibilityLabel="Favorite preset"
            value={form.isFavorite}
            onValueChange={(isFavorite) => setForm({ ...form, isFavorite })}
            trackColor={{ true: theme.primary }}
          />
        </View>
      </Card>
      <AppButton
        label={existing ? 'Save changes' : 'Create preset'}
        onPress={() => void save()}
        loading={saving}
      />
      {existing ? (
        <AppButton label="Delete preset" variant="danger" onPress={confirmDelete} />
      ) : null}
      <AppButton label="Cancel" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  presetCard: { gap: spacing.lg },
  presetHeader: { flexDirection: 'row', gap: spacing.md },
  presetCopy: { flex: 1, gap: spacing.sm },
  presetName: { fontSize: 19, lineHeight: 24, fontWeight: '800' },
  caption: { fontSize: 13, lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  starButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  star: { fontSize: 26 },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1, gap: spacing.md },
  form: { gap: spacing.lg },
  fieldGap: { gap: spacing.sm },
  label: { fontSize: 14, lineHeight: 18, fontWeight: '700' },
  numericGrid: { flexDirection: 'row', gap: spacing.md },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  switchCopy: { flex: 1, gap: 2 },
});
