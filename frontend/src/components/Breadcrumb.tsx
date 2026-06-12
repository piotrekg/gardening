import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export interface Crumb {
  /** Visible label. */
  label: string;
  /** Destination for ancestor crumbs; omit for the current (last) crumb. */
  to?: string;
}

interface BreadcrumbProps {
  items: Crumb[];
}

/**
 * Botanical-atlas breadcrumb. Ancestors are links (ink-muted -> copper on hover);
 * the last crumb is plain ink at weight 500. Separators are parchment-dark "/".
 *
 * Responsive: at <=760px only the last crumb shows (ancestors hidden); the whole
 * trail is hidden below 600px on very small screens.
 */
export function Breadcrumb({ items }: BreadcrumbProps) {
  const { t } = useTranslation();
  if (items.length === 0) return null;
  const lastIndex = items.length - 1;

  return (
    <nav
      aria-label={t('breadcrumb.aria')}
      className="hidden items-center gap-1.5 text-[12px] min-[600px]:flex"
    >
      {items.map((item, i) => {
        const isLast = i === lastIndex;
        // Ancestors only render from 760px up; the last crumb always shows
        // (down to 600px).
        const visibility = isLast ? '' : 'hidden min-[760px]:inline';
        return (
          <Fragment key={i}>
            {i > 0 && (
              <span className={`${visibility} text-parchment-dark`} aria-hidden="true">
                /
              </span>
            )}
            {isLast || !item.to ? (
              <span className={`${visibility} font-medium text-ink`} aria-current="page">
                {item.label}
              </span>
            ) : (
              <Link to={item.to} className={`${visibility} text-ink-muted transition hover:text-copper`}>
                {item.label}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
