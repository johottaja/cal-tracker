import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppButton, Card, EmptyState, Heading, Screen, Section } from '@/components/ui';
import { spacing, useAppTheme } from '@/constants/theme';
import { asLocalDate, timestampForLocalDate, todayLocalDate } from '@/domain/dates';
import type { CreatePresetInput, FoodEntry } from '@/domain/models';
import {
  emptyEntryForm,
  EntryFormFields,
  parseEntryForm,
  type EntryFormValue,
} from '@/features/entries/EntryFormFields';
import { InlineNotice, MacroSummary, sourceLabels, StatusPill } from '@/features/shared/FeatureUI';
import { useApp } from '@/providers/AppProvider';

function formFromEntry(entry: FoodEntry): EntryFormValue {
  return {
    name: entry.name,
    calories: String(entry.calories),
    proteinG: String(entry.proteinG),
    carbsG: String(entry.carbsG),
    fatG: String(entry.fatG),
    localDate: entry.localDate,
    notes: entry.notes ?? '',
  };
}

export function ManualEntryScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const { entries, createEntry, updateEntry } = useApp();
  const existing = useMemo(
    () => (params.id ? entries.find((entry) => entry.id === params.id) : undefined),
    [entries, params.id],
  );
  const [value, setValue] = useState<EntryFormValue>(() =>
    existing ? formFromEntry(existing) : emptyEntryForm(todayLocalDate()),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const parsed = parseEntryForm(value);
    if (!parsed) {
      setError('Add a name, valid date, and non-negative values for every macro.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const localDate = asLocalDate(parsed.localDate);
      const input = {
        ...parsed,
        localDate,
        loggedAt: timestampForLocalDate(localDate, {
          hours: existing ? new Date(existing.loggedAt).getHours() : new Date().getHours(),
          minutes: existing ? new Date(existing.loggedAt).getMinutes() : new Date().getMinutes(),
        }),
      };
      if (existing) {
        await updateEntry(existing.id, input);
      } else {
        await createEntry({ ...input, source: 'manual' });
      }
      router.replace('/');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save this entry.');
    } finally {
      setSaving(false);
    }
  };

  if (params.id && !existing) {
    return (
      <Screen>
        <Heading title="Entry unavailable" />
        <EmptyState
          title="This entry could not be found"
          body="It may have been removed on another device."
          action={<AppButton label="Go home" onPress={() => router.replace('/')} />}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Heading
        title={existing ? 'Edit entry' : 'Manual entry'}
        subtitle="Use the values from the package, recipe, or your own calculation."
      />
      {error ? <InlineNotice kind="error">{error}</InlineNotice> : null}
      <Card style={styles.form}>
        <EntryFormFields value={value} onChange={setValue} />
      </Card>
      <AppButton
        label={existing ? 'Save changes' : 'Save entry'}
        onPress={() => void save()}
        loading={saving}
      />
      <AppButton label="Cancel" variant="ghost" onPress={() => router.back()} disabled={saving} />
    </Screen>
  );
}

export function ReviewEntryScreen() {
  const { reviewDraft, setReviewDraft, createEntry } = useApp();
  const initial = useMemo<EntryFormValue | null>(
    () =>
      reviewDraft
        ? {
            name: reviewDraft.name,
            calories: String(reviewDraft.calories),
            proteinG: String(reviewDraft.proteinG),
            carbsG: String(reviewDraft.carbsG),
            fatG: String(reviewDraft.fatG),
            localDate: reviewDraft.localDate,
            notes: reviewDraft.notes ?? reviewDraft.assumptions ?? '',
          }
        : null,
    [reviewDraft],
  );
  const [value, setValue] = useState<EntryFormValue | null>(initial);
  const [savePreset, setSavePreset] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!reviewDraft || !value) {
    return (
      <Screen>
        <Heading title="Review expired" />
        <EmptyState
          title="There is no estimate to review"
          body="For privacy, photo and estimate data are discarded when the review flow ends."
          action={<AppButton label="Start again" onPress={() => router.replace('/log')} />}
        />
      </Screen>
    );
  }

  const save = async () => {
    const parsed = parseEntryForm(value);
    if (!parsed) {
      setError('Check the name, date, and macro values before saving.');
      return;
    }
    setSaving(true);
    try {
      const localDate = asLocalDate(parsed.localDate);
      await createEntry({
        ...parsed,
        localDate,
        loggedAt: timestampForLocalDate(localDate, {
          hours: new Date().getHours(),
          minutes: new Date().getMinutes(),
        }),
        source: reviewDraft.source,
      });
      const presetParams: Record<string, string> = {
        name: parsed.name,
        calories: String(parsed.calories),
        proteinG: String(parsed.proteinG),
        carbsG: String(parsed.carbsG),
        fatG: String(parsed.fatG),
      };
      setReviewDraft(null);
      if (savePreset) {
        router.replace({ pathname: '/preset-editor', params: presetParams });
      } else {
        router.replace('/');
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save this entry.');
    } finally {
      setSaving(false);
    }
  };

  const cancel = () =>
    Alert.alert('Discard this estimate?', 'Nothing will be saved.', [
      { text: 'Keep reviewing', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          setReviewDraft(null);
          router.back();
        },
      },
    ]);

  return (
    <Screen>
      <Heading
        title="Review estimate"
        subtitle="Estimates can be wrong. Adjust every value before it enters your log."
      />
      <InlineNotice>
        AI confidence: {reviewDraft.confidence ?? 'unknown'}.{' '}
        {reviewDraft.assumptions ?? 'Review the assumed serving size carefully.'}
      </InlineNotice>
      {error ? <InlineNotice kind="error">{error}</InlineNotice> : null}
      <Card style={styles.form}>
        <EntryFormFields value={value} onChange={setValue} />
      </Card>
      <AppButton
        label={savePreset ? 'Save entry and continue to preset' : 'Save reviewed entry'}
        onPress={() => void save()}
        loading={saving}
      />
      <AppButton
        label={savePreset ? '✓ Save as preset too' : 'Save as preset too'}
        variant="secondary"
        onPress={() => setSavePreset((current) => !current)}
        disabled={saving}
      />
      <AppButton label="Discard" variant="ghost" onPress={cancel} disabled={saving} />
    </Screen>
  );
}

