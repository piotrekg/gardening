import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Droplet, Sprout } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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

const ICONS: Record<CareButtonProps['action'], LucideIcon> = {
  watered: Droplet,
  fertilized: Sprout,
};

export function CareButton({ plant, action, onUpdated, onError }: CareButtonProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const label = t(`care.action.${action}`);
  const Icon = ICONS[action];

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
      onError?.(getApiErrorMessage(err, t('care.logFailed', { action: label })));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={(e) => void handleClick(e)}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs font-semibold text-primary-dark transition hover:border-accent hover:bg-primary-light disabled:opacity-60"
      title={t('care.logNow', { action: label })}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
      {busy ? t(`care.busy.${action}`) : label}
    </button>
  );
}
