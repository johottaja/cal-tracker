import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton, EmptyState, Heading, Screen, Section } from '@/components/ui';
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
  return (
    <View className="overflow-hidden rounded-md border border-border bg-card">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Quick add ${preset.name}`}
        accessibilityHint="Logs this preset for today"
        onPress={() => onQuickAdd(preset)}
        className="gap-3 p-4 active:opacity-70">
        <View className="flex-row justify-between gap-3">
          <View className="flex-1 gap-0.5">
            <Text className="text-[17px] font-extrabold leading-[21px] text-foreground">
              {preset.name}
            </Text>
            {preset.servingLabel ? (
              <Text className="text-xs leading-4 text-muted-foreground">{preset.servingLabel}</Text>
            ) : null}
          </View>
          <Text className="text-sm font-extrabold text-primary">Add</Text>
        </View>
        <MacroSummary values={preset} compact />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit ${preset.name}`}
        onPress={() => router.push({ pathname: '/preset-editor', params: { id: preset.id } })}
        hitSlop={8}
        className="min-h-[44px] items-start justify-center px-4 active:opacity-70">
        <Text className="text-[13px] font-bold text-muted-foreground">Edit preset</Text>
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
    <Screen style={{ paddingTop: insets.top + 8 }}>
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
        <View className="gap-2">
          <ActionCard
            icon="camera-outline"
            title="Take or choose a photo"
            body="Review an estimate before saving"
            onPress={() => router.push('/capture-photo')}
          />
          <ActionCard
            icon="chatbubble-ellipses-outline"
            title="Describe your food"
            body="Include the portion for a better estimate"
            onPress={() => router.push('/text-estimate')}
          />
        </View>
      </Section>

      <Section title="Exact values">
        <ActionCard
          icon="create-outline"
          title="Manual entry"
          body="Enter calories and macros yourself"
          onPress={() => router.push('/manual-entry')}
        />
      </Section>

      <Section title="Favorite presets" {...(favorites.length ? { detail: 'One-tap log' } : {})}>
        {favorites.length ? (
          <View className="gap-2">
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
