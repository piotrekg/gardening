import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiErrorMessage } from '../api/client';
import { createGarden, listGardens } from '../api/gardens';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';
import { GridSkeleton } from '../components/Skeleton';
import type { Garden, LocationType } from '../types';

const LOCATION_LABELS: Record<LocationType, string> = {
  indoor: '🏠 Indoor',
  outdoor: '🌤️ Outdoor',
  greenhouse: '🏡 Greenhouse',
};

function CreateGardenModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (garden: Garden) => void;
}) {
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
      setNameError('Garden name is required.');
      valid = false;
    } else {
      setNameError(null);
    }
    let area: number | undefined;
    if (areaSqm.trim() !== '') {
      area = Number(areaSqm);
      if (!Number.isFinite(area) || area <= 0) {
        setAreaError('Area must be a positive number.');
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
      setApiError(getApiErrorMessage(err, 'Could not create the garden.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Create a garden" onClose={onClose}>
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate>
        {apiError && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {apiError}
          </div>
        )}
        <div>
          <label htmlFor="g-name" className="mb-1 block text-sm font-medium text-gray-700">
            Name
          </label>
          <input
            id="g-name"
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
            placeholder="Balcony jungle"
          />
          {nameError && <p className="mt-1 text-xs text-red-600">{nameError}</p>}
        </div>
        <div>
          <label htmlFor="g-desc" className="mb-1 block text-sm font-medium text-gray-700">
            Description <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <textarea
            id="g-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-field min-h-20 resize-y"
            placeholder="South-facing, lots of pots…"
          />
        </div>
        <div>
          <label htmlFor="g-loc" className="mb-1 block text-sm font-medium text-gray-700">
            Location type
          </label>
          <select
            id="g-loc"
            value={locationType}
            onChange={(e) => setLocationType(e.target.value as LocationType)}
            className="input-field"
          >
            <option value="indoor">Indoor</option>
            <option value="outdoor">Outdoor</option>
            <option value="greenhouse">Greenhouse</option>
          </select>
        </div>
        <div>
          <label htmlFor="g-area" className="mb-1 block text-sm font-medium text-gray-700">
            Area (m²) <span className="font-normal text-gray-400">(optional)</span>
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
          {areaError && <p className="mt-1 text-xs text-red-600">{areaError}</p>}
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Creating…' : 'Create garden'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function GardensPage() {
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
        if (!cancelled) setError(getApiErrorMessage(err, 'Could not load your gardens.'));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">My gardens</h1>
          <p className="mt-0.5 text-sm text-gray-500">All the places where things grow.</p>
        </div>
        <button type="button" onClick={() => setShowCreate(true)} className="btn-primary shrink-0">
          + New garden
        </button>
      </div>

      {error ? (
        <div className="card p-6 text-center text-sm text-red-600">{error}</div>
      ) : gardens === null ? (
        <GridSkeleton count={3} />
      ) : gardens.length === 0 ? (
        <EmptyState
          icon="🌻"
          title="No gardens yet"
          message="Create your first garden to start tracking plants, watering and harvests."
          action={
            <button type="button" onClick={() => setShowCreate(true)} className="btn-primary">
              Create your first garden
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gardens.map((g) => (
            <Link
              key={g.id}
              to={`/gardens/${g.id}`}
              className="card group flex flex-col gap-3 p-5 transition hover:shadow-card-hover"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-gray-800 group-hover:text-primary">{g.name}</h2>
                <span className="shrink-0 rounded-full bg-primary-light/60 px-2 py-0.5 text-[11px] font-semibold text-primary-dark">
                  {LOCATION_LABELS[g.location_type]}
                </span>
              </div>
              {g.description && (
                <p className="line-clamp-2 text-sm text-gray-500">{g.description}</p>
              )}
              <div className="mt-auto flex items-center gap-4 pt-1 text-xs text-gray-400">
                <span>
                  🪴 {g.plant_count} {g.plant_count === 1 ? 'plant' : 'plants'}
                </span>
                {g.area_sqm !== null && <span>📐 {g.area_sqm} m²</span>}
              </div>
            </Link>
          ))}
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
