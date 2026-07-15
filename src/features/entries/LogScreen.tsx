import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton, EmptyState, Heading, Screen, Section } from '@/components/ui';
import { spacing, useAppTheme } from '@/constants/theme';
import type { Preset } from '@/domain/models';
import { ActionCard, InlineNotice, MacroSummary } from '@/features/shared/FeatureUI';
import { useApp } from '@/providers/AppProvider';

function FavoritePreset({
  preset,
  onQuickAdd,
}: {
  preset: Preset;
  onQuickAdd: (preset: Preset) => void;
}) {
  const theme = useAppTheme();
  return (
    <View style={[styles.preset, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Quick add ${preset.name}`}
        accessibilityHint="Logs this preset for today"
        onPress={() => onQuickAdd(preset)}
        style={({ pressed }) => [styles.presetMain, pressed && styles.pressed]}>
        <View style={styles.presetHeader}>
          <View style={styles.presetTitle}>
            <Text style={[styles.presetName, { color: theme.text }]}>{preset.name}</Text>
            {preset.servingLabel ? (
              <Text style={[styles.caption, { color: theme.muted }]}>{preset.servingLabel}</Text>
            ) : null}
          </View>
          <Text style={[styles.add, { color: theme.primary }]}>＋ Add</Text>
        </View>
        <MacroSummary values={preset} compact />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit ${preset.name}`}
        onPress={() =>
          router.push({ pathname: '/preset-editor', params: { id: preset.id } })
        }
        hitSlop={8}
        style={styles.edit}>
        <Text style={[styles.editText, { color: theme.muted }]}>Edit preset</Text>
      </Pressable>
    </View>
  );
}

export function LogScreen() {
  const insets = useSafeAreaInsets();
  const { online, presets, quickAddPreset, deleteEntry } = useApp();
  const [message, setMessage] = useState<string | null>(null);
  const [undoId, setUndoId] = useState<string | null>(null);
  const favorites = presets.filter((preset) => preset.isFavorite).slice(0, 5);

  const quickAdd = async (preset: Preset) => {
    try {
      const entry = await quickAddPreset(preset);
      setUndoId(entry.id);
      setMessage(`${preset.name} added to today.`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Could not add preset.');
    }
  };

  const undo = async () => {
    if (!undoId) return;
    await deleteEntry(undoId);
    setUndoId(null);
    setMessage('Quick add undone.');
  };

  return (
    <Screen style={{ paddingTop: insets.top + spacing.sm }}>
      <Heading title="Log" subtitle="Choose the fastest way to capture what you ate." />
      {!online ? (
        <InlineNotice kind="offline">
          AI estimates need a connection. Manual entries and presets still work offline.
        </InlineNotice>
      ) : null}
      {message ? (
        <InlineNotice
          kind={undoId ? 'success' : 'info'}
          action={undoId ? <AppButton label="Undo" variant="ghost" onPress={() => void undo()} /> : undefined}>
          {message}
        </InlineNotice>
      ) : null}

      <Section title="Estimate">
        <View style={styles.actions}>
          <ActionCard
            icon="◉"
            title="Take or choose a photo"
            body="Review an estimate before saving"
            onPress={() => router.push('/capture-photo')}
          />
          <ActionCard
            icon="✦"
            title="Describe your food"
            body="Include the portion for a better estimate"
            onPress={() => router.push('/text-estimate')}
          />
        </View>
      </Section>

      <Section title="Exact values">
        <ActionCard
          icon="＋"
          title="Manual entry"
          body="Enter calories and macros yourself"
          onPress={() => router.push('/manual-entry')}
        />
      </Section>

      <Section title="Favorite presets" {...(favorites.length ? { detail: 'One-tap log' } : {})}>
        {favorites.length ? (
          <View style={styles.actions}>
            {favorites.map((preset) => (
              <FavoritePreset key={preset.id} preset={preset} onQuickAdd={(item) => void quickAdd(item)} />
            ))}
          </View>
        ) : (
          <EmptyState
            title="No favorites yet"
            body="Favorite a preset to keep your usual meals one tap away."
          />
        )}
        <AppButton label="Browse all presets" variant="secondary" onPress={() => router.push('/presets')} />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
  preset: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    overflow: 'hidden',
  },
  presetMain: { padding: spacing.lg, gap: spacing.md },
  pressed: { opacity: 0.7 },
  presetHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  presetTitle: { flex: 1, gap: 2 },
  presetName: { fontSize: 17, lineHeight: 21, fontWeight: '800' },
  caption: { fontSize: 12, lineHeight: 16 },
  add: { fontSize: 14, fontWeight: '800' },
  edit: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  editText: { fontSize: 13, fontWeight: '700' },
});
