import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Leaf, Search, Sprout, X } from 'lucide-react';
import { searchLibrary } from '../api/library';
import { useLibraryPlantName } from '../i18n/libraryName';
import type { LibraryPlant } from '../types';

const RESULT_LIMIT = 8;

/** Detect macOS to show the right modifier hint (Cmd vs Ctrl). */
function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
}

/**
 * Command-palette style global plant search. Lives in the Layout topbar; opens
 * via the button or Cmd/Ctrl+K and is reachable on every page. Debounced query
 * against the library; keyboard navigable (Arrow/Enter/Esc).
 */
export function GlobalSearch() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { name: libName } = useLibraryPlantName();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [results, setResults] = useState<LibraryPlant[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const mac = isMac();

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setDebounced('');
    setResults([]);
    setActiveIndex(0);
  }, []);

  // Cmd/Ctrl+K toggles the palette from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Focus the input when the overlay opens.
  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  // Debounce the query.
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query.trim()), 250);
    return () => window.clearTimeout(id);
  }, [query]);

  // Fetch results for the debounced term.
  useEffect(() => {
    if (!open) return;
    if (!debounced) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    searchLibrary({ search: debounced, page_size: RESULT_LIMIT })
      .then((d) => {
        if (!cancelled) {
          setResults(d.plants);
          setActiveIndex(0);
        }
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, open]);

  const goToPlant = useCallback(
    (id: string) => {
      close();
      navigate(`/library/${id}`);
    },
    [close, navigate],
  );

  const seeAll = useCallback(() => {
    const term = debounced;
    close();
    navigate(`/library?search=${encodeURIComponent(term)}`);
  }, [close, debounced, navigate]);

  // "See all" is an extra selectable row appended after the results.
  const optionCount = results.length + (debounced ? 1 : 0);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (optionCount === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % optionCount);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + optionCount) % optionCount);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex < results.length) goToPlant(results[activeIndex].id);
      else if (debounced) seeAll();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('quickSearch.openHintAria')}
        className="flex h-8 items-center gap-2 rounded-[3px] border border-parchment-dark px-2 text-ink-muted transition hover:border-copper hover:text-copper sm:px-2.5"
      >
        <Search className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} aria-hidden="true" />
        <span className="hidden text-[13px] sm:inline">{t('quickSearch.open')}</span>
        <kbd className="hidden items-center rounded-[2px] border border-parchment-dark bg-paper px-1.5 py-0.5 font-sans text-[10px] font-medium text-ink-faint sm:inline-flex">
          {mac ? 'Cmd' : 'Ctrl'}+{t('quickSearch.shortcutKey')}
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[300] flex items-start justify-center bg-forest/30 px-4 pt-[12vh] backdrop-blur-sm"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            className="reveal w-full max-w-xl overflow-hidden rounded-[6px] border border-line bg-surface shadow-lift"
            role="dialog"
            aria-modal="true"
            aria-label={t('quickSearch.label')}
          >
            <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
              <Search className="h-[18px] w-[18px] shrink-0 text-ink-faint" strokeWidth={1.75} aria-hidden="true" />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder={t('quickSearch.placeholder')}
                aria-label={t('quickSearch.label')}
                className="flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-faint"
              />
              <button
                type="button"
                onClick={close}
                aria-label={t('quickSearch.close')}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[3px] text-ink-muted transition hover:text-copper"
              >
                <X className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto" role="listbox" aria-label={t('quickSearch.resultsAria')}>
              {!debounced ? (
                <p className="px-4 py-6 text-center text-sm text-ink-faint">
                  {t('quickSearch.typeToSearch')}
                </p>
              ) : loading && results.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-ink-faint">
                  {t('quickSearch.searching')}
                </p>
              ) : results.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-ink-faint">
                  {t('quickSearch.empty', { query: debounced })}
                </p>
              ) : (
                <ul>
                  {results.map((p, i) => (
                    <li key={p.id} role="option" aria-selected={i === activeIndex}>
                      <button
                        type="button"
                        onMouseEnter={() => setActiveIndex(i)}
                        onClick={() => goToPlant(p.id)}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${
                          i === activeIndex ? 'bg-forest-pale' : 'hover:bg-surface-2'
                        }`}
                      >
                        {p.image_thumb_url ? (
                          <img
                            src={p.image_thumb_url}
                            alt=""
                            className="h-9 w-9 shrink-0 rounded-[3px] object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] bg-primary-light">
                            <Leaf className="h-5 w-5 text-accent" strokeWidth={1.5} aria-hidden="true" />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink">{libName(p)}</span>
                          {p.latin_name && (
                            <span className="block truncate text-xs italic text-ink-faint">
                              {p.latin_name}
                            </span>
                          )}
                        </span>
                        {p.enriched && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-[2px] bg-forest-pale px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-forest">
                            <Sprout className="h-2.5 w-2.5" strokeWidth={2} aria-hidden="true" />
                            {t('quickSearch.enrichedMarker')}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {debounced && (
                <button
                  type="button"
                  onMouseEnter={() => setActiveIndex(results.length)}
                  onClick={seeAll}
                  className={`flex w-full items-center gap-2 border-t border-line px-4 py-2.5 text-left text-sm font-medium text-copper transition ${
                    activeIndex === results.length ? 'bg-copper-pale' : 'hover:bg-surface-2'
                  }`}
                >
                  <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  {t('quickSearch.seeAll', { query: debounced })}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
