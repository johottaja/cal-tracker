import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { Card, EmptyState, Heading, Screen, Section, SegmentedControl } from '@/components/ui';
import { macroColors, radii, spacing, useAppTheme } from '@/constants/theme';
import {
  addLocalDays,
  asLocalDate,
  endOfLocalYear,
  localDateRange,
  startOfLocalMonth,
  startOfLocalYear,
  todayLocalDate,
} from '@/domain/dates';
import { zeroMacros } from '@/domain/macros';
import type { DailyTotal, LocalDate, MacroKey, MacroValues, SuccessState } from '@/domain/models';
import { macroSuccess } from '@/domain/success';
import { InlineNotice, macroMeta, MacroSummary } from '@/features/shared/FeatureUI';
import { useApp } from '@/providers/AppProvider';

const views = ['Trend', 'Success'] as const;
const periods = ['Week', 'Month', 'Year'] as const;
const macros = ['Calories', 'Protein', 'Carbs', 'Fat'] as const;
const successPeriods = ['7 days', '30 days'] as const;
type Period = (typeof periods)[number];
type MacroLabel = (typeof macros)[number];

const macroKeys: Record<MacroLabel, MacroKey> = {
  Calories: 'calories',
  Protein: 'proteinG',
  Carbs: 'carbsG',
  Fat: 'fatG',
};

type ChartPoint = { label: string; value: number; date?: LocalDate };

function periodRange(period: Period, today: LocalDate): [LocalDate, LocalDate] {
  if (period === 'Week') return [addLocalDays(today, -6), today];
  if (period === 'Month') {
    const year = Number(today.slice(0, 4));
    const month = Number(today.slice(5, 7));
    const lastDay = new Date(year, month, 0).getDate();
    return [
      startOfLocalMonth(today),
      asLocalDate(`${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`),
    ];
  }
  return [startOfLocalYear(today), endOfLocalYear(today)];
}

function pointsForPeriod(
  period: Period,
  start: LocalDate,
  end: LocalDate,
  totals: DailyTotal[],
  macro: MacroKey,
): ChartPoint[] {
  const byDate = new Map(totals.map((total) => [total.localDate, total]));
  if (period !== 'Year') {
    return localDateRange(start, end).map((date) => ({
      date,
      value: byDate.get(date)?.[macro] ?? 0,
      label:
        period === 'Week'
          ? new Intl.DateTimeFormat(undefined, { weekday: 'narrow' }).format(
              new Date(`${date}T12:00:00`),
            )
          : String(Number(date.slice(8))),
    }));
  }
  const year = Number(start.slice(0, 4));
  return Array.from({ length: 12 }, (_, month) => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const monthValues = totals.filter((total) => total.localDate.startsWith(prefix));
    const sum = monthValues.reduce((total, item) => total + item[macro], 0);
    const average = monthValues.length ? sum / monthValues.length : 0;
    return {
      label: new Intl.DateTimeFormat(undefined, { month: 'narrow' }).format(
        new Date(year, month, 1),
      ),
      value: Math.round(average * 10) / 10,
    };
  });
}

