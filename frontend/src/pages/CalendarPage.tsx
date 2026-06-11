import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
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
  icon,
  items,
  emptyText,
}: {
  title: string;
  icon: string;
  items: PlantInstance[];
  emptyText: string;
}) {
  return (
    <section className="card p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
        <span aria-hidden="true">{icon}</span>
        {title}
        <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-500">
          {items.length}
        </span>
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">{emptyText}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((p) => (
            <li key={p.id}>
              <Link
                to={`/gardens/${p.garden_id}/plants/${p.id}`}
                className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition hover:bg-primary-light/30"
              >
                <span className="font-medium text-gray-800">{p.display_name}</span>
                {p.library && (
                  <span className="truncate text-xs italic text-gray-400">
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
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t('calendar.title')}</h1>
          <p className="mt-0.5 text-sm text-gray-500">{t('calendar.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shift(-1)}
            className="btn-secondary !px-3"
            aria-label={t('calendar.prevMonth')}
          >
            ←
          </button>
          <span className="min-w-40 text-center text-base font-semibold text-primary-dark">
            {monthName(month)} {year}
          </span>
          <button
            type="button"
            onClick={() => shift(1)}
            className="btn-secondary !px-3"
            aria-label={t('calendar.nextMonth')}
          >
            →
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
        <div className="card p-6 text-center text-sm text-red-600">{error}</div>
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
            <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4" role="alert">
              <span className="text-xl" aria-hidden="true">
                ❄️
              </span>
              <div>
                <p className="text-sm font-semibold text-blue-800">{t('calendar.frostTitle')}</p>
                <p className="mt-0.5 text-sm text-blue-700">{data.frost_note}</p>
              </div>
            </div>
          )}

          <SeasonalTip month={data.month} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <TaskSection
              title={t('calendar.sow')}
              icon="🌱"
              items={data.garden_tasks.sow}
              emptyText={t('calendar.sowEmpty')}
            />
            <TaskSection
              title={t('calendar.transplant')}
              icon="🌿"
              items={data.garden_tasks.transplant}
              emptyText={t('calendar.transplantEmpty')}
            />
            <TaskSection
              title={t('calendar.harvest')}
              icon="🧺"
              items={data.garden_tasks.harvest}
              emptyText={t('calendar.harvestEmpty')}
            />
          </div>

          <section className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
              <span aria-hidden="true">💡</span>
              {t('calendar.recommended', { month: monthName(data.month) })}
            </h2>
            {data.recommendations.length === 0 ? (
              <p className="text-sm text-gray-400">{t('calendar.recommendedEmpty')}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {data.recommendations.map((p) => (
                  <Link
                    key={p.id}
                    to={`/library/${p.id}`}
                    className="rounded-full bg-primary-light/60 px-3 py-1 text-xs font-semibold text-primary-dark transition hover:bg-accent-light"
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
