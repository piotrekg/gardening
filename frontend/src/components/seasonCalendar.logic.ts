/**
 * Pure, testable date/period logic for the per-plant season calendar.
 *
 * All wall-clock reasoning happens in Europe/Warsaw. Period boundaries are
 * month-level; the countdown is day-level (days until the first day of the next
 * period's start month). No React, no i18n, no DOM here — only data in/out so
 * the logic can be unit-tested with a fixed `today`.
 */

export type PeriodKind = 'siew' | 'przesadzanie' | 'zbior';

export interface SeasonPeriod {
  kind: PeriodKind;
  /** 1-12. */
  startMonth: number;
  /** 1-12. When endMonth < startMonth the period wraps the year end. */
  endMonth: number;
}

/** Calendar date as plain Y/M/D fields in Europe/Warsaw (month is 1-12). */
export interface WarsawDate {
  year: number;
  month: number;
  day: number;
}

const WARSAW_TZ = 'Europe/Warsaw';

/** Extract the Europe/Warsaw wall-clock Y/M/D for an instant. */
export function toWarsawDate(date: Date): WarsawDate {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: WARSAW_TZ,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);
  let year = 0;
  let month = 0;
  let day = 0;
  for (const p of parts) {
    if (p.type === 'year') year = Number(p.value);
    else if (p.type === 'month') month = Number(p.value);
    else if (p.type === 'day') day = Number(p.value);
  }
  return { year, month, day };
}

/** Days in a given month (1-12) of a given year. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Group a month array (1-12, unsorted, possibly non-contiguous, possibly
 * wrapping the year end) into contiguous runs. A run that includes both
 * December and January is merged into one wrapping period (e.g. [11,12,1,2]
 * becomes { startMonth: 11, endMonth: 2 }).
 */
function groupRuns(kind: PeriodKind, months: number[]): SeasonPeriod[] {
  const unique = Array.from(new Set(months.filter((m) => m >= 1 && m <= 12))).sort(
    (a, b) => a - b,
  );
  if (unique.length === 0) return [];
  if (unique.length === 12) {
    // Whole year — single period.
    return [{ kind, startMonth: 1, endMonth: 12 }];
  }

  // Build contiguous runs over the linear 1..12 axis.
  const runs: Array<[number, number]> = [];
  let runStart = unique[0];
  let prev = unique[0];
  for (let i = 1; i < unique.length; i++) {
    const m = unique[i];
    if (m === prev + 1) {
      prev = m;
    } else {
      runs.push([runStart, prev]);
      runStart = m;
      prev = m;
    }
  }
  runs.push([runStart, prev]);

  // Merge a Dec-ending run with a Jan-starting run into a single wrap.
  if (runs.length >= 2) {
    const first = runs[0];
    const last = runs[runs.length - 1];
    if (first[0] === 1 && last[1] === 12) {
      const wrapped: SeasonPeriod = { kind, startMonth: last[0], endMonth: first[1] };
      const middle = runs.slice(1, runs.length - 1);
      return [wrapped, ...middle.map(([s, e]) => ({ kind, startMonth: s, endMonth: e }))];
    }
  }

  return runs.map(([s, e]) => ({ kind, startMonth: s, endMonth: e }));
}

/**
 * Build all SeasonPeriods for a plant from its month arrays. Periods are
 * returned grouped by kind in the order siew, przesadzanie, zbior; within a
 * kind they follow the contiguous-run order from groupRuns.
 */
export function buildPeriods(
  sowMonths: number[],
  transplantMonths: number[],
  harvestMonths: number[],
): SeasonPeriod[] {
  return [
    ...groupRuns('siew', sowMonths),
    ...groupRuns('przesadzanie', transplantMonths),
    ...groupRuns('zbior', harvestMonths),
  ];
}

/**
 * Set of months (1-12) a period occupies, accounting for year-wrap. A wrapping
 * period (endMonth < startMonth) occupies [startMonth..12] plus [1..endMonth].
 */
function periodMonths(period: SeasonPeriod): Set<number> {
  const months = new Set<number>();
  if (period.endMonth >= period.startMonth) {
    for (let m = period.startMonth; m <= period.endMonth; m++) months.add(m);
  } else {
    for (let m = period.startMonth; m <= 12; m++) months.add(m);
    for (let m = 1; m <= period.endMonth; m++) months.add(m);
  }
  return months;
}

/** True when two periods share at least one calendar month (wrap-aware). */
export function periodsOverlap(a: SeasonPeriod, b: SeasonPeriod): boolean {
  const months = periodMonths(a);
  for (const m of periodMonths(b)) {
    if (months.has(m)) return true;
  }
  return false;
}

/**
 * Greedy interval lane-assignment. Periods are placed into the lowest-indexed
 * lane whose already-placed periods do not overlap (wrap-aware) with the
 * incoming period. Two periods may share a lane only if their month ranges do
 * NOT overlap. Input order is preserved within each lane.
 *
 * Returns an array of lanes, each lane being the list of periods on that row,
 * in the order siew, przesadzanie, zbior as produced by buildPeriods.
 */
