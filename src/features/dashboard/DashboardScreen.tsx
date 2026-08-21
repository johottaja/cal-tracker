import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton, EmptyState, Screen, Section } from '@/components/ui';
import { todayLocalDate } from '@/domain/dates';
import { addMacros, zeroMacros } from '@/domain/macros';
import type { FoodEntry } from '@/domain/models';
import { MacroGauge } from '@/features/dashboard/MacroGauge';
import {
  ActionCard,
  InlineNotice,
  MacroSummary,
  sourceLabels,
} from '@/features/shared/FeatureUI';
import { useApp } from '@/providers/AppProvider';

function EntryRow({ entry }: { entry: FoodEntry }) {
  const time = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(entry.loggedAt));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${entry.name}, ${entry.calories} calories, ${sourceLabels[entry.source]}`}
      accessibilityHint="Opens entry details"
      onPress={() => router.push({ pathname: '/entry-detail', params: { id: entry.id } })}
      className="gap-3 rounded-md border border-border bg-card p-4 active:opacity-70">
      <View className="flex-row justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text className="text-[17px] font-extrabold leading-[21px] text-foreground" numberOfLines={2}>
            {entry.name}
          </Text>
          <Text className="text-xs leading-4 text-muted-foreground">
            {time} · {sourceLabels[entry.source]}
          </Text>
        </View>
        <Text className="text-[15px] font-extrabold text-foreground">{entry.calories} kcal</Text>
      </View>
      <MacroSummary values={entry} compact />
    </Pressable>
  );
}

export function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { entriesForDate, goals, online } = useApp();
  const date = todayLocalDate();
  const entries = entriesForDate(date);
  const totals = useMemo(() => addMacros(zeroMacros(), ...entries), [entries]);
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
  return (
    <Screen style={{ paddingTop: insets.top + 8 }}>
      {goals ? (
        <View className="gap-4">
          <Text className="text-center text-sm font-bold text-muted-foreground">{dateLabel}</Text>
          <MacroGauge
            size="hero"
            macro="calories"
            consumed={totals.calories}
            goal={goals.calories}
          />
          <View className="flex-row gap-2">
            <MacroGauge
              size="mini"
              macro="proteinG"
              consumed={totals.proteinG}
              goal={goals.proteinG}
            />
            <MacroGauge
              size="mini"
              macro="carbsG"
              consumed={totals.carbsG}
              goal={goals.carbsG}
            />
            <MacroGauge
              size="mini"
              macro="fatG"
              consumed={totals.fatG}
              goal={goals.fatG}
            />
          </View>
        </View>
      ) : (
        <InlineNotice kind="error">Daily goals are unavailable. Open Settings to restore them.</InlineNotice>
      )}

      {!online ? (
        <InlineNotice kind="offline">
          You’re offline. Changes are saved on this device and will sync later.
        </InlineNotice>
      ) : null}

      <Section title="Log food">
        <AppButton
          label="Take a meal photo"
          onPress={() => router.push('/capture-photo')}
          accessibilityHint="Opens camera and photo selection"
        />
        <View className="gap-2">
          <ActionCard
            icon="sparkles-outline"
            title="Describe"
            body="Estimate from text"
            onPress={() => router.push('/text-estimate')}
          />
          <ActionCard
            icon="create-outline"
            title="Manual"
            body="Enter exact values"
            onPress={() => router.push('/manual-entry')}
          />
          <ActionCard
            icon="star-outline"
            title="Presets"
            body="Quick add favorites"
            onPress={() => router.push('/presets')}
          />
        </View>
      </Section>

      <Section title="Today’s entries" detail={`${entries.length} total`}>
        {entries.length ? (
          <View className="gap-2">
            {entries.map((entry) => (
              <EntryRow key={entry.id} entry={entry} />
            ))}
          </View>
        ) : (
          <EmptyState
            title="Nothing logged yet"
            body="Start with a photo, a description, a preset, or exact values."
            action={
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/manual-entry')}
                className="min-h-[44px] justify-center py-2 active:opacity-70">
                <Text className="text-[15px] font-extrabold text-primary">Add your first entry</Text>
              </Pressable>
            }
          />
        )}
      </Section>
    </Screen>
  );
}
