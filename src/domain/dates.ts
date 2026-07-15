import type { LocalDate, UtcTimestamp } from './models';

const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function asLocalDate(value: string): LocalDate {
  const match = LOCAL_DATE_PATTERN.exec(value);
  if (!match) throw new Error(`Invalid local date: ${value}`);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Invalid local date: ${value}`);
  }
  return value as LocalDate;
}

export function asUtcTimestamp(value: string): UtcTimestamp {
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid UTC timestamp: ${value}`);
  }
  return parsed.toISOString() as UtcTimestamp;
}

export function nowUtc(now = new Date()): UtcTimestamp {
  return now.toISOString() as UtcTimestamp;
}

export function toLocalDate(date: Date): LocalDate {
  if (Number.isNaN(date.getTime())) throw new Error('Invalid date');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}` as LocalDate;
}

export function todayLocalDate(now = new Date()): LocalDate {
  return toLocalDate(now);
}

function toUtcCalendarDate(localDate: LocalDate): Date {
  const year = Number(localDate.slice(0, 4));
  const month = Number(localDate.slice(5, 7));
  const day = Number(localDate.slice(8, 10));
  return new Date(Date.UTC(year, month - 1, day));
}

export function addLocalDays(
  localDate: LocalDate,
  amount: number,
): LocalDate {
  if (!Number.isInteger(amount)) throw new Error('Day amount must be an integer');
  const date = toUtcCalendarDate(localDate);
  date.setUTCDate(date.getUTCDate() + amount);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate(),
  )}` as LocalDate;
}

export function compareLocalDates(a: LocalDate, b: LocalDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function localDateRange(
  startDate: LocalDate,
  endDate: LocalDate,
): LocalDate[] {
  if (compareLocalDates(startDate, endDate) > 0) {
    throw new Error('Start date must not be after end date');
  }

  const result: LocalDate[] = [];
  for (
    let current = startDate;
    compareLocalDates(current, endDate) <= 0;
    current = addLocalDays(current, 1)
  ) {
    result.push(current);
  }
  return result;
}

export function startOfLocalMonth(date: LocalDate): LocalDate {
  return `${date.slice(0, 7)}-01` as LocalDate;
}

export function endOfLocalMonth(date: LocalDate): LocalDate {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const nextMonthYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return addLocalDays(
    `${nextMonthYear}-${pad(nextMonth)}-01` as LocalDate,
    -1,
  );
}

export function startOfLocalYear(date: LocalDate): LocalDate {
  return `${date.slice(0, 4)}-01-01` as LocalDate;
}

export function endOfLocalYear(date: LocalDate): LocalDate {
  return `${date.slice(0, 4)}-12-31` as LocalDate;
}

export function timestampForLocalDate(
  localDate: LocalDate,
  time: { hours?: number; minutes?: number; seconds?: number } = {},
): UtcTimestamp {
  const year = Number(localDate.slice(0, 4));
  const month = Number(localDate.slice(5, 7));
  const day = Number(localDate.slice(8, 10));
  const date = new Date(
    year,
    month - 1,
    day,
    time.hours ?? 12,
    time.minutes ?? 0,
    time.seconds ?? 0,
    0,
  );
  return date.toISOString() as UtcTimestamp;
}