export function assignLanes(periods: SeasonPeriod[]): SeasonPeriod[][] {
  const lanes: SeasonPeriod[][] = [];
  for (const period of periods) {
    let placed = false;
    for (const lane of lanes) {
      if (lane.every((p) => !periodsOverlap(p, period))) {
        lane.push(period);
        placed = true;
        break;
      }
    }
    if (!placed) lanes.push([period]);
  }
  return lanes;
}

/** True when `month` (1-12) falls inside the period, accounting for wrap. */
export function periodContainsMonth(period: SeasonPeriod, month: number): boolean {
  if (period.endMonth >= period.startMonth) {
    return month >= period.startMonth && month <= period.endMonth;
  }
  // Wrapping period: e.g. 11..2 covers 11,12,1,2.
  return month >= period.startMonth || month <= period.endMonth;
}

/**
 * Horizontal marker position on the 12-month axis as a fraction in [0, 1):
 * (month - 1 + (day - 1) / daysInMonth) / 12.
 */
export function markerFraction(date: WarsawDate): number {
  const dim = daysInMonth(date.year, date.month);
  return (date.month - 1 + (date.day - 1) / dim) / 12;
}

/** Whole days from `today` to the first day of `targetMonth` in the next occurrence. */
export function daysUntilMonthStart(today: WarsawDate, targetMonth: number): number {
  // Anchor both endpoints at UTC midnight to avoid DST drift; we only need a
  // day delta and both are constructed the same way.
  const todayUtc = Date.UTC(today.year, today.month - 1, today.day);
  let targetYear = today.year;
  if (targetMonth < today.month) targetYear = today.year + 1;
  else if (targetMonth === today.month && today.day > 1) targetYear = today.year + 1;
  const targetUtc = Date.UTC(targetYear, targetMonth - 1, 1);
  return Math.round((targetUtc - todayUtc) / 86_400_000);
}

/** Last calendar month (1-12) covered by a period (the wrap-aware end). */
function periodEndMonth(period: SeasonPeriod): number {
  return period.endMonth;
}

export type SeasonState =
  | { case: 'none' }
  | { case: 'inside'; period: SeasonPeriod; daysLeft: number }
  | {
      case: 'between';
      after: PeriodKind;
      next: SeasonPeriod;
      daysUntil: number;
    }
  | { case: 'before'; next: SeasonPeriod; daysUntil: number }
  | { case: 'after'; next: SeasonPeriod; daysUntil: number; nextYear: number };

/**
 * Order periods by their start month for chronological reasoning within the
 * current calendar year. Wrapping periods are treated as starting at their
 * startMonth (late in the year).
 */
function chronological(periods: SeasonPeriod[]): SeasonPeriod[] {
  return [...periods].sort((a, b) => a.startMonth - b.startMonth);
}

/**
 * Select the status state from periods + today. Four meaningful cases plus the
 * no-data case:
 *  1. inside  — today is within a period.
 *  2. before  — today is before the first period of the year.
 *  3. between — today sits in a gap after some period(s) but before another.
 *  4. after   — today is past every period this year.
 */
export function selectState(periods: SeasonPeriod[], today: WarsawDate): SeasonState {
  if (periods.length === 0) return { case: 'none' };

  const month = today.month;

  // 1. Inside any period?
  for (const p of periods) {
    if (periodContainsMonth(p, month)) {
      // Days left until the end of this period's last month (inclusive).
      const endMonth = periodEndMonth(p);
      // The end is the last day of endMonth; countdown to that day.
      let endYear = today.year;
      if (endMonth < month) endYear = today.year + 1; // wrapping period
      const lastDay = daysInMonth(endYear, endMonth);
      const todayUtc = Date.UTC(today.year, today.month - 1, today.day);
      const endUtc = Date.UTC(endYear, endMonth - 1, lastDay);
      const daysLeft = Math.round((endUtc - todayUtc) / 86_400_000);
      return { case: 'inside', period: p, daysLeft };
    }
  }

  const ordered = chronological(periods);
  const firstStart = ordered[0].startMonth;
  // Last covered month across all periods (ignoring wrap for "after" detection).
  const maxEnd = Math.max(...ordered.map((p) => (p.endMonth >= p.startMonth ? p.endMonth : 12)));

  // 2. Before the first period of the year.
  if (month < firstStart) {
    return {
      case: 'before',
      next: ordered[0],
      daysUntil: daysUntilMonthStart(today, ordered[0].startMonth),
    };
  }

  // 3. Between periods — find the next period whose start is still ahead.
  const upcoming = ordered.find((p) => p.startMonth > month);
  if (upcoming) {
    // The most recently finished period determines the "state description".
    const finished = ordered.filter((p) => (p.endMonth >= p.startMonth ? p.endMonth : 12) < month);
    const last = finished[finished.length - 1] ?? ordered[0];
    return {
      case: 'between',
      after: last.kind,
      next: upcoming,
      daysUntil: daysUntilMonthStart(today, upcoming.startMonth),
    };
  }

  // 4. After the last period — next sowing is next year. Prefer a siew period
  // for the "next sowing" target; fall back to the earliest period.
  void maxEnd;
  const firstSow = ordered.find((p) => p.kind === 'siew') ?? ordered[0];
  return {
    case: 'after',
    next: firstSow,
    daysUntil: daysUntilMonthStart(today, firstSow.startMonth),
    nextYear: today.year + 1,
  };
}
