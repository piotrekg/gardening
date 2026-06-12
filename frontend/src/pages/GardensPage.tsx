import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Home, Leaf, Plus, Ruler, Sprout, Sun, Warehouse } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getApiErrorMessage } from '../api/client';
import { createGarden, listGardens } from '../api/gardens';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';
import { GridSkeleton } from '../components/Skeleton';
import type { Garden, LocationType } from '../types';

const LOCATION_ICONS: Record<LocationType, LucideIcon> = {
  indoor: Home,
  outdoor: Sun,
  greenhouse: Warehouse,
};

function CreateGardenModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (garden: Garden) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [locationType, setLocationType] = useState<LocationType>('outdoor');
  const [areaSqm, setAreaSqm] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [areaError, setAreaError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;
    if (!name.trim()) {
      setNameError(t('gardens.create.nameRequired'));
      valid = false;
    } else {
      setNameError(null);
    }
    let area: number | undefined;
    if (areaSqm.trim() !== '') {
      area = Number(areaSqm);
      if (!Number.isFinite(area) || area <= 0) {
        setAreaError(t('gardens.create.areaInvalid'));
        valid = false;
      } else {
        setAreaError(null);
      }
    } else {
      setAreaError(null);
    }
    if (!valid) return;

    setSubmitting(true);
    setApiError(null);
    try {
      const garden = await createGarden({
        name: name.trim(),
        location_type: locationType,
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(area !== undefined ? { area_sqm: area } : {}),
      });
      onCreated(garden);
      onClose();
    } catch (err) {
      setApiError(getApiErrorMessage(err, t('gardens.create.failed')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={t('gardens.create.title')} onClose={onClose}>
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate>
        {apiError && (
          <div className="rounded-lg border border-danger-line bg-danger-bg px-3 py-2 text-sm text-danger" role="alert">
            {apiError}
          </div>
        )}
        <div>
          <label htmlFor="g-name" className="mb-1 block text-sm font-medium text-ink-soft">
            {t('gardens.create.name')}
          </label>
          <input
            id="g-name"
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
            placeholder={t('gardens.create.namePlaceholder')}
          />
          {nameError && <p className="mt-1 text-xs text-danger">{nameError}</p>}
        </div>
        <div>
          <label htmlFor="g-desc" className="mb-1 block text-sm font-medium text-ink-soft">
            {t('gardens.create.description')}{' '}
            <span className="font-normal text-ink-faint">({t('common.optional')})</span>
          </label>
          <textarea
            id="g-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-field min-h-20 resize-y"
            placeholder={t('gardens.create.descriptionPlaceholder')}
          />
        </div>
        <div>
          <label htmlFor="g-loc" className="mb-1 block text-sm font-medium text-ink-soft">
            {t('gardens.create.locationType')}
          </label>
          <select
            id="g-loc"
            value={locationType}
            onChange={(e) => setLocationType(e.target.value as LocationType)}
            className="input-field"
          >
            <option value="indoor">{t('location.indoor')}</option>
            <option value="outdoor">{t('location.outdoor')}</option>
            <option value="greenhouse">{t('location.greenhouse')}</option>
          </select>
        </div>
        <div>
          <label htmlFor="g-area" className="mb-1 block text-sm font-medium text-ink-soft">
            {t('gardens.create.area')}{' '}
            <span className="font-normal text-ink-faint">({t('common.optional')})</span>
          </label>
          <input
            id="g-area"
            type="number"
            min="0"
            step="0.1"
            value={areaSqm}
            onChange={(e) => setAreaSqm(e.target.value)}
            className="input-field"
            placeholder="12.5"
          />
          {areaError && <p className="mt-1 text-xs text-danger">{areaError}</p>}
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary">
            {t('common.cancel')}
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? t('gardens.create.submitting') : t('gardens.create.submit')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function GardensPage() {
  const { t } = useTranslation();
  const [gardens, setGardens] = useState<Garden[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listGardens()
      .then((g) => {
        if (!cancelled) setGardens(g);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, t('gardens.loadError')));
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">{t('pageEyebrow.gardens')}</p>
          <h1 className="text-h1 font-semibold tracking-tight text-ink">{t('gardens.title')}</h1>
          <p className="mt-1 text-sm text-ink-soft">{t('gardens.subtitle')}</p>
        </div>
        <button type="button" onClick={() => setShowCreate(true)} className="btn-primary shrink-0">
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t('gardens.new')}
        </button>
      </div>

      {error ? (
        <div className="card p-6 text-center text-sm text-danger">{error}</div>
      ) : gardens === null ? (
        <GridSkeleton count={3} />
      ) : gardens.length === 0 ? (
        <EmptyState
          icon={Sprout}
          title={t('gardens.emptyTitle')}
          message={t('gardens.emptyMessage')}
          action={
            <button type="button" onClick={() => setShowCreate(true)} className="btn-primary">
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t('gardens.createFirst')}
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gardens.map((g) => {
            const LocIcon = LOCATION_ICONS[g.location_type];
            return (
              <Link
                key={g.id}
                to={`/gardens/${g.id}`}
                className="card group flex flex-col gap-3 p-5 transition duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-0.5 hover:border-accent hover:shadow-lift"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-display font-semibold text-ink group-hover:text-primary">{g.name}</h2>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-semibold text-primary-dark">
                    <LocIcon className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                    {t(`location.${g.location_type}`)}
                  </span>
                </div>
                {g.description && (
                  <p className="line-clamp-2 text-sm text-ink-soft">{g.description}</p>
                )}
                <div className="mt-auto flex items-center gap-4 pt-1 text-xs text-ink-faint">
                  <span className="inline-flex items-center gap-1">
                    <Leaf className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                    {t('common.plantCount', { count: g.plant_count })}
                  </span>
                  {g.area_sqm !== null && (
                    <span className="inline-flex items-center gap-1">
                      <Ruler className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                      {g.area_sqm} m²
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateGardenModal
          onClose={() => setShowCreate(false)}
          onCreated={(garden) => setGardens((prev) => (prev ? [garden, ...prev] : [garden]))}
        />
      )}
    </div>
  );
}
