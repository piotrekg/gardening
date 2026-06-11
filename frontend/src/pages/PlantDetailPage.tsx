import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { getCareLog, logCare } from '../api/care';
import { getApiErrorMessage } from '../api/client';
import { deletePhoto, listPhotos } from '../api/photos';
import { deleteGardenPlant, getGardenPlant, updateGardenPlant } from '../api/plants';
import { Modal } from '../components/Modal';
import { PhotoUpload } from '../components/PhotoUpload';
import { Skeleton } from '../components/Skeleton';
import { Spinner } from '../components/Spinner';
import { StatusBadge } from '../components/StatusBadge';
import type {
  CareAction,
  CareEntry,
  CareLogResponse,
  Photo,
  PlantInstance,
  PlantStatus,
} from '../types';

const CARE_ACTIONS: { action: CareAction; icon: string; label: string }[] = [
  { action: 'watered', icon: '💧', label: 'Water' },
  { action: 'fertilized', icon: '🌾', label: 'Fertilize' },
  { action: 'pruned', icon: '✂️', label: 'Prune' },
  { action: 'repotted', icon: '🪴', label: 'Repot' },
  { action: 'treated', icon: '🧪', label: 'Treat' },
  { action: 'observed', icon: '👀', label: 'Observe' },
  { action: 'harvested', icon: '🧺', label: 'Harvest' },
];

const ACTION_ICONS: Record<CareAction, string> = {
  watered: '💧',
  fertilized: '🌾',
  pruned: '✂️',
  repotted: '🪴',
  treated: '🧪',
  observed: '👀',
  harvested: '🧺',
};

const STATUS_OPTIONS: PlantStatus[] = ['active', 'harvested', 'removed', 'dead'];

const PAGE_SIZE = 10;

