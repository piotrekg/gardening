import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { getApiErrorMessage } from '../api/client';
import { getDashboard } from '../api/dashboard';
import { SeasonalTip } from '../components/SeasonalTip';
import { Skeleton } from '../components/Skeleton';
import { StatusBadge } from '../components/StatusBadge';
import type { DashboardPlantInstance, DashboardResponse, LibraryPlant } from '../types';

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light/60 text-lg">
        {icon}
      </span>
      <div>
        <p className="text-2xl font-bold leading-tight text-primary-dark">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function InstanceList({
  title,
  icon,
  items,
  tone,
  emptyText,
  badge,
}: {
  title: string;
  icon: string;
  items: DashboardPlantInstance[];
  tone: 'red' | 'yellow' | 'green';
  emptyText: string;
  badge?: (p: DashboardPlantInstance) => React.ReactNode;
}) {
  const toneClasses = {
    red: 'border-l-red-400',
    yellow: 'border-l-yellow-400',
    green: 'border-l-accent',
  }[tone];

  return (
    <section className={`card border-l-4 p-5 ${toneClasses}`}>
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
        <ul className="space-y-2">
          {items.map((p) => (
            <li key={p.id}>
              <Link
                to={`/gardens/${p.garden_id}/plants/${p.id}`}
                className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition hover:bg-primary-light/30"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800">{p.display_name}</p>
                  <p className="truncate text-xs text-gray-400">{p.garden_name}</p>
                </div>
                {badge?.(p)}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function LibraryChipList({
  title,
  icon,
  plants,
  emptyText,
}: {
  title: string;
  icon: string;
  plants: LibraryPlant[];
  emptyText: string;
}) {
  return (
    <section className="card p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
        <span aria-hidden="true">{icon}</span>
        {title}
      </h2>
      {plants.length === 0 ? (
        <p className="text-sm text-gray-400">{emptyText}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {plants.map((p) => (
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
  );
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDashboard()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, 'Could not load your dashboard.'));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="card p-6 text-center">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  const month = new Date().getMonth() + 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Today's overview</h1>
        <p className="mt-0.5 text-sm text-gray-500">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Gardens" value={data.stats.garden_count} icon="🌻" />
        <StatCard label="Plants" value={data.stats.plant_count} icon="🪴" />
        <StatCard label="Care actions this week" value={data.stats.care_actions_this_week} icon="🧤" />
      </div>

      <SeasonalTip month={month} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InstanceList
          title="Overdue watering"
          icon="💧"
          items={data.overdue_water}
          tone="red"
          emptyText="Nothing is thirsty — great job!"
          badge={(p) => <StatusBadge status={p.care_status.water} />}
        />
        <InstanceList
          title="Overdue fertilizing"
          icon="🌾"
          items={data.overdue_fertilize}
          tone="red"
          emptyText="Everyone is well fed."
          badge={(p) => <StatusBadge status={p.care_status.fertilize} />}
        />
        <InstanceList
          title="Due today"
          icon="⏰"
          items={data.due_today}
          tone="yellow"
          emptyText="No care tasks due today."
        />
        <InstanceList
          title="Upcoming harvests"
          icon="🧺"
          items={data.upcoming_harvests}
          tone="green"
          emptyText="No harvests on the horizon yet."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <LibraryChipList
          title="Sow this month"
          icon="🌱"
          plants={data.sow_this_month}
          emptyText="Nothing to sow this month."
        />
        <LibraryChipList
          title="Transplant this month"
          icon="🌿"
          plants={data.transplant_this_month}
          emptyText="Nothing to transplant this month."
        />
      </div>

      <section className="card p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
          <span aria-hidden="true">📋</span>
          Recent care
        </h2>
        {data.recent_care.length === 0 ? (
          <p className="text-sm text-gray-400">
            No care logged yet. Water a plant to get the journal going!
          </p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {data.recent_care.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-gray-700">
                    <span className="font-semibold capitalize">{entry.action}</span>{' '}
                    {entry.plant_name}
                    {entry.note && <span className="text-gray-400"> — {entry.note}</span>}
                  </p>
                  <p className="text-xs text-gray-400">{entry.garden_name}</p>
                </div>
                <span className="shrink-0 text-xs text-gray-400">
                  {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
