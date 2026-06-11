import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { getApiErrorMessage } from '../api/client';
import { getGarden, getGardenCompatibility } from '../api/gardens';
import { listGardenPlants } from '../api/plants';
import { CompanionAlert } from '../components/CompanionAlert';
import { EmptyState } from '../components/EmptyState';
import { PlantCard } from '../components/PlantCard';
import { PlantSearchModal } from '../components/PlantSearchModal';
import { GridSkeleton, Skeleton } from '../components/Skeleton';
import type {
  CompatibilityConflict,
  GardenDetailResponse,
  PlantInstance,
} from '../types';

function HealthPill({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
      <span className="font-bold">{value}</span> {label}
    </span>
  );
}

export function GardenDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const gardenId = id ?? '';

  const [detail, setDetail] = useState<GardenDetailResponse | null>(null);
  const [plants, setPlants] = useState<PlantInstance[] | null>(null);
  const [conflicts, setConflicts] = useState<CompatibilityConflict[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [careError, setCareError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    if (!gardenId) return;
    try {
      const [d, p, c] = await Promise.all([
        getGarden(gardenId),
        listGardenPlants(gardenId),
        getGardenCompatibility(gardenId).catch(() => ({ conflicts: [] })),
      ]);
      setDetail(d);
      setPlants(p);
      setConflicts(c.conflicts);
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err, t('gardenDetail.loadError')));
    }
  }, [gardenId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePlantUpdated = (updated: PlantInstance) => {
    setPlants((prev) => prev?.map((p) => (p.id === updated.id ? updated : p)) ?? prev);
  };

  if (error) {
    return (
      <div className="card p-6 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <Link to="/gardens" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
          {t('gardenDetail.backToGardens')}
        </Link>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-16" />
        <GridSkeleton />
      </div>
    );
  }

  const { garden, health_summary } = detail;

  return (
    <div className="space-y-6">
      <nav className="text-xs text-gray-400">
        <Link to="/gardens" className="hover:text-primary hover:underline">
          {t('nav.gardens')}
        </Link>{' '}
        / <span className="text-gray-600">{garden.name}</span>
      </nav>

      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{garden.name}</h1>
            {garden.description && <p className="mt-1 text-sm text-gray-500">{garden.description}</p>}
            <p className="mt-1 text-xs text-gray-400">
              {t(`location.${garden.location_type}`)}
              {garden.area_sqm !== null ? ` · ${garden.area_sqm} m²` : ''} ·{' '}
              {t('common.plantCount', { count: garden.plant_count })}
            </p>
          </div>
          <button type="button" onClick={() => setShowAdd(true)} className="btn-primary shrink-0">
            {t('gardenDetail.addPlant')}
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <HealthPill
            label={t('gardenDetail.health.overdueWater')}
            value={health_summary.overdue_water}
            className="bg-red-100 text-red-700"
          />
          <HealthPill
            label={t('gardenDetail.health.overdueFertilize')}
            value={health_summary.overdue_fertilize}
            className="bg-red-100 text-red-700"
          />
          <HealthPill
            label={t('gardenDetail.health.dueToday')}
            value={health_summary.due_today}
            className="bg-yellow-100 text-yellow-800"
          />
          <HealthPill
            label={t('gardenDetail.health.ok')}
            value={health_summary.ok}
            className="bg-green-100 text-green-700"
          />
          <HealthPill
            label={t('gardenDetail.health.total')}
            value={health_summary.total}
            className="bg-gray-100 text-gray-600"
          />
        </div>
      </div>

      <CompanionAlert conflicts={conflicts} />

      {careError && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {careError}
        </div>
      )}

      {plants === null ? (
        <GridSkeleton />
      ) : plants.length === 0 ? (
        <EmptyState
          icon="🪴"
          title={t('gardenDetail.emptyTitle')}
          message={t('gardenDetail.emptyMessage')}
          action={
            <button type="button" onClick={() => setShowAdd(true)} className="btn-primary">
              {t('gardenDetail.emptyAction')}
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plants.map((p) => (
            <PlantCard
              key={p.id}
              plant={p}
              onUpdated={handlePlantUpdated}
              onError={(m) => setCareError(m)}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <PlantSearchModal
          gardenId={gardenId}
          onClose={() => setShowAdd(false)}
          onAdded={() => void load()}
        />
      )}
    </div>
  );
}
