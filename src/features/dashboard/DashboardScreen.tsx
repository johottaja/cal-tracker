import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen } from '@/components/ui';
import { todayLocalDate } from '@/domain/dates';
import { addMacros, zeroMacros } from '@/domain/macros';
import { MacroGauge } from '@/features/dashboard/MacroGauge';
import {
  JournalCard,
  JournalEmpty,
  QuickLogGrid,
} from '@/features/dashboard/DashboardUI';
import { InlineNotice } from '@/features/shared/FeatureUI';
import { useApp } from '@/providers/AppProvider';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

export function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { entriesForDate, goals, online } = useApp();
  const date = todayLocalDate();
  const entries = entriesForDate(date);
  const totals = useMemo(() => addMacros(zeroMacros(), ...entries), [entries]);
  const dateLabel = dateFormatter.format(new Date());
  const entryLabel = entries.length === 1 ? '1 meal' : `${entries.length} meals`;

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

      <View className="gap-6 pt-2">
        <View className="gap-3">
          <Text className="text-base font-extrabold tracking-tight text-foreground">Add a meal</Text>
          <QuickLogGrid />
        </View>

        <View className="gap-3">
          <View className="flex-row items-baseline justify-between">
            <Text className="text-base font-extrabold tracking-tight text-foreground">
              Logged today
            </Text>
            <Text className="text-[13px] font-semibold text-muted-foreground">{entryLabel}</Text>
          </View>
          {entries.length ? <JournalCard entries={entries} /> : <JournalEmpty />}
        </View>
      </View>
    </Screen>
  );
}