function TrendChart({
  points,
  goal,
  macro,
  yearAggregated,
}: {
  points: ChartPoint[];
  goal: number;
  macro: MacroKey;
  yearAggregated: boolean;
}) {
  const theme = useAppTheme();
  const width = 340;
  const height = 210;
  const left = 38;
  const right = 12;
  const top = 18;
  const bottom = 38;
  const max = Math.max(goal, ...points.map((point) => point.value), 1) * 1.12;
  const x = (index: number) =>
    left + (index * (width - left - right)) / Math.max(points.length - 1, 1);
  const y = (value: number) => top + (1 - value / max) * (height - top - bottom);
  const path = points
    .map((point, index) => `${index ? 'L' : 'M'} ${x(index)} ${y(point.value)}`)
    .join(' ');
  const labelEvery = points.length > 12 ? Math.ceil(points.length / 8) : 1;
  const description = `${macroMeta[macro].label} trend. Goal ${goal} ${macroMeta[macro].unit}. ${points
    .map((point) => `${point.label} ${Math.round(point.value)}`)
    .join(', ')}`;

  return (
    <View accessibilityRole="image" accessibilityLabel={description} style={styles.chartWrap}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Line
          x1={left}
          x2={width - right}
          y1={y(goal)}
          y2={y(goal)}
          stroke={theme.warning}
          strokeDasharray="5 4"
          strokeWidth={2}
        />
        <SvgText x={left} y={Math.max(y(goal) - 5, 10)} fill={theme.warning} fontSize={10}>
          Goal {Math.round(goal)}
        </SvgText>
        <Line
          x1={left}
          x2={width - right}
          y1={height - bottom}
          y2={height - bottom}
          stroke={theme.border}
          strokeWidth={1}
        />
        <Path d={path} fill="none" stroke={macroColors[macro]} strokeWidth={3} />
        {points.map((point, index) =>
          point.date ? (
            <Circle
              key={`${point.label}-${index}`}
              cx={x(index)}
              cy={y(point.value)}
              r={points.length > 31 ? 2 : 4}
              fill={macroColors[macro]}
              onPress={() =>
                router.push({ pathname: '/day-detail', params: { date: point.date as string } })
              }
            />
          ) : (
            <Circle
              key={`${point.label}-${index}`}
              cx={x(index)}
              cy={y(point.value)}
              r={points.length > 31 ? 2 : 4}
              fill={macroColors[macro]}
            />
          ),
        )}
        {points.map((point, index) =>
          index % labelEvery === 0 || index === points.length - 1 ? (
            <SvgText
              key={`label-${point.label}-${index}`}
              x={x(index)}
              y={height - 14}
              fill={theme.muted}
              fontSize={10}
              textAnchor="middle">
              {point.label}
            </SvgText>
          ) : null,
        )}
      </Svg>
      {yearAggregated ? (
        <Text style={[styles.chartNote, { color: theme.muted }]}>
          Year view shows average logged daily value for each calendar month.
        </Text>
      ) : null}
    </View>
  );
}

function TrendView() {
  const { goals, dailyTotals } = useApp();
  const [period, setPeriod] = useState<Period>('Week');
  const [macroLabel, setMacroLabel] = useState<MacroLabel>('Calories');
  const today = todayLocalDate();
  const [start, end] = periodRange(period, today);
  const key = macroKeys[macroLabel];
  const totals = dailyTotals(start, end);
  const points = pointsForPeriod(period, start, end, totals, key);

  if (!goals) return <InlineNotice kind="error">Set daily goals before comparing trends.</InlineNotice>;

  return (
    <View style={styles.sectionGap}>
      <SegmentedControl values={periods} value={period} onChange={setPeriod} />
      <SegmentedControl values={macros} value={macroLabel} onChange={setMacroLabel} />
      <Card style={styles.chartCard}>
        <TrendChart
          points={points}
          goal={goals[key]}
          macro={key}
          yearAggregated={period === 'Year'}
        />
      </Card>
      {!totals.length ? (
        <EmptyState
          title="No data in this period"
          body="The chart will fill in as you log meals."
        />
      ) : null}
    </View>
  );
}

const stateLabels: Record<SuccessState, string> = {
  met: 'met',
  not_met: 'not met',
  no_data: 'no logged data',
};

