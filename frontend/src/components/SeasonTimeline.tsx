import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useDateFnsLocale } from '../i18n/dateLocale';

export interface SeasonRow {
  label: string;
  months: number[];
  /** Copper cells (harvest) vs forest cells (default). */
  tone?: 'forest' | 'copper';
}

interface SeasonTimelineProps {
  rows: SeasonRow[];
  /** 1-12; draws a copper "today" line at this month. */
  currentMonth: number;
}

/**
 * Botanical-atlas season timeline: a 12-month header row, one row per non-empty
 * SeasonRow with active/harvest cells, and a copper vertical "today" marker.
 */
export function SeasonTimeline({ rows, currentMonth }: SeasonTimelineProps) {
  const { t } = useTranslation();
  const locale = useDateFnsLocale();
  const visible = rows.filter((r) => r.months.length > 0);
  if (visible.length === 0) return null;

  const monthNames = Array.from({ length: 12 }, (_, i) =>
    format(new Date(2000, i, 1), 'LLLLL', { locale }),
  );
  // 0-based fractional position of "today" across the 12 columns (center of column).
  const todayFrac = (currentMonth - 0.5) / 12;
  const todayLeft = `calc(16px + ${todayFrac} * (100% - 32px))`;

  return (
    <div className="overflow-hidden rounded-md border border-line bg-surface">
      {/* Header row with month initials */}
      <div className="flex items-center border-b border-line bg-paper">
        <div className="w-[120px] shrink-0 self-stretch border-r border-line sm:w-[130px]" />
        <div className="relative grid flex-1 grid-cols-12 gap-[3px] px-4 py-1.5">
          <span
            className="pointer-events-none absolute inset-y-0 w-px bg-copper/50"
            style={{ left: todayLeft }}
            aria-hidden="true"
          />
          {monthNames.map((m, i) => (
            <span
              key={i}
              className={`text-center text-[9px] font-semibold uppercase tracking-wide ${
                i + 1 === currentMonth ? 'font-bold text-copper' : 'text-ink-faint'
              }`}
            >
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* Data rows */}
      {visible.map((row, ri) => {
        const set = new Set(row.months);
        return (
          <div
            key={ri}
            className={`flex items-center ${ri < visible.length - 1 ? 'border-b border-line' : ''}`}
          >
            <div className="w-[120px] shrink-0 self-stretch border-r border-line px-4 py-3 text-xs font-medium text-ink sm:w-[130px]">
              {row.label}
            </div>
            <div className="relative grid flex-1 grid-cols-12 gap-[3px] px-4 py-2.5">
              <span
                className="pointer-events-none absolute inset-y-0 z-[2] w-px bg-copper/50"
                style={{ left: todayLeft }}
                aria-hidden="true"
              />
              {Array.from({ length: 12 }, (_, i) => {
                const active = set.has(i + 1);
                const isToday = i + 1 === currentMonth;
                const base = active
                  ? row.tone === 'copper'
                    ? 'bg-copper'
                    : 'bg-forest'
                  : 'bg-paper';
                return (
                  <span
                    key={i}
                    className={`h-[26px] rounded-[2px] ${base} ${
                      active && isToday ? 'ring-[1.5px] ring-copper' : ''
                    }`}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line bg-paper px-4 py-2.5">
        <span className="flex items-center gap-1.5 text-[10px] tracking-wide text-ink-soft">
          <span className="h-2.5 w-2.5 rounded-[2px] bg-forest" />
          {t('libraryPlant.timeline.legendSow')} / {t('libraryPlant.timeline.legendTransplant')}
        </span>
        <span className="flex items-center gap-1.5 text-[10px] tracking-wide text-ink-soft">
          <span className="h-2.5 w-2.5 rounded-[2px] bg-copper" />
          {t('libraryPlant.timeline.legendHarvest')}
        </span>
        <span className="flex items-center gap-1.5 text-[10px] tracking-wide text-ink-soft">
          <span className="h-3 w-0.5 rounded-sm bg-copper/65" />
          {t('libraryPlant.timeline.today')}
        </span>
      </div>
    </div>
  );
}
