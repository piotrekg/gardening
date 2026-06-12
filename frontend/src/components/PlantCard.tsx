import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useDateFnsLocale } from '../i18n/dateLocale';
import type { PlantInstance } from '../types';
import { CareButton } from './CareButton';
import { StatusBadge } from './StatusBadge';

interface PlantCardProps {
  plant: PlantInstance;
  /** Thumbnail URL if a photo exists for this instance. */
  thumbUrl?: string;
  onUpdated: (plant: PlantInstance) => void;
  onError?: (message: string) => void;
}

export function PlantCard({ plant, thumbUrl, onUpdated, onError }: PlantCardProps) {
  const { t } = useTranslation();
  const dateLocale = useDateFnsLocale();

  const image = thumbUrl ?? plant.library?.image_thumb_url ?? plant.library?.image_url ?? null;

  const lastWatered = plant.last_watered_at
    ? t('plantCard.wateredAgo', {
        distance: formatDistanceToNow(new Date(plant.last_watered_at), {
          addSuffix: true,
          locale: dateLocale,
        }),
      })
    : t('plantCard.neverWatered');

  return (
    <div className="card group relative flex flex-col overflow-hidden transition duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-0.5 hover:border-accent hover:shadow-lift">
      <Link
        to={`/gardens/${plant.garden_id}/plants/${plant.id}`}
        className="absolute inset-0 z-0"
        aria-label={t('plantCard.open', { name: plant.display_name })}
      />
      <div className="pointer-events-none relative flex h-28 items-center justify-center bg-primary-light">
        {image ? (
          <img
            src={image}
            alt={plant.display_name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <Leaf className="h-9 w-9 text-accent" strokeWidth={1.25} aria-hidden="true" />
        )}
        {plant.status !== 'active' && (
          <span className="absolute right-2 top-2 rounded-full border border-line bg-paper/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
            {t(`plantStatus.${plant.status}`)}
          </span>
        )}
      </div>
      <div className="pointer-events-none relative flex flex-1 flex-col gap-2 p-4">
        <div>
          <h3 className="font-display font-semibold text-ink group-hover:text-primary">
            {plant.display_name}
            {plant.quantity > 1 && (
              <span className="ml-1.5 text-xs font-medium text-ink-faint">×{plant.quantity}</span>
            )}
          </h3>
          {plant.library && (
            <p className="text-xs italic text-ink-faint">{plant.library.latin_name}</p>
          )}
        </div>
        <p className="text-xs text-ink-soft">{lastWatered}</p>
        <div className="flex flex-wrap gap-1.5">
          <StatusBadge status={plant.care_status.water} label={t('status.waterLabel')} />
          <StatusBadge status={plant.care_status.fertilize} label={t('status.feedLabel')} />
        </div>
        <div className="pointer-events-auto z-10 mt-auto flex gap-2 pt-1">
          <CareButton plant={plant} action="watered" onUpdated={onUpdated} onError={onError} />
          <CareButton plant={plant} action="fertilized" onUpdated={onUpdated} onError={onError} />
        </div>
      </div>
    </div>
  );
}
