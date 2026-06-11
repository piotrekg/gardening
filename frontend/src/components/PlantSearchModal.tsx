import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../api/client';
import { searchLibrary } from '../api/library';
import { addPlantToGarden } from '../api/plants';
import { useLibraryPlantName } from '../i18n/libraryName';
import type { LibraryPlant, PlantInstance } from '../types';
import { Modal } from './Modal';

interface PlantSearchModalProps {
  gardenId: string;
  onClose: () => void;
  onAdded: (plant: PlantInstance) => void;
}

export function PlantSearchModal({ gardenId, onClose, onAdded }: PlantSearchModalProps) {
  const { t } = useTranslation();
  const { name: libName, altName: libAltName } = useLibraryPlantName();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LibraryPlant[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<LibraryPlant | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [plantedDate, setPlantedDate] = useState('');
  const [customName, setCustomName] = useState('');
  const [customWater, setCustomWater] = useState('');
  const [customFertilize, setCustomFertilize] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Catalog/custom plants have no schedule; auto-reveal the custom inputs for them.
  const hasSchedule = !!(selected && selected.water_frequency_days);
  useEffect(() => {
    if (selected) setScheduleOpen(!selected.water_frequency_days);
  }, [selected]);

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
      setError(t('plantSearch.quantityInvalid'));
      return;
    }
    // Empty → omit (no override at creation). Positive 1–365 → set. Anything else → invalid.
    const parseFrequency = (value: string): number | 'empty' | 'invalid' => {
      const trimmed = value.trim();
      if (trimmed === '') return 'empty';
      const n = Number(trimmed);
      if (!Number.isInteger(n) || n < 1 || n > 365) return 'invalid';
      return n;
    };
    const water = parseFrequency(customWater);
    const fertilize = parseFrequency(customFertilize);
    if (water === 'invalid' || fertilize === 'invalid') {
      setError(t('plant.customSchedule.rangeInvalid'));
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
        ...(typeof water === 'number' ? { custom_water_frequency_days: water } : {}),
        ...(typeof fertilize === 'number' ? { custom_fertilize_frequency_days: fertilize } : {}),
      });
      onAdded(plant);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, t('plantSearch.failed')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        selected
          ? t('plantSearch.titleSelected', { name: libName(selected) })
          : t('plantSearch.title')
      }
      onClose={onClose}
      wide
    >
      {!selected ? (
        <div className="space-y-3">
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('plantSearch.searchPlaceholder')}
            className="input-field"
            aria-label={t('plantSearch.searchAria')}
          />
          {searching ? (
            <p className="py-6 text-center text-sm text-gray-400">{t('plantSearch.searching')}</p>
          ) : results.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">
              {t('plantSearch.noResults', { query })}
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
                      <p className="text-sm font-semibold text-gray-800">{libName(p)}</p>
                      <p className="text-xs text-gray-400">
                        {libAltName(p)} · <span className="italic">{p.latin_name}</span>
                      </p>
                    </div>
                    <span className="rounded-full bg-primary-light/70 px-2 py-0.5 text-[10px] font-semibold text-primary-dark">
                      {t(`library.category.${p.category}`, { defaultValue: p.category })}
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
            {t('plantSearch.pickDifferent')}
          </button>
          <div className="rounded-lg bg-primary-light/40 px-4 py-3">
            <p className="text-sm font-semibold text-gray-800">{libName(selected)}</p>
            <p className="text-xs italic text-gray-500">{selected.latin_name}</p>
          </div>
          <div>
            <label htmlFor="psm-quantity" className="mb-1 block text-sm font-medium text-gray-700">
              {t('plantSearch.quantity')}
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
              {t('plantSearch.plantedDate')}{' '}
              <span className="font-normal text-gray-400">({t('common.optional')})</span>
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
              {t('plantSearch.customName')}{' '}
              <span className="font-normal text-gray-400">({t('common.optional')})</span>
            </label>
            <input
              id="psm-name"
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={libName(selected)}
              className="input-field"
            />
          </div>
          <div className="rounded-lg border border-gray-100 p-3">
            {hasSchedule && !scheduleOpen ? (
              <button
                type="button"
                onClick={() => setScheduleOpen(true)}
                className="text-sm font-medium text-primary hover:underline"
              >
                + {t('plant.customSchedule.sectionTitle')}
              </button>
            ) : (
              <>
                <p className="mb-2 text-sm font-medium text-gray-700">
                  {t('plant.customSchedule.sectionTitle')}
                </p>
                {!hasSchedule && (
                  <p className="mb-3 text-xs text-gray-400">
                    {t('plant.customSchedule.sectionHint')}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="psm-water"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      {t('plant.customSchedule.waterLabel')}{' '}
                      <span className="font-normal text-gray-400">({t('common.optional')})</span>
                    </label>
                    <input
                      id="psm-water"
                      type="number"
                      min={1}
                      max={365}
                      value={customWater}
                      onChange={(e) => setCustomWater(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="psm-fertilize"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      {t('plant.customSchedule.fertilizeLabel')}{' '}
                      <span className="font-normal text-gray-400">({t('common.optional')})</span>
                    </label>
                    <input
                      id="psm-fertilize"
                      type="number"
                      min={1}
                      max={365}
                      value={customFertilize}
                      onChange={(e) => setCustomFertilize(e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? t('plantSearch.submitting') : t('plantSearch.submit')}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
