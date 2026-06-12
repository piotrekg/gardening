import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Lightbulb, Snowflake, Sprout, Wheat } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { format } from 'date-fns';
import { getCalendar } from '../api/calendar';
import { getApiErrorMessage } from '../api/client';
import { SeasonalTip } from '../components/SeasonalTip';
import { Skeleton } from '../components/Skeleton';
import { useDateFnsLocale } from '../i18n/dateLocale';
import { useLibraryPlantName } from '../i18n/libraryName';
import type { CalendarResponse, PlantInstance } from '../types';

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function TaskSection({
  title,
  icon: Icon,
  items,
  emptyText,
}: {
  title: string;
  icon: LucideIcon;
  items: PlantInstance[];
  emptyText: string;
}) {
  return (
    <section className="card p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
        <Icon className="h-4 w-4 text-accent" strokeWidth={1.75} aria-hidden="true" />
        {title}
        <span className="ml-auto rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-ink-soft">
          {items.length}
        </span>
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-ink-faint">{emptyText}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((p) => (
            <li key={p.id}>
              <Link
                to={`/gardens/${p.garden_id}/plants/${p.id}`}
                className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition hover:bg-surface-2"
              >
                <span className="font-medium text-ink">{p.display_name}</span>
                {p.library && (
                  <span className="truncate text-xs italic text-ink-faint">
                    {p.library.latin_name}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function CalendarPage() {
  const { t } = useTranslation();
  const dateLocale = useDateFnsLocale();
  const { name: libName } = useLibraryPlantName();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<CalendarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCalendar(month, year)
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, t('calendar.loadError')));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [month, year, t]);

  const shift = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setMonth(m);
    setYear(y);
  };

  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();
  const monthName = (m: number) => capitalize(format(new Date(2000, m - 1, 1), 'LLLL', { locale: dateLocale }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow mb-2">{t('pageEyebrow.calendar')}</p>
          <h1 className="text-h1 font-semibold tracking-tight text-ink">{t('calendar.title')}</h1>
          <p className="mt-1 text-sm text-ink-soft">{t('calendar.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shift(-1)}
            className="btn-secondary !px-2.5"
            aria-label={t('calendar.prevMonth')}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="min-w-40 text-center font-display text-base font-semibold text-primary-dark">
            {monthName(month)} {year}
          </span>
          <button
            type="button"
            onClick={() => shift(1)}
            className="btn-secondary !px-2.5"
            aria-label={t('calendar.nextMonth')}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={() => {
                setMonth(now.getMonth() + 1);
                setYear(now.getFullYear());
              }}
              className="text-xs font-medium text-primary hover:underline"
            >
              {t('calendar.today')}
            </button>
          )}
        </div>
      </div>

      {error ? (
        <div className="card p-6 text-center text-sm text-danger">{error}</div>
      ) : loading && !data ? (
        <div className="space-y-4">
          <Skeleton className="h-16" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        </div>
      ) : data ? (
        <div className={`space-y-6 ${loading ? 'opacity-60' : ''}`}>
          {data.frost_warning && (
            <div className="flex items-start gap-3 rounded-xl border border-frost-line bg-frost-bg p-4" role="alert">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-frost-bg text-frost">
                <Snowflake className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-frost">{t('calendar.frostTitle')}</p>
                <p className="mt-0.5 text-sm text-frost/90">{data.frost_note}</p>
              </div>
            </div>
          )}

          <SeasonalTip month={data.month} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <TaskSection
              title={t('calendar.sow')}
              icon={Sprout}
              items={data.garden_tasks.sow}
              emptyText={t('calendar.sowEmpty')}
            />
            <TaskSection
              title={t('calendar.transplant')}
              icon={Sprout}
              items={data.garden_tasks.transplant}
              emptyText={t('calendar.transplantEmpty')}
            />
            <TaskSection
              title={t('calendar.harvest')}
              icon={Wheat}
              items={data.garden_tasks.harvest}
              emptyText={t('calendar.harvestEmpty')}
            />
          </div>

          <section className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
              <Lightbulb className="h-4 w-4 text-clay" strokeWidth={1.75} aria-hidden="true" />
              {t('calendar.recommended', { month: monthName(data.month) })}
            </h2>
            {data.recommendations.length === 0 ? (
              <p className="text-sm text-ink-faint">{t('calendar.recommendedEmpty')}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {data.recommendations.map((p) => (
                  <Link
                    key={p.id}
                    to={`/library/${p.id}`}
                    className="rounded-full border border-line bg-primary-light px-3 py-1 text-xs font-semibold text-primary-dark transition hover:border-accent hover:bg-accent-light"
                  >
                    {libName(p)}
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