export function EntryDetailScreen() {
  const theme = useAppTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const { entries, deleteEntry } = useApp();
  const entry = entries.find((item) => item.id === params.id);
  const [deleting, setDeleting] = useState(false);

  if (!entry) {
    return (
      <Screen>
        <Heading title="Entry unavailable" />
        <EmptyState title="Entry not found" body="It may have been deleted or not synced yet." />
      </Screen>
    );
  }

  const confirmDelete = () =>
    Alert.alert('Delete this entry?', 'Your daily totals will update immediately.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteEntry(entry.id);
            router.replace('/');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);

  const presetParams: Record<string, string> = {
    name: entry.name,
    calories: String(entry.calories),
    proteinG: String(entry.proteinG),
    carbsG: String(entry.carbsG),
    fatG: String(entry.fatG),
  };

  return (
    <Screen>
      <Heading title={entry.name} subtitle={entry.localDate} />
      <View style={styles.pills}>
        <StatusPill label={sourceLabels[entry.source]} />
        <StatusPill
          label={new Intl.DateTimeFormat(undefined, {
            hour: 'numeric',
            minute: '2-digit',
          }).format(new Date(entry.loggedAt))}
        />
      </View>
      <Card style={styles.detailCard}>
        <MacroSummary values={entry} />
      </Card>
      {entry.notes ? (
        <Section title="Notes">
          <Card>
            <Text style={[styles.notes, { color: theme.text }]}>{entry.notes}</Text>
          </Card>
        </Section>
      ) : null}
      <AppButton
        label="Edit entry"
        onPress={() => router.push({ pathname: '/manual-entry', params: { id: entry.id } })}
      />
      <AppButton
        label="Save as preset"
        variant="secondary"
        onPress={() => router.push({ pathname: '/preset-editor', params: presetParams })}
      />
      <AppButton
        label="Delete entry"
        variant="danger"
        onPress={confirmDelete}
        loading={deleting}
      />
    </Screen>
  );
}

export function presetInputFromParams(params: Record<string, string | string[] | undefined>): Partial<CreatePresetInput> {
  const read = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  return {
    name: read('name') ?? '',
    calories: Number(read('calories') ?? 0),
    proteinG: Number(read('proteinG') ?? 0),
    carbsG: Number(read('carbsG') ?? 0),
    fatG: Number(read('fatG') ?? 0),
  };
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  pills: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  detailCard: { gap: spacing.lg },
  notes: { fontSize: 16, lineHeight: 24 },
});
