import { describe, expect, it } from 'vitest';
import {
  buildPeriods,
  daysUntilMonthStart,
  markerFraction,
  selectState,
  toWarsawDate,
  type SeasonPeriod,
  type WarsawDate,
} from './seasonCalendar.logic';

/** Build a Warsaw-noon Date for a given Y/M/D so DST never flips the day. */
function warsawNoon(year: number, month: number, day: number): Date {
  // 10:00 UTC is 11:00 or 12:00 Warsaw — always the same calendar day.
  return new Date(Date.UTC(year, month - 1, day, 10, 0, 0));
}

describe('buildPeriods — contiguous run grouping', () => {
  it('groups a single contiguous run into one period', () => {
    expect(buildPeriods([3, 4, 5], [], [])).toEqual<SeasonPeriod[]>([
      { kind: 'siew', startMonth: 3, endMonth: 5 },
    ]);
  });

  it('splits a non-contiguous array into multiple periods of the same kind', () => {
    expect(buildPeriods([5, 6, 9, 10], [], [])).toEqual<SeasonPeriod[]>([
      { kind: 'siew', startMonth: 5, endMonth: 6 },
      { kind: 'siew', startMonth: 9, endMonth: 10 },
    ]);
  });

  it('merges a run that wraps the year end into one period', () => {
    expect(buildPeriods([], [], [11, 12, 1, 2])).toEqual<SeasonPeriod[]>([
      { kind: 'zbior', startMonth: 11, endMonth: 2 },
    ]);
  });

  it('handles unsorted input and ignores empty arrays', () => {
    expect(buildPeriods([4, 3, 5], [], [])).toEqual<SeasonPeriod[]>([
      { kind: 'siew', startMonth: 3, endMonth: 5 },
    ]);
  });

  it('combines all three kinds', () => {
    const periods = buildPeriods([3, 4], [5], [7, 8]);
    expect(periods).toEqual<SeasonPeriod[]>([
      { kind: 'siew', startMonth: 3, endMonth: 4 },
      { kind: 'przesadzanie', startMonth: 5, endMonth: 5 },
      { kind: 'zbior', startMonth: 7, endMonth: 8 },
    ]);
  });
});

describe('markerFraction — today position on the 12-month axis', () => {
  it('places Jan 1 at the far left (0)', () => {
    expect(markerFraction({ year: 2026, month: 1, day: 1 })).toBeCloseTo(0, 6);
  });

  it('places mid-June correctly', () => {
    // June 15, 2026: (6-1 + 14/30) / 12.
    const expected = (6 - 1 + 14 / 30) / 12;
    expect(markerFraction({ year: 2026, month: 6, day: 15 })).toBeCloseTo(expected, 6);
  });

  it('places Dec 31 near the far right (< 1)', () => {
    const frac = markerFraction({ year: 2026, month: 12, day: 31 });
    expect(frac).toBeLessThan(1);
    expect(frac).toBeCloseTo((11 + 30 / 31) / 12, 6);
  });
});

describe('daysUntilMonthStart — day-level countdown', () => {
  it('counts days to a future month this year', () => {
    // From 2026-06-12 to 2026-09-01.
    const today: WarsawDate = { year: 2026, month: 6, day: 12 };
    // Jun 12 -> Sep 1: 19 (to Jul 1) + 31 (Jul) + 31 (Aug) = 81.
    expect(daysUntilMonthStart(today, 9)).toBe(81);
  });

  it('rolls to next year when the target month already passed', () => {
    // From 2026-11-15 to next March 1 (2027).
    const today: WarsawDate = { year: 2026, month: 11, day: 15 };
    expect(daysUntilMonthStart(today, 3)).toBe(daysUntilMonthStart(today, 3));
    expect(daysUntilMonthStart(today, 3)).toBeGreaterThan(90);
  });

  it('returns 0 when today is the first of the target month', () => {
    expect(daysUntilMonthStart({ year: 2026, month: 4, day: 1 }, 4)).toBe(0);
  });
});

describe('selectState — the four cases (+ no-data)', () => {
  const sow: SeasonPeriod = { kind: 'siew', startMonth: 3, endMonth: 4 };
  const transplant: SeasonPeriod = { kind: 'przesadzanie', startMonth: 5, endMonth: 5 };
  const harvest: SeasonPeriod = { kind: 'zbior', startMonth: 7, endMonth: 9 };
  const periods = [sow, transplant, harvest];

  it('case none — no periods', () => {
    expect(selectState([], { year: 2026, month: 6, day: 1 })).toEqual({ case: 'none' });
  });

  it('case inside — today within a period', () => {
    const s = selectState(periods, { year: 2026, month: 8, day: 10 });
    expect(s.case).toBe('inside');
    if (s.case === 'inside') {
      expect(s.period).toEqual(harvest);
      // Days left to end of September (Sep 30) from Aug 10 = 51.
      expect(s.daysLeft).toBe(51);
    }
  });

  it('case before — today before the first period of the year', () => {
    const s = selectState(periods, { year: 2026, month: 1, day: 15 });
    expect(s.case).toBe('before');
    if (s.case === 'before') {
      expect(s.next).toEqual(sow);
      expect(s.daysUntil).toBeGreaterThan(0);
    }
  });

  it('case between — today in a gap after a finished period', () => {
    // June 12 is after sow (3-4) and transplant (5), before harvest (7-9).
    const s = selectState(periods, { year: 2026, month: 6, day: 12 });
    expect(s.case).toBe('between');
    if (s.case === 'between') {
      expect(s.after).toBe('przesadzanie');
      expect(s.next).toEqual(harvest);
      // To July 1 from June 12 = 19 days.
      expect(s.daysUntil).toBe(19);
    }
  });

  it('case after — today past every period this year', () => {
    const s = selectState(periods, { year: 2026, month: 11, day: 1 });
    expect(s.case).toBe('after');
    if (s.case === 'after') {
      expect(s.next).toEqual(sow);
      expect(s.nextYear).toBe(2027);
    }
  });
});

describe('selectState — year-wrap period', () => {
  it('treats today inside a wrapping harvest period as inside', () => {
    const periods = buildPeriods([], [], [11, 12, 1, 2]);
    const s = selectState(periods, { year: 2026, month: 1, day: 10 });
    expect(s.case).toBe('inside');
    if (s.case === 'inside') {
      expect(s.period).toEqual({ kind: 'zbior', startMonth: 11, endMonth: 2 });
      // Days left to Feb 28, 2026 from Jan 10, 2026 = 49.
      expect(s.daysLeft).toBe(49);
    }
  });
});

describe('toWarsawDate — timezone extraction', () => {
  it('reads the Warsaw calendar day from a fixed instant', () => {
    const d = toWarsawDate(warsawNoon(2026, 6, 12));
    expect(d).toEqual({ year: 2026, month: 6, day: 12 });
  });
});
