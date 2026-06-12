import { useTranslation } from 'react-i18next';
import { APP_LANGUAGES, setAppLanguage, toAppLanguage } from '../i18n';

/** Compact PL / EN toggle (S4). Switches i18next + localStorage immediately. */
export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const current = toAppLanguage(i18n.language);

  return (
    <div
      role="group"
      aria-label={t('language.switch')}
      className={`flex items-center gap-2 ${className}`}
    >
      {APP_LANGUAGES.map((lang, i) => (
        <span key={lang} className="flex items-center gap-2">
          {i > 0 && <span className="h-3 w-px bg-parchment-dark" aria-hidden="true" />}
          <button
            type="button"
            onClick={() => setAppLanguage(lang)}
            aria-pressed={current === lang}
            aria-label={t(`language.${lang}`)}
            className={`text-[11px] font-semibold uppercase tracking-[0.06em] transition-colors ${
              current === lang ? 'text-forest' : 'text-ink-muted hover:text-ink'
            }`}
          >
            {lang}
          </button>
        </span>
      ))}
    </div>
  );
}
