import { useState } from 'react';
import { logCare } from '../api/care';
import { getApiErrorMessage } from '../api/client';
import type { CareAction, PlantInstance } from '../types';

interface CareButtonProps {
  plant: PlantInstance;
  action: Extract<CareAction, 'watered' | 'fertilized'>;
  /** Called with optimistic update immediately, then with server truth (or rollback). */
  onUpdated: (plant: PlantInstance) => void;
  onError?: (message: string) => void;
}

const CONFIG = {
  watered: { icon: '💧', label: 'Water', busy: 'Watering…' },
  fertilized: { icon: '🌾', label: 'Fertilize', busy: 'Feeding…' },
} as const;

export function CareButton({ plant, action, onUpdated, onError }: CareButtonProps) {
  const [busy, setBusy] = useState(false);
  const cfg = CONFIG[action];

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);

    const previous = plant;
    const now = new Date().toISOString();
    // Optimistic update: mark as freshly cared-for.
    const optimistic: PlantInstance = {
      ...plant,
      last_watered_at: action === 'watered' ? now : plant.last_watered_at,
      last_fertilized_at: action === 'fertilized' ? now : plant.last_fertilized_at,
      care_status: {
        water: action === 'watered' ? 'ok' : plant.care_status.water,
        fertilize: action === 'fertilized' ? 'ok' : plant.care_status.fertilize,
      },
    };
    onUpdated(optimistic);

    try {
      await logCare(plant.garden_id, plant.id, { action });
    } catch (err) {
      onUpdated(previous); // rollback
      onError?.(getApiErrorMessage(err, `Could not log "${cfg.label}".`));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={(e) => void handleClick(e)}
      disabled={busy}
      className="inline-flex items-center gap-1 rounded-lg bg-primary-light/60 px-2.5 py-1.5 text-xs font-semibold text-primary-dark transition hover:bg-accent-light disabled:opacity-60"
      title={`Log "${action}" now`}
    >
      <span aria-hidden="true">{cfg.icon}</span>
      {busy ? cfg.busy : cfg.label}
    </button>
  );
}
