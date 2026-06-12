import { useMemo } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { useDateFnsLocale } from '../i18n/dateLocale';
import {
  assignLanes,
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
  /**
   * Which part to render. 'status' = just the eyebrow + status sentence (placed
   * directly under the hero); 'axis' = just the lane timeline + month scale;
   * 'both' (default) = the full component.
   */
  section?: 'both' | 'status' | 'axis';
}

/** Segment fill colors — copper is reserved for harvest + today only. */
const KIND_COLOR: Record<PeriodKind, string> = {
  siew: '#1A2E1E', // forest
  przesadzanie: '#3D6342', // forest-light
  zbior: '#B5672A', // copper
};

/** Vertical rhythm of the stacked lanes (px). */
const LANE_HEIGHT = 13;
const LANE_GAP = 22;

interface Segment {
  kind: PeriodKind;
  leftPct: number;
  widthPct: number;
  /** True for the segment that should carry the period's label. */
  labelled: boolean;
}

/** Expand a (possibly wrapping) period into one or two visual segments. */
function periodToSegments(period: SeasonPeriod): Segment[] {
  const seg = (startMonth: number, endMonth: number): Omit<Segment, 'labelled'> => {
    const leftPct = ((startMonth - 1) / 12) * 100;
    const widthPct = ((endMonth - startMonth + 1) / 12) * 100;
    return { kind: period.kind, leftPct, widthPct };
  };

  if (period.endMonth >= period.startMonth) {
    return [{ ...seg(period.startMonth, period.endMonth), labelled: true }];
  }
  // Wrapping period: startMonth..12 and 1..endMonth. Label rides the longer one.
  const tail = seg(period.startMonth, 12);
  const head = seg(1, period.endMonth);
  const tailLonger = tail.widthPct >= head.widthPct;
  return [
    { ...tail, labelled: tailLonger },
    { ...head, labelled: !tailLonger },
  ];
}

/**
 * Per-plant "Kalendarz sezonowy" — a borderless answer to "what do I do with
 * this plant now, and what's next". The year axis comes first: periods are
 * stacked into non-overlapping lanes with a single copper today-line spanning
 * all lanes, then the status sentence + eyebrow sit below it.
 */
export function SeasonCalendar({
  sowMonths,
  transplantMonths,
  harvestMonths,
  today,
  section = 'both',
}: SeasonCalendarProps) {
  const { t } = useTranslation();
  const locale = useDateFnsLocale();

  const now = today ?? new Date();
  const warsaw = useMemo(() => toWarsawDate(now), [now]);

  const periods = useMemo(
    () => buildPeriods(sowMonths, transplantMonths, harvestMonths),
    [sowMonths, transplantMonths, harvestMonths],
  );

  const lanes = useMemo(() => assignLanes(periods), [periods]);

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

  const markerLeftPct = markerFraction(warsaw) * 100;

  // Total height of the stacked-lane block.
  const lanesHeight = lanes.length * LANE_HEIGHT + Math.max(0, lanes.length - 1) * LANE_GAP;

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
    <div>
      {section !== 'status' && hasPeriods && (
        <div className="mb-10 sm:mb-12">
          {/* AXIS — stacked lanes with a single today-line across all of them */}
          <div
            role="img"
            aria-label={axisLabel}
            className="relative"
            style={{ height: lanesHeight }}
          >
            {lanes.map((lane, laneIdx) => {
              const segments = lane.flatMap(periodToSegments);
              return (
                <div
                  key={laneIdx}
                  className="absolute inset-x-0"
                  style={{ top: laneIdx * (LANE_HEIGHT + LANE_GAP), height: LANE_HEIGHT }}
                >
                  {/* Lane track */}
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{ backgroundColor: 'var(--parchment-mid)' }}
                  />
                  {segments.map((s, i) => (
                    <div
                      key={i}
                      className="absolute"
                      style={{ left: `${s.leftPct}%`, width: `${s.widthPct}%`, top: 0, bottom: 0 }}
                    >
                      <div
                        className="season-seg h-full rounded-full"
                        style={{ backgroundColor: KIND_COLOR[s.kind] }}
                      />
                      {s.labelled && (
                        <span
                          className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-track"
                          style={{ bottom: 'calc(100% + 5px)' }}
                        >
                          {kindLabel(s.kind)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}

            {/* Today marker — single copper line across all lanes + cap dot */}
            <div
              className="pointer-events-none absolute top-0 bottom-0 -translate-x-1/2"
              style={{ left: `${markerLeftPct}%`, width: 2 }}
              aria-hidden="true"
            >
              <div
                className="absolute inset-y-0 left-1/2 -translate-x-1/2"
                style={{
                  width: 2,
                  backgroundColor: 'var(--copper)',
                  boxShadow: '0 0 6px rgba(181,103,42,0.35)',
                }}
              />
              <span
                className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ width: 9, height: 9, backgroundColor: 'var(--copper)' }}
              />
            </div>
          </div>

          {/* Month scale — full width below the lanes */}
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

      {section !== 'axis' && (
        <>
          {/* Eyebrow: DZIŚ · {date} */}
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-copper">
            {t('calendar.seasonTrack.eyebrow', { date: todayLabel })}
          </p>

          {/* Status sentence */}
          <p className="mt-3 max-w-[34ch] font-display text-[20px] font-semibold leading-[1.3] text-ink sm:text-[26px]">
            {sentence}
          </p>
        </>
      )}
    </div>
  );
}
