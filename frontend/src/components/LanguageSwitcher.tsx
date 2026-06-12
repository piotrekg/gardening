import { useTranslation } from 'react-i18next';
import { APP_LANGUAGES, setAppLanguage, toAppLanguage } from '../i18n';

/** Compact PL / EN toggle. Switches i18next + localStorage immediately. */
export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const current = toAppLanguage(i18n.language);

  return (
    <div
      role="group"
      aria-label={t('language.switch')}
      className={`flex items-center rounded-lg bg-surface-2 p-0.5 ${className}`}
    >
      {APP_LANGUAGES.map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => setAppLanguage(lang)}
          aria-pressed={current === lang}
          aria-label={t(`language.${lang}`)}
          className={`rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wide transition ${
            current === lang
              ? 'bg-paper text-primary-dark shadow-card'
              : 'text-ink-faint hover:text-ink'
          }`}
        >
          {lang}
        </button>
      ))}
    </div>
  );
}
