/**
 * Convert a kebab-case slug into a human-readable fallback label:
 * replace hyphens with spaces and capitalize the first letter.
 * Used as the i18next `defaultValue` when no translation exists for a slug.
 */
export function prettifySlug(slug: string): string {
  const spaced = slug.replace(/-/g, ' ').trim();
  if (spaced.length === 0) return spaced;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
