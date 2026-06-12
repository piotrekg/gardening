import { Link } from 'react-router-dom';

interface TagChipProps {
  /** The raw tag value; also used to build the library filter link. */
  tag: string;
  /** Optional display label (defaults to the tag itself). */
  label?: string;
}

/**
 * Small clickable tag chip linking to the library filtered by this tag.
 * Botanical-atlas styling: hairline parchment chip, copper on hover.
 */
export function TagChip({ tag, label }: TagChipProps) {
  return (
    <Link
      to={`/library?tag=${encodeURIComponent(tag)}`}
      className="inline-flex items-center rounded-[2px] border border-line bg-paper px-2 py-0.5 text-[10px] text-ink-muted transition hover:border-copper hover:text-copper"
    >
      {label ?? tag}
    </Link>
  );
}
