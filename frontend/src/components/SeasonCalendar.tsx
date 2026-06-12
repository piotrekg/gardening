import { useMemo } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { useDateFnsLocale } from '../i18n/dateLocale';
import {
  buildPeriods,
  markerFraction,
  type PeriodKind,
  type SeasonPeriod,
  selectState,
  toWarsawDate,
} from './seasonCalendar.logic';

interface SeasonCalendarProps {
  sowMonths: number[];
  transplantMonths: number[];
  harvestMonths: number[];
  /** Injectable "now" for tests; defaults to the real clock. */
  today?: Date;
}

/** Segment fill colors — copper is reserved for harvest + today only. */
const KIND_COLOR: Record<PeriodKind, string> = {
  siew: '#1A2E1E', // forest
  przesadzanie: '#3D6342', // forest-light
  zbior: '#B5672A', // copper
};

interface Segment {
  kind: PeriodKind;
  leftPct: number;
  widthPct: number;
  /** Center of this visual segment, 0-100. */
  centerPct: number;
  /** True for the segment that should carry the period's label. */
  labelled: boolean;
  /** When true, push the label below the track to avoid overlap. */
  labelBelow: boolean;
}

/** Expand a (possibly wrapping) period into one or two visual segments. */
function periodToSegments(period: SeasonPeriod): Segment[] {
  const seg = (startMonth: number, endMonth: number): Omit<Segment, 'labelled' | 'labelBelow'> => {
    const leftPct = ((startMonth - 1) / 12) * 100;
    const widthPct = ((endMonth - startMonth + 1) / 12) * 100;
    return { kind: period.kind, leftPct, widthPct, centerPct: leftPct + widthPct / 2 };
  };

  if (period.endMonth >= period.startMonth) {
    return [{ ...seg(period.startMonth, period.endMonth), labelled: true, labelBelow: false }];
  }
  // Wrapping period: startMonth..12 and 1..endMonth. Label rides the longer one.
  const tail = seg(period.startMonth, 12);
  const head = seg(1, period.endMonth);
  const tailLonger = tail.widthPct >= head.widthPct;
  return [
    { ...tail, labelled: tailLonger, labelBelow: false },
    { ...head, labelled: !tailLonger, labelBelow: false },
  ];
}

/**
 * Per-plant "Kalendarz sezonowy" — a single-track answer to "what do I do with
 * this plant now, and what's next": a status sentence, a today marker, and a
 * year axis with period segments. Replaces the old 3×12 grid.
 */
