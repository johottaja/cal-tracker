import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton, EmptyState, Heading, HeroCard, MacroProgress, Screen, Section } from '@/components/ui';
import { todayLocalDate } from '@/domain/dates';
import { addMacros, zeroMacros } from '@/domain/macros';
import type { FoodEntry } from '@/domain/models';
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
  const calorieProgress = goals && goals.calories > 0 ? Math.min(totals.calories / goals.calories, 1) : 0;
  const remaining = goals ? Math.round(goals.calories - totals.calories) : 0;

  return (
    <Screen style={{ paddingTop: insets.top + 8 }}>
      {goals ? (
        <HeroCard>
          <Text className="text-sm font-bold text-hero-muted">{dateLabel}</Text>
          <Text className="text-5xl font-black tracking-tight text-hero-foreground">
            {Math.round(totals.calories)}
          </Text>
          <Text className="text-base font-semibold text-hero-muted">kcal logged today</Text>
          <View className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
            <View className="h-full rounded-full bg-accent" style={{ width: `${calorieProgress * 100}%` }} />
          </View>
          <Text className="text-[13px] font-semibold text-hero-muted">
            {remaining >= 0 ? `${remaining} kcal remaining` : `${Math.abs(remaining)} kcal over goal`}
          </Text>
        </HeroCard>
      ) : null}

      <Heading
        title="Today"
        subtitle={`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} logged`}
      />
      {!online ? (
        <InlineNotice kind="offline">
          You’re offline. Changes are saved on this device and will sync later.
        </InlineNotice>
      ) : null}

      {goals ? (
        <View className="gap-3">
          <MacroProgress
            label="Calories"
            consumed={totals.calories}
            goal={goals.calories}
            unit="kcal"
            macro="calories"
          />
          <MacroProgress
            label="Protein"
            consumed={totals.proteinG}
            goal={goals.proteinG}
            unit="g"
            macro="proteinG"
          />
          <MacroProgress
            label="Carbohydrates"
            consumed={totals.carbsG}
            goal={goals.carbsG}
            unit="g"
            macro="carbsG"
          />
          <MacroProgress
            label="Fat"
            consumed={totals.fatG}
            goal={goals.fatG}
            unit="g"
            macro="fatG"
          />
        </View>
      ) : (
        <InlineNotice kind="error">Daily goals are unavailable. Open Settings to restore them.</InlineNotice>
      )}

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