function EditPlantModal({
  plant,
  onClose,
  onSaved,
}: {
  plant: PlantInstance;
  onClose: () => void;
  onSaved: (p: PlantInstance) => void;
}) {
  const [customName, setCustomName] = useState(plant.custom_name ?? '');
  const [locationNotes, setLocationNotes] = useState(plant.location_notes ?? '');
  const [quantity, setQuantity] = useState(String(plant.quantity));
  const [plantedDate, setPlantedDate] = useState(plant.planted_date?.slice(0, 10) ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      setError('Quantity must be a whole number of at least 1.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const updated = await updateGardenPlant(plant.garden_id, plant.id, {
        quantity: qty,
        ...(customName.trim() ? { custom_name: customName.trim() } : {}),
        ...(locationNotes.trim() ? { location_notes: locationNotes.trim() } : {}),
        ...(plantedDate ? { planted_date: plantedDate } : {}),
      });
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not save changes.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Edit plant" onClose={onClose}>
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate>
        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="ep-name" className="mb-1 block text-sm font-medium text-gray-700">
            Custom name
          </label>
          <input
            id="ep-name"
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            className="input-field"
            placeholder={plant.library?.common_name_pl ?? 'My plant'}
          />
        </div>
        <div>
          <label htmlFor="ep-notes" className="mb-1 block text-sm font-medium text-gray-700">
            Location notes
          </label>
          <textarea
            id="ep-notes"
            value={locationNotes}
            onChange={(e) => setLocationNotes(e.target.value)}
            className="input-field min-h-16 resize-y"
            placeholder="Bed 3, by the fence…"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="ep-qty" className="mb-1 block text-sm font-medium text-gray-700">
              Quantity
            </label>
            <input
              id="ep-qty"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="ep-date" className="mb-1 block text-sm font-medium text-gray-700">
              Planted date
            </label>
            <input
              id="ep-date"
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
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function LogCareModal({
  plant,
  action,
  onClose,
  onLogged,
}: {
  plant: PlantInstance;
  action: CareAction;
  onClose: () => void;
  onLogged: () => void;
}) {
  const [note, setNote] = useState('');
  const [quantityHarvested, setQuantityHarvested] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let qty: number | undefined;
    if (action === 'harvested' && quantityHarvested.trim() !== '') {
      qty = Number(quantityHarvested);
      if (!Number.isFinite(qty) || qty < 0) {
        setError('Harvested quantity must be a non-negative number.');
        return;
      }
    }
    setSubmitting(true);
    setError(null);
    try {
      await logCare(plant.garden_id, plant.id, {
        action,
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(qty !== undefined ? { quantity_harvested: qty } : {}),
      });
      onLogged();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not log this care action.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={`Log: ${action}`} onClose={onClose}>
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate>
        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="lc-note" className="mb-1 block text-sm font-medium text-gray-700">
            Note <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <textarea
            id="lc-note"
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input-field min-h-16 resize-y"
            placeholder="Anything worth remembering…"
          />
        </div>
        {action === 'harvested' && (
          <div>
            <label htmlFor="lc-qty" className="mb-1 block text-sm font-medium text-gray-700">
              Quantity harvested <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              id="lc-qty"
              type="number"
              min="0"
              step="0.1"
              value={quantityHarvested}
              onChange={(e) => setQuantityHarvested(e.target.value)}
              className="input-field"
              placeholder="e.g. 2.5"
            />
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Logging…' : 'Log it'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function PlantDetailPage() {
  const { id, plantId } = useParams<{ id: string; plantId: string }>();
  const gardenId = id ?? '';
  const instanceId = plantId ?? '';
  const navigate = useNavigate();

  const [plant, setPlant] = useState<PlantInstance | null>(null);
  const [careLog, setCareLog] = useState<CareLogResponse | null>(null);
  const [carePage, setCarePage] = useState(1);
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [logAction, setLogAction] = useState<CareAction | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);

  const loadPlant = useCallback(async () => {
    if (!gardenId || !instanceId) return;
    try {
      const detail = await getGardenPlant(gardenId, instanceId);
      setPlant(detail.plant);
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load this plant.'));
    }
  }, [gardenId, instanceId]);

  const loadCareLog = useCallback(
    async (page: number) => {
      if (!gardenId || !instanceId) return;
      try {
        const log = await getCareLog(gardenId, instanceId, page, PAGE_SIZE);
        setCareLog(log);
      } catch {
        // Keep page usable if the log fails; plant info still renders.
      }
    },
    [gardenId, instanceId],
  );

  useEffect(() => {
    void loadPlant();
  }, [loadPlant]);

  useEffect(() => {
    void loadCareLog(carePage);
  }, [loadCareLog, carePage]);

  useEffect(() => {
    if (!gardenId || !instanceId) return;
    let cancelled = false;
    listPhotos(gardenId, instanceId)
      .then((p) => {
        if (!cancelled) setPhotos(p);
      })
      .catch(() => {
        if (!cancelled) setPhotos([]);
      });
    return () => {
      cancelled = true;
    };
  }, [gardenId, instanceId]);

  const refreshAfterCare = () => {
    void loadPlant();
    setCarePage(1);
    void loadCareLog(1);
  };

  const handleStatusChange = async (status: PlantStatus) => {
    if (!plant) return;
    setStatusSaving(true);
    setActionError(null);
    try {
      const updated = await updateGardenPlant(gardenId, instanceId, { status });
      setPlant(updated);
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Could not update status.'));
    } finally {
      setStatusSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Remove this plant from the garden? This cannot be undone.')) return;
    try {
      await deleteGardenPlant(gardenId, instanceId);
      navigate(`/gardens/${gardenId}`);
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Could not delete this plant.'));
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!window.confirm('Delete this photo?')) return;
    try {
      await deletePhoto(gardenId, instanceId, photoId);
      setPhotos((prev) => prev?.filter((p) => p.id !== photoId) ?? prev);
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Could not delete the photo.'));
    }
  };

  if (error) {
    return (
      <div className="card p-6 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <Link
          to={`/gardens/${gardenId}`}
          className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
        >
          ← Back to garden
        </Link>
      </div>
    );
  }

  if (!plant) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const lib = plant.library;
  const totalPages = careLog ? Math.max(1, Math.ceil(careLog.total / careLog.page_size)) : 1;

  return (
    <div className="space-y-6">
      <nav className="text-xs text-gray-400">
        <Link to="/gardens" className="hover:text-primary hover:underline">
          Gardens
        </Link>{' '}
        /{' '}
        <Link to={`/gardens/${gardenId}`} className="hover:text-primary hover:underline">
          Garden
        </Link>{' '}
        / <span className="text-gray-600">{plant.display_name}</span>
      </nav>

      {actionError && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {actionError}
        </div>
      )}

      {/* Header */}
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {plant.display_name}
              {plant.quantity > 1 && (
                <span className="ml-2 text-base font-medium text-gray-400">×{plant.quantity}</span>
              )}
            </h1>
            {lib && (
              <p className="text-sm italic text-gray-400">
                {lib.latin_name} · {lib.common_name_en}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <StatusBadge status={plant.care_status.water} label="Water" />
              <StatusBadge status={plant.care_status.fertilize} label="Feed" />
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <label htmlFor="pd-status" className="sr-only">
              Plant status
            </label>
            <select
              id="pd-status"
              value={plant.status}
              disabled={statusSaving}
              onChange={(e) => void handleStatusChange(e.target.value as PlantStatus)}
              className="input-field !w-auto"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => setShowEdit(true)} className="btn-secondary">
              Edit
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-gray-400">Planted</dt>
            <dd className="text-gray-700">
              {plant.planted_date ? format(new Date(plant.planted_date), 'd MMM yyyy') : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">Last watered</dt>
            <dd className="text-gray-700">
              {plant.last_watered_at
                ? formatDistanceToNow(new Date(plant.last_watered_at), { addSuffix: true })
                : 'never'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">Last fertilized</dt>
            <dd className="text-gray-700">
              {plant.last_fertilized_at
                ? formatDistanceToNow(new Date(plant.last_fertilized_at), { addSuffix: true })
                : 'never'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">Location notes</dt>
            <dd className="text-gray-700">{plant.location_notes ?? '—'}</dd>
          </div>
        </dl>
      </div>

      {/* Quick care actions */}
      <section className="card p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-800">Quick care</h2>
        <div className="flex flex-wrap gap-2">
          {CARE_ACTIONS.map(({ action, icon, label }) => (
            <button
              key={action}
              type="button"
              onClick={() => setLogAction(action)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-light/60 px-3 py-2 text-sm font-semibold text-primary-dark transition hover:bg-accent-light"
            >
              <span aria-hidden="true">{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Care log timeline */}
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-800">Care log</h2>
          {careLog === null ? (
            <Spinner label="Loading care log…" />
          ) : careLog.entries.length === 0 ? (
            <p className="py-4 text-sm text-gray-400">
              No care logged yet — tap a quick action above to start the journal.
            </p>
          ) : (
            <>
              <ol className="relative space-y-4 border-l border-primary-light pl-5">
                {careLog.entries.map((entry: CareEntry) => (
                  <li key={entry.id} className="relative">
                    <span className="absolute -left-[27px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] ring-2 ring-accent">
                      {ACTION_ICONS[entry.action]}
                    </span>
                    <p className="text-sm text-gray-800">
                      <span className="font-semibold capitalize">{entry.action}</span>
                      {entry.quantity_harvested !== null && (
                        <span className="text-gray-500"> · {entry.quantity_harvested}</span>
                      )}
                    </p>
                    {entry.note && <p className="text-sm text-gray-500">{entry.note}</p>}
                    <p className="text-xs text-gray-400">
                      {format(new Date(entry.timestamp), 'd MMM yyyy, HH:mm')} (
                      {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })})
                    </p>
                  </li>
                ))}
              </ol>
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-gray-50 pt-3">
                  <button
                    type="button"
                    disabled={carePage <= 1}
                    onClick={() => setCarePage((p) => p - 1)}
                    className="btn-secondary !px-3 !py-1.5 text-xs"
                  >
                    ← Newer
                  </button>
                  <span className="text-xs text-gray-400">
                    Page {careLog.page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={carePage >= totalPages}
                    onClick={() => setCarePage((p) => p + 1)}
                    className="btn-secondary !px-3 !py-1.5 text-xs"
                  >
                    Older →
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* Photos */}
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-800">Photos</h2>
          {photos === null ? (
            <Spinner label="Loading photos…" />
          ) : (
            <>
              {photos.length === 0 ? (
                <p className="mb-3 text-sm text-gray-400">
                  No photos yet — document your plant's progress!
                </p>
              ) : (
                <div className="mb-4 grid grid-cols-3 gap-2">
                  {photos.map((photo) => (
                    <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100">
                      <a href={photo.url} target="_blank" rel="noreferrer">
                        <img
                          src={photo.thumb_url}
                          alt={`${plant.display_name} photo`}
                          className="h-full w-full object-cover transition group-hover:scale-105"
                          loading="lazy"
                        />
                      </a>
                      <button
                        type="button"
                        onClick={() => void handleDeletePhoto(photo.id)}
                        className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white opacity-0 transition hover:bg-red-600 group-hover:opacity-100"
                        aria-label="Delete photo"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <PhotoUpload
                gardenId={gardenId}
                plantId={instanceId}
                onUploaded={(photo) => setPhotos((prev) => [photo, ...(prev ?? [])])}
              />
            </>
          )}
        </section>
      </div>

      {/* Library growing guide */}
      {lib && (
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-gray-800">Growing guide</h2>
            <Link to={`/library/${lib.id}`} className="text-xs font-medium text-primary hover:underline">
              Open in library →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-gray-400">Sun</dt>
              <dd className="text-gray-700">{lib.sun_requirement}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Water every</dt>
              <dd className="text-gray-700">
                {lib.water_frequency_days !== null ? `${lib.water_frequency_days} days` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Fertilize every</dt>
              <dd className="text-gray-700">
                {lib.fertilize_frequency_days !== null ? `${lib.fertilize_frequency_days} days` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Difficulty</dt>
              <dd className="text-gray-700">{lib.difficulty}</dd>
            </div>
          </div>
          {lib.care_notes && <p className="mt-3 text-sm text-gray-600">{lib.care_notes}</p>}
        </section>
      )}

      {showEdit && (
        <EditPlantModal plant={plant} onClose={() => setShowEdit(false)} onSaved={setPlant} />
      )}
      {logAction && (
        <LogCareModal
          plant={plant}
          action={logAction}
          onClose={() => setLogAction(null)}
          onLogged={refreshAfterCare}
        />
      )}
    </div>
  );
}
