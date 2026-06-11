import type { Locale } from 'date-fns';
import { enUS, pl } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

/** date-fns locale matching the given i18next language. */
export function getDateFnsLocale(language: string): Locale {
  return language.startsWith('en') ? enUS : pl;
}

/** date-fns locale matching the current UI language (reactive). */
export function useDateFnsLocale(): Locale {
  const { i18n } = useTranslation();
  return getDateFnsLocale(i18n.language);
}
