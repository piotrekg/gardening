import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCalendar } from '../api/calendar';
import { getApiErrorMessage } from '../api/client';
import { SeasonalTip } from '../components/SeasonalTip';
import { Skeleton } from '../components/Skeleton';
import type { CalendarResponse, PlantInstance } from '../types';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

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
        if (!cancelled) setError(getApiErrorMessage(err, 'Could not load the calendar.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [month, year]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Garden calendar</h1>
          <p className="mt-0.5 text-sm text-gray-500">What to sow, transplant and harvest.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => shift(-1)} className="btn-secondary !px-3" aria-label="Previous month">
            ←
          </button>
          <span className="min-w-40 text-center text-base font-semibold text-primary-dark">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button type="button" onClick={() => shift(1)} className="btn-secondary !px-3" aria-label="Next month">
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
              Today
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
                <p className="text-sm font-semibold text-blue-800">Frost risk this month</p>
                <p className="mt-0.5 text-sm text-blue-700">{data.frost_note}</p>
              </div>
            </div>
          )}

          <SeasonalTip month={data.month} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <TaskSection
              title="Sow"
              icon="🌱"
              items={data.garden_tasks.sow}
              emptyText="Nothing in your gardens to sow this month."
            />
            <TaskSection
              title="Transplant"
              icon="🌿"
              items={data.garden_tasks.transplant}
              emptyText="No transplanting tasks this month."
            />
            <TaskSection
              title="Harvest"
              icon="🧺"
              items={data.garden_tasks.harvest}
              emptyText="No harvests expected this month."
            />
          </div>

          <section className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
              <span aria-hidden="true">💡</span>
              Recommended to sow in {MONTH_NAMES[data.month - 1]}
            </h2>
            {data.recommendations.length === 0 ? (
              <p className="text-sm text-gray-400">
                No sowing recommendations for this month — a good time to plan ahead.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {data.recommendations.map((p) => (
                  <Link
                    key={p.id}
                    to={`/library/${p.id}`}
                    className="rounded-full bg-primary-light/60 px-3 py-1 text-xs font-semibold text-primary-dark transition hover:bg-accent-light"
                  >
                    {p.common_name_pl}
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
