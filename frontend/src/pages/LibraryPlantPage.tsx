import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getApiErrorMessage } from '../api/client';
import { listGardens } from '../api/gardens';
import { getLibraryPlant, getLibraryPlantCompanions } from '../api/library';
import { addPlantToGarden } from '../api/plants';
import { Modal } from '../components/Modal';
import { MonthChips } from '../components/MonthChips';
import { Skeleton } from '../components/Skeleton';
import type { CompanionsResponse, Garden, LibraryPlant } from '../types';

function AddToGardenModal({
  plant,
  onClose,
}: {
  plant: LibraryPlant;
  onClose: () => void;
}) {
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
      .catch((err) => setError(getApiErrorMessage(err, 'Could not load your gardens.')));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gardenId) {
      setError('Pick a garden first.');
      return;
    }
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      setError('Quantity must be a whole number of at least 1.');
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
      setError(getApiErrorMessage(err, 'Could not add the plant.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={`Add ${plant.common_name_pl} to a garden`} onClose={onClose}>
      {success ? (
        <div className="space-y-4 text-center">
          <p className="text-3xl" aria-hidden="true">
            🎉
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-semibold">{plant.common_name_pl}</span> was added to{' '}
            <span className="font-semibold">{success.name}</span>.
          </p>
          <div className="flex justify-center gap-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Close
            </button>
            <Link to={`/gardens/${success.id}`} className="btn-primary">
              View garden
            </Link>
          </div>
        </div>
      ) : gardens === null ? (
        <p className="py-4 text-center text-sm text-gray-400">Loading your gardens…</p>
      ) : gardens.length === 0 ? (
        <div className="space-y-3 text-center">
          <p className="text-sm text-gray-500">
            You don't have any gardens yet. Create one first.
          </p>
          <Link to="/gardens" className="btn-primary inline-flex">
            Go to gardens
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
              Garden
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
                Quantity
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
                Planted date
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
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Adding…' : 'Add plant'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function PlantChips({ plants, tone }: { plants: LibraryPlant[]; tone: 'good' | 'bad' }) {
  if (plants.length === 0) {
    return <p className="text-sm text-gray-400">None listed.</p>;
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
          {p.common_name_pl}
        </Link>
      ))}
    </div>
  );
}

export function LibraryPlantPage() {
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
        if (!cancelled) setError(getApiErrorMessage(err, 'Could not load this plant.'));
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
  }, [plantId]);

  if (error) {
    return (
      <div className="card p-6 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <Link to="/library" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
          ← Back to library
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
          Library
        </Link>{' '}
        / <span className="text-gray-600">{plant.common_name_pl}</span>
      </nav>

      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {plant.common_name_pl}
            </h1>
            <p className="text-sm text-gray-500">
              {plant.common_name_en} · <span className="italic">{plant.latin_name}</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full bg-primary-light/60 px-2 py-0.5 font-semibold text-primary-dark">
                {plant.category}
              </span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">{plant.lifecycle}</span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                difficulty: {plant.difficulty}
              </span>
              {plant.frost_sensitive && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-600">
                  ❄️ frost-sensitive
                </span>
              )}
              {plant.tags.map((t) => (
                <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-500">
                  #{t}
                </span>
              ))}
            </div>
          </div>
          <button type="button" onClick={() => setShowAdd(true)} className="btn-primary shrink-0">
            + Add to my garden
          </button>
        </div>
      </div>

      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-800">Season calendar</h2>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="w-24 text-xs font-medium text-gray-500">🌱 Sow</span>
            <MonthChips months={plant.sow_months} activeClass="bg-accent text-primary-dark" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="w-24 text-xs font-medium text-gray-500">🌿 Transplant</span>
            <MonthChips months={plant.transplant_months} activeClass="bg-primary text-white" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="w-24 text-xs font-medium text-gray-500">🧺 Harvest</span>
            <MonthChips months={plant.harvest_months} activeClass="bg-yellow-400 text-yellow-900" />
          </div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-800">Care parameters</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-gray-400">Sun requirement</dt>
            <dd className="text-gray-700">☀️ {plant.sun_requirement}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">Water every</dt>
            <dd className="text-gray-700">
              {plant.water_frequency_days !== null ? `💧 ${plant.water_frequency_days} days` : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">Fertilize every</dt>
            <dd className="text-gray-700">
              {plant.fertilize_frequency_days !== null
                ? `🌾 ${plant.fertilize_frequency_days} days`
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">Typical height</dt>
            <dd className="text-gray-700">
              {plant.typical_height_cm !== null ? `📏 ${plant.typical_height_cm} cm` : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">Spacing</dt>
            <dd className="text-gray-700">
              {plant.spacing_cm !== null ? `↔️ ${plant.spacing_cm} cm` : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">Common pests</dt>
            <dd className="text-gray-700">
              {plant.common_pests.length > 0 ? plant.common_pests.join(', ') : '—'}
            </dd>
          </div>
        </dl>
        {plant.care_notes && (
          <div className="mt-4 rounded-lg bg-primary-light/40 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-dark/70">
              Care notes
            </p>
            <p className="mt-1 text-sm text-primary-dark">{plant.care_notes}</p>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-800">🤝 Good companions</h2>
          {companions === null ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : (
            <PlantChips plants={companions.companions} tone="good" />
          )}
        </section>
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-800">⚔️ Keep apart from</h2>
          {companions === null ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : (
            <PlantChips plants={companions.antagonists} tone="bad" />
          )}
        </section>
      </div>

      {showAdd && <AddToGardenModal plant={plant} onClose={() => setShowAdd(false)} />}
    </div>
  );
}
