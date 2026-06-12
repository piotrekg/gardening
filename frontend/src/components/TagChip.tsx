import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { prettifySlug } from '../i18n/slug';

interface TagChipProps {
  /** The raw tag value; also used to build the library filter link. */
  tag: string;
  /** Optional display label; overrides the translated label when provided. */
  label?: string;
}

/**
 * Small clickable tag chip linking to the library filtered by this tag.
 * Botanical-atlas styling: hairline parchment chip, copper on hover.
 * The label is translated via the `tag` dictionary, falling back to a
 * prettified slug; the link always filters by the raw slug.
 */
export function TagChip({ tag, label }: TagChipProps) {
  const { t } = useTranslation();
  return (
    <Link
      to={`/library?tag=${encodeURIComponent(tag)}`}
      className="inline-flex items-center rounded-[2px] border border-line bg-paper px-2 py-0.5 text-[10px] text-ink-muted transition hover:border-copper hover:text-copper"
    >
      {label ?? t(`tag.${tag}`, { defaultValue: prettifySlug(tag) })}
    </Link>
  );
}
