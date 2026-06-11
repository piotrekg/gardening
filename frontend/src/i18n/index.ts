import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import pl from './locales/pl.json';

export const LANGUAGE_STORAGE_KEY = 'plantdiary.lang';

export type AppLanguage = 'pl' | 'en';

export const APP_LANGUAGES: AppLanguage[] = ['pl', 'en'];

function getStoredLanguage(): AppLanguage {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'pl' || stored === 'en') return stored;
  } catch {
    // localStorage unavailable (private mode etc.) — fall back to Polish.
  }
  return 'pl';
}

/** Normalize any i18next language tag to one of the app's supported languages. */
export function toAppLanguage(language: string): AppLanguage {
  return language.startsWith('en') ? 'en' : 'pl';
}

void i18n.use(initReactI18next).init({
  resources: {
    pl: { translation: pl },
    en: { translation: en },
  },
  lng: getStoredLanguage(),
  fallbackLng: 'pl',
  interpolation: {
    escapeValue: false, // React already escapes rendered values.
  },
});

i18n.on('languageChanged', (lng) => {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, toAppLanguage(lng));
  } catch {
    // Persisting the preference is best-effort.
  }
  document.documentElement.lang = toAppLanguage(lng);
});

document.documentElement.lang = toAppLanguage(i18n.language);

export function setAppLanguage(language: AppLanguage): void {
  void i18n.changeLanguage(language);
}

export default i18n;
