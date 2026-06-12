import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import {
  CalendarClock,
  ClipboardList,
  Droplet,
  HandHeart,
  Leaf,
  ScissorsLineDashed,
  Sprout,
  Wheat,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getApiErrorMessage } from '../api/client';
import { getDashboard } from '../api/dashboard';
import { SeasonalTip } from '../components/SeasonalTip';
import { Skeleton } from '../components/Skeleton';
import { StatusBadge } from '../components/StatusBadge';
import { useDateFnsLocale } from '../i18n/dateLocale';
import { useLibraryPlantName } from '../i18n/libraryName';
import type { DashboardPlantInstance, DashboardResponse, LibraryPlant } from '../types';

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: LucideIcon }) {
  return (
    <div className="card flex items-baseline justify-between gap-3 p-5">
      <div>
        <p className="font-display text-3xl font-semibold leading-none text-primary-dark">{value}</p>
        <p className="mt-1.5 text-xs uppercase tracking-wide text-ink-faint">{label}</p>
      </div>
      <Icon className="h-5 w-5 shrink-0 text-accent" strokeWidth={1.5} aria-hidden="true" />
    </div>
  );
}

function InstanceList({
  title,
  icon: Icon,
  items,
  tone,
  emptyText,
  badge,
}: {
  title: string;
  icon: LucideIcon;
  items: DashboardPlantInstance[];
  tone: 'red' | 'yellow' | 'green';
  emptyText: string;
  badge?: (p: DashboardPlantInstance) => React.ReactNode;
}) {
  const accent = {
    red: 'text-danger',
    yellow: 'text-clay-dark',
    green: 'text-accent',
  }[tone];

  return (
    <section className="card p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
        <Icon className={`h-4 w-4 ${accent}`} strokeWidth={1.75} aria-hidden="true" />
        {title}
        <span className="ml-auto rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-ink-soft">
          {items.length}
        </span>
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-ink-faint">{emptyText}</p>
      ) : (
        <ul className="space-y-1">
          {items.map((p) => (
            <li key={p.id}>
              <Link
                to={`/gardens/${p.garden_id}/plants/${p.id}`}
                className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition hover:bg-surface-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{p.display_name}</p>
                  <p className="truncate text-xs text-ink-faint">{p.garden_name}</p>
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
  icon: Icon,
  plants,
  emptyText,
}: {
  title: string;
  icon: LucideIcon;
  plants: LibraryPlant[];
  emptyText: string;
}) {
  const { name: libName } = useLibraryPlantName();
  return (
    <section className="card p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
        <Icon className="h-4 w-4 text-accent" strokeWidth={1.75} aria-hidden="true" />
        {title}
      </h2>
      {plants.length === 0 ? (
        <p className="text-sm text-ink-faint">{emptyText}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {plants.map((p) => (
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
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const dateLocale = useDateFnsLocale();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDashboard()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, t('dashboard.loadError')));
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  if (error) {
    return (
      <div className="card p-6 text-center">
        <p className="text-sm text-danger">{error}</p>
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
    <div className="space-y-8">
      <div className="reveal" style={{ animationDelay: '0ms' }}>
        <p className="eyebrow mb-2">{t('pageEyebrow.dashboard')}</p>
        <h1 className="text-h1 font-semibold tracking-tight text-ink">{t('dashboard.title')}</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {format(new Date(), 'EEEE, d MMMM yyyy', { locale: dateLocale })}
        </p>
      </div>

      <div className="reveal grid grid-cols-1 gap-4 sm:grid-cols-3" style={{ animationDelay: '60ms' }}>
        <StatCard label={t('dashboard.stats.gardens')} value={data.stats.garden_count} icon={Sprout} />
        <StatCard label={t('dashboard.stats.plants')} value={data.stats.plant_count} icon={Leaf} />
        <StatCard
          label={t('dashboard.stats.careWeek')}
          value={data.stats.care_actions_this_week}
          icon={HandHeart}
        />
      </div>

      <div className="reveal" style={{ animationDelay: '120ms' }}>
        <SeasonalTip month={month} />
      </div>

      <div className="reveal grid grid-cols-1 gap-4 lg:grid-cols-2" style={{ animationDelay: '180ms' }}>
        <InstanceList
          title={t('dashboard.overdueWater')}
          icon={Droplet}
          items={data.overdue_water}
          tone="red"
          emptyText={t('dashboard.overdueWaterEmpty')}
          badge={(p) => <StatusBadge status={p.care_status.water} />}
        />
        <InstanceList
          title={t('dashboard.overdueFertilize')}
          icon={Wheat}
          items={data.overdue_fertilize}
          tone="red"
          emptyText={t('dashboard.overdueFertilizeEmpty')}
          badge={(p) => <StatusBadge status={p.care_status.fertilize} />}
        />
        <InstanceList
          title={t('dashboard.dueToday')}
          icon={CalendarClock}
          items={data.due_today}
          tone="yellow"
          emptyText={t('dashboard.dueTodayEmpty')}
        />
        <InstanceList
          title={t('dashboard.upcomingHarvests')}
          icon={Wheat}
          items={data.upcoming_harvests}
          tone="green"
          emptyText={t('dashboard.upcomingHarvestsEmpty')}
        />
      </div>

      <div className="reveal grid grid-cols-1 gap-4 lg:grid-cols-2" style={{ animationDelay: '240ms' }}>
        <LibraryChipList
          title={t('dashboard.sowThisMonth')}
          icon={Sprout}
          plants={data.sow_this_month}
          emptyText={t('dashboard.sowThisMonthEmpty')}
        />
        <LibraryChipList
          title={t('dashboard.transplantThisMonth')}
          icon={ScissorsLineDashed}
          plants={data.transplant_this_month}
          emptyText={t('dashboard.transplantThisMonthEmpty')}
        />
      </div>

      <section className="reveal card p-5" style={{ animationDelay: '300ms' }}>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
          <ClipboardList className="h-4 w-4 text-accent" strokeWidth={1.75} aria-hidden="true" />
          {t('dashboard.recentCare')}
        </h2>
        {data.recent_care.length === 0 ? (
          <p className="text-sm text-ink-faint">{t('dashboard.recentCareEmpty')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {data.recent_care.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink">
                    <span className="font-semibold">{t(`care.past.${entry.action}`)}</span>
                    {' · '}
                    {entry.plant_name}
                    {entry.note && <span className="text-ink-faint"> — {entry.note}</span>}
                  </p>
                  <p className="text-xs text-ink-faint">{entry.garden_name}</p>
                </div>
                <span className="shrink-0 text-xs text-ink-faint">
                  {formatDistanceToNow(new Date(entry.timestamp), {
                    addSuffix: true,
                    locale: dateLocale,
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
