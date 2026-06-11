import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
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
  const lastWatered = plant.last_watered_at
    ? `Watered ${formatDistanceToNow(new Date(plant.last_watered_at), { addSuffix: true })}`
    : 'Never watered';

  return (
    <div className="card group relative flex flex-col overflow-hidden transition hover:shadow-card-hover">
      <Link
        to={`/gardens/${plant.garden_id}/plants/${plant.id}`}
        className="absolute inset-0 z-0"
        aria-label={`Open ${plant.display_name}`}
      />
      <div className="pointer-events-none relative flex h-28 items-center justify-center bg-primary-light/40">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={plant.display_name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="text-4xl" aria-hidden="true">
            🪴
          </span>
        )}
        {plant.status !== 'active' && (
          <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            {plant.status}
          </span>
        )}
      </div>
      <div className="pointer-events-none relative flex flex-1 flex-col gap-2 p-4">
        <div>
          <h3 className="font-semibold text-gray-800 group-hover:text-primary">
            {plant.display_name}
            {plant.quantity > 1 && (
              <span className="ml-1.5 text-xs font-medium text-gray-400">×{plant.quantity}</span>
            )}
          </h3>
          {plant.library && (
            <p className="text-xs italic text-gray-400">{plant.library.latin_name}</p>
          )}
        </div>
        <p className="text-xs text-gray-500">{lastWatered}</p>
        <div className="flex flex-wrap gap-1.5">
          <StatusBadge status={plant.care_status.water} label="Water" />
          <StatusBadge status={plant.care_status.fertilize} label="Feed" />
        </div>
        <div className="pointer-events-auto z-10 mt-auto flex gap-2 pt-1">
          <CareButton plant={plant} action="watered" onUpdated={onUpdated} onError={onError} />
          <CareButton plant={plant} action="fertilized" onUpdated={onUpdated} onError={onError} />
        </div>
      </div>
    </div>
  );
}
