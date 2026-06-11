import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { getApiErrorMessage } from '../api/client';
import { getLibraryCategories, searchLibrary } from '../api/library';
import { EmptyState } from '../components/EmptyState';
import { GridSkeleton } from '../components/Skeleton';
import { useLibraryPlantName } from '../i18n/libraryName';
import type { LibraryListResponse } from '../types';

const LIFECYCLES = ['annual', 'biennial', 'perennial'];
const PAGE_SIZE = 18;

export function LibraryPage() {
  const { t } = useTranslation();
  const { name: libName, altName: libAltName } = useLibraryPlantName();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') ?? '';
  const category = searchParams.get('category') ?? '';
  const lifecycle = searchParams.get('lifecycle') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);

  const [searchInput, setSearchInput] = useState(search);
  const [categories, setCategories] = useState<string[]>([]);
  const [data, setData] = useState<LibraryListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLibraryCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  // Debounce search input → URL params.
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
  }, [search, category, lifecycle, page, t]);

  const setFilter = (key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete('page');
      return next;
    });
  };

  const setPage = (p: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (p > 1) next.set('page', String(p));
      else next.delete('page');
      return next;
    });
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t('library.title')}</h1>
        <p className="mt-0.5 text-sm text-gray-500">{t('library.subtitle')}</p>
      </div>

      <div className="card flex flex-col gap-3 p-4 sm:flex-row">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={t('library.searchPlaceholder')}
          className="input-field flex-1"
          aria-label={t('library.searchAria')}
        />
        <select
          value={category}
          onChange={(e) => setFilter('category', e.target.value)}
          className="input-field sm:w-44"
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
          className="input-field sm:w-40"
          aria-label={t('library.filterLifecycle')}
        >
          <option value="">{t('library.allLifecycles')}</option>
          {LIFECYCLES.map((l) => (
            <option key={l} value={l}>
              {t(`library.lifecycle.${l}`, { defaultValue: l })}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <div className="card p-6 text-center text-sm text-red-600">{error}</div>
      ) : loading && !data ? (
        <GridSkeleton count={6} />
      ) : data && data.plants.length === 0 ? (
        <EmptyState
          icon="🔍"
          title={t('library.emptyTitle')}
          message={t('library.emptyMessage')}
          action={
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setSearchParams(new URLSearchParams());
              }}
              className="btn-secondary"
            >
              {t('library.clearFilters')}
            </button>
          }
        />
      ) : data ? (
        <>
          <p className="text-xs text-gray-400">{t('library.found', { count: data.total })}</p>
          <div
            className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${loading ? 'opacity-60' : ''}`}
          >
            {data.plants.map((p) => (
              <Link
                key={p.id}
                to={`/library/${p.id}`}
                className="card group flex flex-col gap-2 p-5 transition hover:shadow-card-hover"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-gray-800 group-hover:text-primary">
                    {libName(p)}
                  </h2>
                  <span className="shrink-0 rounded-full bg-primary-light/60 px-2 py-0.5 text-[11px] font-semibold text-primary-dark">
                    {t(`library.category.${p.category}`, { defaultValue: p.category })}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  {libAltName(p)} · <span className="italic">{p.latin_name}</span>
                </p>
                <div className="mt-auto flex flex-wrap gap-2 pt-1 text-[11px] text-gray-500">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5">
                    {t(`library.lifecycle.${p.lifecycle}`, { defaultValue: p.lifecycle })}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5">
                    {t(`library.difficulty.${p.difficulty}`, { defaultValue: p.difficulty })}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5">
                    ☀️ {t(`library.sun.${p.sun_requirement}`, { defaultValue: p.sun_requirement })}
                  </span>
                  {p.frost_sensitive && (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-600">
                      ❄️ {t('library.frostSensitive')}
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
              <span className="text-sm text-gray-500">
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
