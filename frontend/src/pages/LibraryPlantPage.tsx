import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { getApiErrorMessage } from '../api/client';
import { listGardens } from '../api/gardens';
import { getLibraryPlant, getLibraryPlantCompanions } from '../api/library';
import { addPlantToGarden } from '../api/plants';
import { Modal } from '../components/Modal';
import { MonthChips } from '../components/MonthChips';
import { Skeleton } from '../components/Skeleton';
import { useLibraryPlantName } from '../i18n/libraryName';
import type { CompanionsResponse, Garden, LibraryPlant } from '../types';

function AddToGardenModal({
  plant,
  onClose,
}: {
  plant: LibraryPlant;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { name: libName } = useLibraryPlantName();
  const [gardens, setGardens] = useState<Garden[] | null>(null);
  const [gardenId, setGardenId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [plantedDate, setPlantedDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<Garden | null>(null);

  useEffect(() => {
    listGardens()
      .then((g) => {
        setGardens(g);
        if (g.length > 0) setGardenId(g[0].id);
      })
      .catch((err) => setError(getApiErrorMessage(err, t('gardens.loadError'))));
  }, [t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gardenId) {
      setError(t('libraryPlant.addModal.pickGarden'));
      return;
    }
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      setError(t('plantSearch.quantityInvalid'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await addPlantToGarden(gardenId, {
        plant_library_id: plant.id,
        quantity: qty,
        ...(plantedDate ? { planted_date: plantedDate } : {}),
      });
      setSuccess(gardens?.find((g) => g.id === gardenId) ?? null);
    } catch (err) {
      setError(getApiErrorMessage(err, t('plantSearch.failed')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={t('libraryPlant.addModal.title', { name: libName(plant) })} onClose={onClose}>
      {success ? (
        <div className="space-y-4 text-center">
          <p className="text-3xl" aria-hidden="true">
            🎉
          </p>
          <p className="text-sm text-gray-700">
            {t('libraryPlant.addModal.success', { plant: libName(plant), garden: success.name })}
          </p>
          <div className="flex justify-center gap-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              {t('common.close')}
            </button>
            <Link to={`/gardens/${success.id}`} className="btn-primary">
              {t('libraryPlant.addModal.viewGarden')}
            </Link>
          </div>
        </div>
      ) : gardens === null ? (
        <p className="py-4 text-center text-sm text-gray-400">
          {t('libraryPlant.addModal.loadingGardens')}
        </p>
      ) : gardens.length === 0 ? (
        <div className="space-y-3 text-center">
          <p className="text-sm text-gray-500">{t('libraryPlant.addModal.noGardens')}</p>
          <Link to="/gardens" className="btn-primary inline-flex">
            {t('libraryPlant.addModal.goToGardens')}
          </Link>
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate>
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="atg-garden" className="mb-1 block text-sm font-medium text-gray-700">
              {t('libraryPlant.addModal.garden')}
            </label>
            <select
              id="atg-garden"
              value={gardenId}
              onChange={(e) => setGardenId(e.target.value)}
              className="input-field"
            >
              {gardens.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="atg-qty" className="mb-1 block text-sm font-medium text-gray-700">
                {t('plantSearch.quantity')}
              </label>
              <input
                id="atg-qty"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label htmlFor="atg-date" className="mb-1 block text-sm font-medium text-gray-700">
                {t('plantSearch.plantedDate')}
              </label>
              <input
                id="atg-date"
                type="date"
                value={plantedDate}
                onChange={(e) => setPlantedDate(e.target.value)}
                className="input-field"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting
                ? t('libraryPlant.addModal.submitting')
                : t('libraryPlant.addModal.submit')}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function PlantChips({ plants, tone }: { plants: LibraryPlant[]; tone: 'good' | 'bad' }) {
  const { t } = useTranslation();
  const { name: libName } = useLibraryPlantName();
  if (plants.length === 0) {
    return <p className="text-sm text-gray-400">{t('libraryPlant.noneListed')}</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {plants.map((p) => (
        <Link
          key={p.id}
          to={`/library/${p.id}`}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            tone === 'good'
              ? 'bg-primary-light/60 text-primary-dark hover:bg-accent-light'
              : 'bg-red-50 text-red-700 hover:bg-red-100'
          }`}
        >
          {libName(p)}
        </Link>
      ))}
    </div>
  );
}

export function LibraryPlantPage() {
  const { t } = useTranslation();
  const { name: libName, altName: libAltName } = useLibraryPlantName();
  const { id } = useParams<{ id: string }>();
  const plantId = id ?? '';

  const [plant, setPlant] = useState<LibraryPlant | null>(null);
  const [companions, setCompanions] = useState<CompanionsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (!plantId) return;
    let cancelled = false;
    setPlant(null);
    setCompanions(null);
    getLibraryPlant(plantId)
      .then((p) => {
        if (!cancelled) setPlant(p);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, t('libraryPlant.loadError')));
      });
    getLibraryPlantCompanions(plantId)
      .then((c) => {
        if (!cancelled) setCompanions(c);
      })
      .catch(() => {
        if (!cancelled) setCompanions({ companions: [], antagonists: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [plantId, t]);

  if (error) {
    return (
      <div className="card p-6 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <Link to="/library" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
          {t('libraryPlant.backToLibrary')}
        </Link>
      </div>
    );
  }

  if (!plant) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <nav className="text-xs text-gray-400">
        <Link to="/library" className="hover:text-primary hover:underline">
          {t('nav.library')}
        </Link>{' '}
        / <span className="text-gray-600">{libName(plant)}</span>
      </nav>

      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{libName(plant)}</h1>
            <p className="text-sm text-gray-500">
              {libAltName(plant)} · <span className="italic">{plant.latin_name}</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full bg-primary-light/60 px-2 py-0.5 font-semibold text-primary-dark">
                {t(`library.category.${plant.category}`, { defaultValue: plant.category })}
              </span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                {t(`library.lifecycle.${plant.lifecycle}`, { defaultValue: plant.lifecycle })}
              </span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                {t('libraryPlant.difficultyChip', {
                  value: t(`library.difficulty.${plant.difficulty}`, {
                    defaultValue: plant.difficulty,
                  }),
                })}
              </span>
              {plant.frost_sensitive && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-600">
                  ❄️ {t('library.frostSensitive')}
                </span>
              )}
              {plant.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-500">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
          <button type="button" onClick={() => setShowAdd(true)} className="btn-primary shrink-0">
            {t('libraryPlant.addToMyGarden')}
          </button>
        </div>
      </div>

      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-800">
          {t('libraryPlant.seasonCalendar')}
        </h2>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="w-24 text-xs font-medium text-gray-500">
              🌱 {t('libraryPlant.sowLabel')}
            </span>
            <MonthChips months={plant.sow_months} activeClass="bg-accent text-primary-dark" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="w-24 text-xs font-medium text-gray-500">
              🌿 {t('libraryPlant.transplantLabel')}
            </span>
            <MonthChips months={plant.transplant_months} activeClass="bg-primary text-white" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="w-24 text-xs font-medium text-gray-500">
              🧺 {t('libraryPlant.harvestLabel')}
            </span>
            <MonthChips months={plant.harvest_months} activeClass="bg-yellow-400 text-yellow-900" />
          </div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-800">{t('libraryPlant.careParams')}</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-gray-400">{t('libraryPlant.sunRequirement')}</dt>
            <dd className="text-gray-700">
              ☀️ {t(`library.sun.${plant.sun_requirement}`, { defaultValue: plant.sun_requirement })}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">{t('libraryPlant.waterEvery')}</dt>
            <dd className="text-gray-700">
              {plant.water_frequency_days !== null
                ? `💧 ${t('common.everyDays', { count: plant.water_frequency_days })}`
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">{t('libraryPlant.fertilizeEvery')}</dt>
            <dd className="text-gray-700">
              {plant.fertilize_frequency_days !== null
                ? `🌾 ${t('common.everyDays', { count: plant.fertilize_frequency_days })}`
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">{t('libraryPlant.typicalHeight')}</dt>
            <dd className="text-gray-700">
              {plant.typical_height_cm !== null ? `📏 ${plant.typical_height_cm} cm` : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">{t('libraryPlant.spacing')}</dt>
            <dd className="text-gray-700">
              {plant.spacing_cm !== null ? `↔️ ${plant.spacing_cm} cm` : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">{t('libraryPlant.commonPests')}</dt>
            <dd className="text-gray-700">
              {plant.common_pests.length > 0 ? plant.common_pests.join(', ') : '—'}
            </dd>
          </div>
        </dl>
        {plant.care_notes && (
          <div className="mt-4 rounded-lg bg-primary-light/40 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-dark/70">
              {t('libraryPlant.careNotes')}
            </p>
            <p className="mt-1 text-sm text-primary-dark">{plant.care_notes}</p>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-800">
            {t('libraryPlant.goodCompanions')}
          </h2>
          {companions === null ? (
            <p className="text-sm text-gray-400">{t('common.loading')}</p>
          ) : (
            <PlantChips plants={companions.companions} tone="good" />
          )}
        </section>
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-800">{t('libraryPlant.keepApart')}</h2>
          {companions === null ? (
            <p className="text-sm text-gray-400">{t('common.loading')}</p>
          ) : (
            <PlantChips plants={companions.antagonists} tone="bad" />
          )}
        </section>
      </div>

      {showAdd && <AddToGardenModal plant={plant} onClose={() => setShowAdd(false)} />}
    </div>
  );
}
