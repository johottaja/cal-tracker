import {
  addLocalDays,
  endOfLocalMonth,
  endOfLocalYear,
  localDateRange,
  startOfLocalMonth,
  startOfLocalYear,
} from './dates';
import { addMacros, zeroMacros } from './macros';
import type {
  DailyTotal,
  HistoryDay,
  LocalDate,
  MacroValues,
} from './models';

export type HistoryPeriod = 'week' | 'month' | 'year';

export interface DateRange {
  startDate: LocalDate;
  endDate: LocalDate;
}

export interface MonthlyTotal extends MacroValues {
  month: string;
  hasData: boolean;
}

export function historyPeriodRange(
  period: HistoryPeriod,
  today: LocalDate,
): DateRange {
  switch (period) {
    case 'week':
      return { startDate: addLocalDays(today, -6), endDate: today };
    case 'month':
      return {
        startDate: startOfLocalMonth(today),
        endDate: endOfLocalMonth(today),
      };
    case 'year':
      return {
        startDate: startOfLocalYear(today),
        endDate: endOfLocalYear(today),
      };
  }
}

export function trailingDaysRange(
  dayCount: 7 | 30,
  today: LocalDate,
): DateRange {
  return { startDate: addLocalDays(today, -(dayCount - 1)), endDate: today };
}

export function fillHistoryDays(
  range: DateRange,
  totals: readonly DailyTotal[],
): HistoryDay[] {
  const byDate = new Map(totals.map((total) => [total.localDate, total]));
  return localDateRange(range.startDate, range.endDate).map((localDate) => {
    const total = byDate.get(localDate);
    return total
      ? { ...total, hasData: true }
      : { localDate, ...zeroMacros(), hasData: false };
  });
}

export function aggregateHistoryByMonth(
  days: readonly HistoryDay[],
): MonthlyTotal[] {
  const months = new Map<string, MonthlyTotal>();
  for (const day of days) {
    const month = day.localDate.slice(0, 7);
    const previous = months.get(month) ?? {
      month,
      ...zeroMacros(),
      hasData: false,
    };
    const totals = addMacros(previous, day);
    months.set(month, {
      month,
      ...totals,
      hasData: previous.hasData || day.hasData,
    });
  }
  return [...months.values()].sort((a, b) => a.month.localeCompare(b.month));
}