export function SeasonCalendar({
  sowMonths,
  transplantMonths,
  harvestMonths,
  today,
}: SeasonCalendarProps) {
  const { t } = useTranslation();
  const locale = useDateFnsLocale();

  const now = today ?? new Date();
  const warsaw = useMemo(() => toWarsawDate(now), [now]);

  const periods = useMemo(
    () => buildPeriods(sowMonths, transplantMonths, harvestMonths),
    [sowMonths, transplantMonths, harvestMonths],
  );

  const state = useMemo(() => selectState(periods, warsaw), [periods, warsaw]);

  // Localized "today" date for the eyebrow + aria-label.
  const todayLabel = format(new Date(warsaw.year, warsaw.month - 1, warsaw.day), 'd MMMM yyyy', {
    locale,
  });

  const kindLabel = (kind: PeriodKind): string =>
    t(
      kind === 'siew'
        ? 'calendar.seasonTrack.kindSiew'
        : kind === 'przesadzanie'
          ? 'calendar.seasonTrack.kindPrzesadzanie'
          : 'calendar.seasonTrack.kindZbior',
    );

  // Localized full month name. Standalone/nominative ("lipiec") for labels and
  // after a colon; formatting/genitive ("lipca") for "od {month}" phrases — in
  // Polish date-fns 'LLLL' is nominative and 'MMMM' is genitive (English: same).
  const monthName = (month: number): string =>
    format(new Date(2000, month - 1, 1), 'LLLL', { locale });
  const monthNameGen = (month: number): string =>
    format(new Date(2000, month - 1, 1), 'MMMM', { locale });

  // ---- Status sentence (with <em> accent via <Trans>) ----
  const unit = t('calendar.seasonTrack.dayUnit');
  let sentence: React.ReactNode;
  switch (state.case) {
    case 'none':
      sentence = t('calendar.seasonTrack.noData');
      break;
    case 'inside':
      sentence = (
        <Trans
          i18nKey="calendar.seasonTrack.inside"
          values={{ label: kindLabel(state.period.kind), count: state.daysLeft, unit }}
          components={{ em: <em className="not-italic text-copper" /> }}
        />
      );
      break;
    case 'between':
      sentence = (
        <Trans
          i18nKey="calendar.seasonTrack.between"
          values={{
            state: t(
              state.after === 'siew'
                ? 'calendar.seasonTrack.betweenAfterSiew'
                : state.after === 'przesadzanie'
                  ? 'calendar.seasonTrack.betweenAfterPrzesadzanie'
                  : 'calendar.seasonTrack.betweenAfterZbior',
            ),
            nextLabel: kindLabel(state.next.kind),
            count: state.daysUntil,
            unit,
            month: monthNameGen(state.next.startMonth),
          }}
          components={{ em: <em className="not-italic text-copper" /> }}
        />
      );
      break;
    case 'before':
      sentence = (
        <Trans
          i18nKey="calendar.seasonTrack.before"
          values={{ count: state.daysUntil, unit, month: monthNameGen(state.next.startMonth) }}
          components={{ em: <em className="not-italic text-copper" /> }}
        />
      );
      break;
    case 'after':
      sentence = (
        <Trans
          i18nKey="calendar.seasonTrack.after"
          values={{ month: monthName(state.next.startMonth), year: state.nextYear }}
          components={{ em: <em className="not-italic text-copper" /> }}
        />
      );
      break;
  }

  const hasPeriods = periods.length > 0;

  // ---- Axis geometry ----
  const segments: Segment[] = useMemo(() => {
    const all = periods.flatMap(periodToSegments);
    // Resolve label collisions: if two labelled segment centers are within ~9%
    // of each other, push the shorter one's label below the track.
    const labelled = all.filter((s) => s.labelled);
    for (let i = 0; i < labelled.length; i++) {
      for (let j = i + 1; j < labelled.length; j++) {
        if (Math.abs(labelled[i].centerPct - labelled[j].centerPct) < 9) {
          const shorter = labelled[i].widthPct <= labelled[j].widthPct ? labelled[i] : labelled[j];
          shorter.labelBelow = true;
        }
      }
    }
    return all;
  }, [periods]);

  const markerLeftPct = markerFraction(warsaw) * 100;

  // Month scale labels at positions 1, 4, 7, 10 (Jan, Apr, Jul, Oct).
  const scaleMonths = [1, 4, 7, 10];

  // aria-label: full schedule description.
  const scheduleText = periods
    .map((p) =>
      t('calendar.seasonTrack.axisSchedule', {
        kind: kindLabel(p.kind),
        range: t('calendar.seasonTrack.axisRange', {
          from: monthNameGen(p.startMonth),
          to: monthNameGen(p.endMonth),
        }),
      }),
    )
    .join(' ');
  const axisLabel = t('calendar.seasonTrack.axisLabel', {
    date: todayLabel,
    schedule: scheduleText,
  });

  return (
    <div
      className="rounded-[14px] border border-line bg-surface px-[18px] py-6 sm:px-[30px] sm:pb-[38px] sm:pt-[34px]"
    >
      {/* Eyebrow: DZIŚ · {date} */}
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-copper">
        {t('calendar.seasonTrack.eyebrow', { date: todayLabel })}
      </p>

      {/* Status sentence */}
      <p className="mt-3 max-w-[26ch] font-display text-[20px] font-semibold leading-[1.3] text-ink sm:text-[26px]">
        {sentence}
      </p>

      {hasPeriods && (
        <div className="mt-10">
          {/* Track + segments + today marker */}
          <div
            role="img"
            aria-label={axisLabel}
            className="relative"
            style={{ height: 14 }}
          >
            <div
              className="absolute inset-0 rounded-full"
              style={{ backgroundColor: 'var(--parchment-mid)' }}
            />
            {segments.map((s, i) => (
              <div key={i} className="absolute" style={{ left: `${s.leftPct}%`, width: `${s.widthPct}%`, top: 0, bottom: 0 }}>
                <div
                  className="season-seg h-full rounded-full"
                  style={{ backgroundColor: KIND_COLOR[s.kind] }}
                />
                {s.labelled && (
                  <span
                    className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-track"
                    style={s.labelBelow ? { top: 'calc(100% + 8px)' } : { top: -24 }}
                  >
                    {kindLabel(s.kind)}
                  </span>
                )}
              </div>
            ))}

            {/* Today marker */}
            <span
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: `${markerLeftPct}%`,
                width: 22,
                height: 22,
                backgroundColor: 'var(--color-surface)',
                border: '4px solid var(--copper)',
                boxShadow: '0 0 0 4px rgba(181,103,42,0.15)',
              }}
              aria-hidden="true"
            />
          </div>

          {/* Month scale */}
          <div className="mt-[14px] grid grid-cols-12">
            {Array.from({ length: 12 }, (_, i) => {
              const m = i + 1;
              const show = scaleMonths.includes(m);
              return (
                <span
                  key={i}
                  className="text-[10px] font-semibold uppercase tracking-wide text-ink-track"
                >
                  {show ? format(new Date(2000, i, 1), 'LLL', { locale }) : ''}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
