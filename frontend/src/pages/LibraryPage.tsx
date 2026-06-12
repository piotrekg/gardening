import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { Leaf, Search, Snowflake, Sun, X } from 'lucide-react';
import { getApiErrorMessage } from '../api/client';
import { getLibraryCategories, searchLibrary } from '../api/library';
import { EmptyState } from '../components/EmptyState';
import { GridSkeleton } from '../components/Skeleton';
import { useLibraryPlantName } from '../i18n/libraryName';
import { prettifySlug } from '../i18n/slug';
import type { Difficulty, LibraryListResponse, SunRequirement } from '../types';

const LIFECYCLES = ['annual', 'biennial', 'perennial'];
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const SUN_OPTIONS: SunRequirement[] = ['full_sun', 'partial_shade', 'shade'];
const PAGE_SIZE = 18;

function isDifficulty(value: string): value is Difficulty {
  return (DIFFICULTIES as string[]).includes(value);
}
function isSun(value: string): value is SunRequirement {
  return (SUN_OPTIONS as string[]).includes(value);
}

export function LibraryPage() {
  const { t } = useTranslation();
  const { name: libName, altName: libAltName } = useLibraryPlantName();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') ?? '';
  const category = searchParams.get('category') ?? '';
  const lifecycle = searchParams.get('lifecycle') ?? '';
  const difficultyParam = searchParams.get('difficulty') ?? '';
  const difficulty = isDifficulty(difficultyParam) ? difficultyParam : '';
  const sunParam = searchParams.get('sun') ?? '';
  const sun = isSun(sunParam) ? sunParam : '';
  const tag = searchParams.get('tag') ?? '';
  const enriched = searchParams.get('enriched') === 'true';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);

  const [searchInput, setSearchInput] = useState(search);
  const [categories, setCategories] = useState<string[]>([]);
  const [data, setData] = useState<LibraryListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep the search box in sync if the URL changes externally (e.g. a tag chip
  // navigation that also clears search, or the global quick-search "see all").
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    getLibraryCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  // Debounce search input -> URL params.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchInput !== search) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          if (searchInput) next.set('search', searchInput);
          else next.delete('search');
          next.delete('page');
          return next;
        });
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, search, setSearchParams]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    searchLibrary({
      search: search || undefined,
      category: category || undefined,
      lifecycle: lifecycle || undefined,
      difficulty: difficulty || undefined,
      sun: sun || undefined,
      tag: tag || undefined,
      enriched: enriched || undefined,
      page,
      page_size: PAGE_SIZE,
    })
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, t('library.loadError')));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search, category, lifecycle, difficulty, sun, tag, enriched, page, t]);

  const setFilter = (key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete('page');
      return next;
    });
  };

  const toggleEnriched = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (enriched) next.delete('enriched');
      else next.set('enriched', 'true');
      next.delete('page');
      return next;
    });
  };

  const clearAll = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  const setPage = (p: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (p > 1) next.set('page', String(p));
      else next.delete('page');
      return next;
    });
  };

  // Active-filter chips, each removable. Labels reuse existing i18n keys.
  const buildChips = () => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];
    if (search)
      chips.push({
        key: 'search',
        label: t('library.chip.search', { value: search }),
        onRemove: () => {
          setSearchInput('');
          setFilter('search', '');
        },
      });
    if (category)
      chips.push({
        key: 'category',
        label: t(`library.category.${category}`, { defaultValue: category }),
        onRemove: () => setFilter('category', ''),
      });
    if (lifecycle)
      chips.push({
        key: 'lifecycle',
        label: t(`library.lifecycle.${lifecycle}`, { defaultValue: lifecycle }),
        onRemove: () => setFilter('lifecycle', ''),
      });
    if (difficulty)
      chips.push({
        key: 'difficulty',
        label: t(`library.difficulty.${difficulty}`, { defaultValue: difficulty }),
        onRemove: () => setFilter('difficulty', ''),
      });
    if (sun)
      chips.push({
        key: 'sun',
        label: t(`library.sun.${sun}`, { defaultValue: sun }),
        onRemove: () => setFilter('sun', ''),
      });
    if (tag)
      chips.push({
        key: 'tag',
        label: t('library.chip.tag', {
          value: t(`tag.${tag}`, { defaultValue: prettifySlug(tag) }),
        }),
        onRemove: () => setFilter('tag', ''),
      });
    if (enriched)
      chips.push({
        key: 'enriched',
        label: t('library.onlyDocumented'),
        onRemove: toggleEnriched,
      });
    return chips;
  };
  const activeChips = buildChips();

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">{t('pageEyebrow.library')}</p>
        <h1 className="text-h1 font-semibold tracking-tight text-ink">{t('library.title')}</h1>
        <p className="mt-1 text-sm text-ink-soft">{t('library.subtitle')}</p>
      </div>

      <div className="card flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('library.searchPlaceholder')}
            className="input-field min-h-10 flex-1"
            aria-label={t('library.searchAria')}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:flex">
            <select
              value={category}
              onChange={(e) => setFilter('category', e.target.value)}
              className="input-field min-h-10 lg:w-40"
              aria-label={t('library.filterCategory')}
            >
              <option value="">{t('library.allCategories')}</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {t(`library.category.${c}`, { defaultValue: c })}
                </option>
              ))}
            </select>
            <select
              value={lifecycle}
              onChange={(e) => setFilter('lifecycle', e.target.value)}
              className="input-field min-h-10 lg:w-36"
              aria-label={t('library.filterLifecycle')}
            >
              <option value="">{t('library.allLifecycles')}</option>
              {LIFECYCLES.map((l) => (
                <option key={l} value={l}>
                  {t(`library.lifecycle.${l}`, { defaultValue: l })}
                </option>
              ))}
            </select>
            <select
              value={difficulty}
              onChange={(e) => setFilter('difficulty', e.target.value)}
              className="input-field min-h-10 lg:w-36"
              aria-label={t('library.filterDifficulty')}
            >
              <option value="">{t('library.allDifficulties')}</option>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {t(`library.difficulty.${d}`, { defaultValue: d })}
                </option>
              ))}
            </select>
            <select
              value={sun}
              onChange={(e) => setFilter('sun', e.target.value)}
              className="input-field min-h-10 lg:w-40"
              aria-label={t('library.filterSun')}
            >
              <option value="">{t('library.allSun')}</option>
              {SUN_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {t(`library.sun.${s}`, { defaultValue: s })}
                </option>
              ))}
            </select>
          </div>
        </div>
        <label className="inline-flex cursor-pointer select-none items-center gap-2 self-start text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={enriched}
            onChange={toggleEnriched}
            className="h-4 w-4 shrink-0 accent-copper"
            aria-label={t('library.onlyDocumentedAria')}
          />
          {t('library.onlyDocumented')}
        </label>
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">
            {t('library.activeFilters')}
          </span>
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onRemove}
              className="inline-flex items-center gap-1 rounded-[2px] border border-copper-pale bg-copper-pale px-2 py-0.5 text-[11px] font-medium text-copper transition hover:border-copper"
              aria-label={t('library.removeFilter', { label: chip.label })}
            >
              {chip.label}
              <X className="h-3 w-3" strokeWidth={2.25} aria-hidden="true" />
            </button>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="text-[11px] font-medium text-ink-muted underline-offset-2 transition hover:text-copper hover:underline"
          >
            {t('library.clearAll')}
          </button>
        </div>
      )}

      {error ? (
        <div className="card p-6 text-center text-sm text-danger">{error}</div>
      ) : loading && !data ? (
        <GridSkeleton count={6} />
      ) : data && data.plants.length === 0 ? (
        <EmptyState
          icon={Search}
          title={t('library.emptyTitle')}
          message={t('library.emptyMessage')}
          action={
            <button type="button" onClick={clearAll} className="btn-secondary">
              {t('library.clearFilters')}
            </button>
          }
        />
      ) : data ? (
        <>
          <p className="text-xs text-ink-faint">{t('library.found', { count: data.total })}</p>
          <div
            className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${loading ? 'opacity-60' : ''}`}
          >
            {data.plants.map((p) => (
              <Link
                key={p.id}
                to={`/library/${p.id}`}
                className="card group flex flex-col gap-2 p-5 transition duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-0.5 hover:border-accent hover:shadow-lift"
              >
                <div className="flex items-start gap-3">
                  {p.image_thumb_url ? (
                    <img
                      src={p.image_thumb_url}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-lg object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-light">
                      <Leaf className="h-6 w-6 text-accent" strokeWidth={1.5} aria-hidden="true" />
                    </span>
                  )}
                  <div className="flex flex-1 items-start justify-between gap-2">
                    <h2 className="font-display font-semibold text-ink group-hover:text-primary">
                      {libName(p)}
                    </h2>
                    <span className="shrink-0 rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-semibold text-primary-dark">
                      {t(`library.category.${p.category}`, { defaultValue: p.category })}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-ink-faint">
                  {libAltName(p)} · <span className="italic">{p.latin_name}</span>
                </p>
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-1 text-[11px] text-ink-soft">
                  <span className="rounded-full border border-line px-2 py-0.5">
                    {t(`library.lifecycle.${p.lifecycle}`, { defaultValue: p.lifecycle })}
                  </span>
                  <span className="rounded-full border border-line px-2 py-0.5">
                    {t(`library.difficulty.${p.difficulty}`, { defaultValue: p.difficulty })}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5">
                    <Sun className="h-3 w-3 text-accent" strokeWidth={2} aria-hidden="true" />
                    {t(`library.sun.${p.sun_requirement}`, { defaultValue: p.sun_requirement })}
                  </span>
                  {p.frost_sensitive && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-frost-bg px-2 py-0.5 text-frost">
                      <Snowflake className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                      {t('library.frostSensitive')}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="btn-secondary"
              >
                {t('common.previous')}
              </button>
              <span className="text-sm text-ink-soft">
                {t('common.pageOf', { page: data.page, total: totalPages })}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="btn-secondary"
              >
                {t('common.next')}
              </button>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
