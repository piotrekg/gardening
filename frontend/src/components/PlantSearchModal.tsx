import { useEffect, useState } from 'react';
import { getApiErrorMessage } from '../api/client';
import { searchLibrary } from '../api/library';
import { addPlantToGarden } from '../api/plants';
import type { LibraryPlant, PlantInstance } from '../types';
import { Modal } from './Modal';

interface PlantSearchModalProps {
  gardenId: string;
  onClose: () => void;
  onAdded: (plant: PlantInstance) => void;
}

export function PlantSearchModal({ gardenId, onClose, onAdded }: PlantSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LibraryPlant[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<LibraryPlant | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [plantedDate, setPlantedDate] = useState('');
  const [customName, setCustomName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced library search.
  useEffect(() => {
    let cancelled = false;
    setSearching(true);
    const t = window.setTimeout(() => {
      searchLibrary({ search: query || undefined, page: 1, page_size: 12 })
        .then((data) => {
          if (!cancelled) setResults(data.plants);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      setError('Quantity must be a whole number of at least 1.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const plant = await addPlantToGarden(gardenId, {
        plant_library_id: selected.id,
        quantity: qty,
        ...(plantedDate ? { planted_date: plantedDate } : {}),
        ...(customName.trim() ? { custom_name: customName.trim() } : {}),
      });
      onAdded(plant);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not add the plant.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={selected ? `Add ${selected.common_name_pl}` : 'Add a plant'} onClose={onClose} wide>
      {!selected ? (
        <div className="space-y-3">
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the plant library…"
            className="input-field"
            aria-label="Search plant library"
          />
          {searching ? (
            <p className="py-6 text-center text-sm text-gray-400">Searching…</p>
          ) : results.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">
              No plants match “{query}”. Try another name.
            </p>
          ) : (
            <ul className="max-h-72 divide-y divide-gray-50 overflow-y-auto rounded-lg border border-gray-100">
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(p)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-primary-light/40"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{p.common_name_pl}</p>
                      <p className="text-xs text-gray-400">
                        {p.common_name_en} · <span className="italic">{p.latin_name}</span>
                      </p>
                    </div>
                    <span className="rounded-full bg-primary-light/70 px-2 py-0.5 text-[10px] font-semibold text-primary-dark">
                      {p.category}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="text-xs font-medium text-primary hover:underline"
          >
            ← Pick a different plant
          </button>
          <div className="rounded-lg bg-primary-light/40 px-4 py-3">
            <p className="text-sm font-semibold text-gray-800">{selected.common_name_pl}</p>
            <p className="text-xs italic text-gray-500">{selected.latin_name}</p>
          </div>
          <div>
            <label htmlFor="psm-quantity" className="mb-1 block text-sm font-medium text-gray-700">
              Quantity
            </label>
            <input
              id="psm-quantity"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="psm-date" className="mb-1 block text-sm font-medium text-gray-700">
              Planted date <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              id="psm-date"
              type="date"
              value={plantedDate}
              onChange={(e) => setPlantedDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="psm-name" className="mb-1 block text-sm font-medium text-gray-700">
              Custom name <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              id="psm-name"
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={selected.common_name_pl}
              className="input-field"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Adding…' : 'Add to garden'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
