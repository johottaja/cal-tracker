import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton, EmptyState, Heading, HeroCard, MacroProgress, Screen, Section } from '@/components/ui';
import { macroGradients, spacing, useAppTheme } from '@/constants/theme';
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
  const theme = useAppTheme();
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
      style={({ pressed }) => [
        styles.entry,
        { backgroundColor: theme.surface, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <View style={styles.entryHeader}>
        <View style={styles.entryTitleWrap}>
          <Text style={[styles.entryName, { color: theme.text }]} numberOfLines={2}>
            {entry.name}
          </Text>
          <Text style={[styles.entryMeta, { color: theme.muted }]}>
            {time} · {sourceLabels[entry.source]}
          </Text>
        </View>
        <Text style={[styles.calories, { color: theme.text }]}>{entry.calories} kcal</Text>
      </View>
      <MacroSummary values={entry} compact />
    </Pressable>
  );
}

export function DashboardScreen() {
  const theme = useAppTheme();
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

  return (
    <Screen style={{ paddingTop: insets.top + spacing.sm }}>
      {goals ? (
        <HeroCard>
          <Text style={styles.heroEyebrow}>{dateLabel}</Text>
          <Text style={styles.heroValue}>{Math.round(totals.calories)}</Text>
          <Text style={styles.heroUnit}>kcal logged today</Text>
          <View style={styles.heroTrack}>
            <LinearGradient
              colors={macroGradients.calories}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.heroFill, { width: `${calorieProgress * 100}%` }]}
            />
          </View>
          <Text style={styles.heroMeta}>
            {Math.round(goals.calories - totals.calories) >= 0
              ? `${Math.round(goals.calories - totals.calories)} kcal remaining`
              : `${Math.abs(Math.round(totals.calories - goals.calories))} kcal over goal`}
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
        <View style={styles.macroGrid}>
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
        <View style={styles.actions}>
          <ActionCard
            icon="✦"
            title="Describe"
            body="Estimate from text"
            onPress={() => router.push('/text-estimate')}
          />
          <ActionCard
            icon="＋"
            title="Manual"
            body="Enter exact values"
            onPress={() => router.push('/manual-entry')}
          />
          <ActionCard
            icon="★"
            title="Presets"
            body="Quick add favorites"
            onPress={() => router.push('/presets')}
          />
        </View>
      </Section>

      <Section title="Today’s entries" detail={`${entries.length} total`}>
        {entries.length ? (
          <View style={styles.entryList}>
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
                onPress={() => router.push('/manual-entry')}>
                <Text style={[styles.emptyAction, { color: theme.primary }]}>
                  Add your first entry
                </Text>
              </Pressable>
            }
          />
        )}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroEyebrow: { color: 'rgba(255,255,255,0.82)', fontSize: 14, fontWeight: '700' },
  heroValue: { color: '#FFFFFF', fontSize: 48, lineHeight: 52, fontWeight: '900', letterSpacing: -1.5 },
  heroUnit: { color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: '600' },
  heroTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.22)',
    marginTop: spacing.sm,
  },
  heroFill: { height: '100%', borderRadius: 999 },
  heroMeta: { color: 'rgba(255,255,255,0.78)', fontSize: 13, fontWeight: '600' },
  macroGrid: { gap: spacing.md },
  actions: { gap: spacing.sm },
  entryList: { gap: spacing.sm },
  entry: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.md,
  },
  pressed: { opacity: 0.7 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  entryTitleWrap: { flex: 1, gap: spacing.xs },
  entryName: { fontSize: 17, lineHeight: 21, fontWeight: '800' },
  entryMeta: { fontSize: 12, lineHeight: 16 },
  calories: { fontSize: 15, fontWeight: '800' },
  emptyAction: { fontSize: 15, fontWeight: '800', paddingVertical: spacing.sm },
});