function SuccessView() {
  const theme = useAppTheme();
  const { goals, dailyTotals } = useApp();
  const [period, setPeriod] = useState<(typeof successPeriods)[number]>('7 days');
  const days = period === '7 days' ? 7 : 30;
  const end = todayLocalDate();
  const start = addLocalDays(end, -(days - 1));
  const dates = localDateRange(start, end);
  const byDate = new Map(dailyTotals(start, end).map((total) => [total.localDate, total]));
  const keys: MacroKey[] = ['calories', 'proteinG', 'carbsG', 'fatG'];

  if (!goals) return <InlineNotice kind="error">Set daily goals before viewing success.</InlineNotice>;

  const colorFor = (state: SuccessState) =>
    state === 'met'
      ? theme.success
      : state === 'not_met'
        ? theme.error
        : theme.border;

  return (
    <View style={styles.sectionGap}>
      <SegmentedControl values={successPeriods} value={period} onChange={setPeriod} />
      <ScrollView horizontal showsHorizontalScrollIndicator accessibilityLabel="Daily success grid">
        <View style={styles.successTable}>
          <View style={styles.successRow}>
            <View style={styles.rowLabel} />
            {dates.map((date) => (
              <Text key={date} style={[styles.dayLabel, { color: theme.muted }]}>
                {date.slice(8)}
              </Text>
            ))}
          </View>
          {keys.map((key) => (
            <View key={key} style={styles.successRow}>
              <Text style={[styles.rowLabelText, { color: theme.text }]}>
                {macroMeta[key].shortLabel}
              </Text>
              {dates.map((date) => {
                const total = byDate.get(date);
                const state = macroSuccess(key, total?.[key] ?? 0, goals[key], Boolean(total));
                return (
                  <Pressable
                    key={date}
                    accessibilityRole="button"
                    accessibilityLabel={`${date}, ${macroMeta[key].label}, ${stateLabels[state]}`}
                    accessibilityHint="Opens entries for this day"
                    onPress={() => router.push({ pathname: '/day-detail', params: { date } })}
                    style={[styles.successCell, { backgroundColor: colorFor(state) }]}>
                    <Text style={styles.cellMark}>
                      {state === 'met' ? '✓' : state === 'not_met' ? '×' : '–'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={styles.legend}>
        <Text style={[styles.legendText, { color: theme.text }]}>● Met</Text>
        <Text style={[styles.legendText, { color: theme.text }]}>× Not met</Text>
        <Text style={[styles.legendText, { color: theme.text }]}>– No logged data</Text>
      </View>
      <Text style={[styles.chartNote, { color: theme.muted }]}>
        Protein succeeds at or above goal. Calories, carbohydrates, and fat succeed at or below goal.
      </Text>
    </View>
  );
}

export function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<(typeof views)[number]>('Trend');
  const { online } = useApp();
  return (
    <Screen style={{ paddingTop: insets.top + spacing.sm }}>
      <Heading title="History" subtitle="See patterns without losing the daily detail." />
      {!online ? <InlineNotice kind="offline">Showing cached history while offline.</InlineNotice> : null}
      <SegmentedControl values={views} value={view} onChange={setView} />
      <Section
        title={view === 'Trend' ? 'Daily trend' : 'Goal success'}
        {...(view === 'Trend' ? { detail: 'Current goals' } : {})}>
        {view === 'Trend' ? <TrendView /> : <SuccessView />}
      </Section>
    </Screen>
  );
}

export function DayDetailScreen() {
  const theme = useAppTheme();
  const params = useLocalSearchParams<{ date?: string }>();
  let date: LocalDate;
  try {
    date = asLocalDate(params.date ?? '');
  } catch {
    date = todayLocalDate();
  }
  const { entriesForDate, loadDate } = useApp();
  useEffect(() => {
    void loadDate(date);
  }, [date, loadDate]);
  const entries = entriesForDate(date);
  const totals: MacroValues = entries.reduce(
    (sum, entry) => ({
      calories: sum.calories + entry.calories,
      proteinG: sum.proteinG + entry.proteinG,
      carbsG: sum.carbsG + entry.carbsG,
      fatG: sum.fatG + entry.fatG,
    }),
    zeroMacros(),
  );
  return (
    <Screen>
      <Heading title={date} subtitle={`${entries.length} entries`} />
      <Card>
        <MacroSummary values={totals} />
      </Card>
      {entries.length ? (
        <View style={styles.sectionGap}>
          {entries.map((entry) => (
            <Pressable
              key={entry.id}
              accessibilityRole="button"
              accessibilityLabel={`${entry.name}, ${entry.calories} calories`}
              onPress={() =>
                router.push({ pathname: '/entry-detail', params: { id: entry.id } })
              }
              style={[styles.dayEntry, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.dayEntryName, { color: theme.text }]}>{entry.name}</Text>
              <Text style={[styles.dayEntryValue, { color: theme.muted }]}>
                {entry.calories} kcal
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <EmptyState title="No entries" body="No food was logged for this day." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionGap: { gap: spacing.md },
  chartCard: { paddingHorizontal: spacing.xs, paddingVertical: spacing.md },
  chartWrap: { width: '100%', alignItems: 'center' },
  chartNote: { fontSize: 12, lineHeight: 18 },
  successTable: { gap: spacing.xs, paddingVertical: spacing.sm },
  successRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  rowLabel: { width: 74 },
  rowLabelText: { width: 74, fontSize: 12, fontWeight: '700' },
  dayLabel: { width: 30, textAlign: 'center', fontSize: 10 },
  successCell: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellMark: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  legendText: { fontSize: 12, fontWeight: '700' },
  dayEntry: {
    minHeight: 58,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.sm,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  dayEntryName: { flex: 1, fontSize: 16, fontWeight: '700' },
  dayEntryValue: { fontSize: 14, fontWeight: '700' },
});
