import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowLeftRight,
  Bug,
  Droplet,
  Globe,
  type LucideIcon,
  Mountain,
  PartyPopper,
  Plus,
  Scissors,
  ShieldAlert,
  Snowflake,
  Sprout,
  Sun,
  Thermometer,
  Wheat,
  Wind,
} from 'lucide-react';
import { getApiErrorMessage } from '../api/client';
import { listGardens } from '../api/gardens';
import { getLibraryPlant, getLibraryPlantCompanions } from '../api/library';
import { addPlantToGarden } from '../api/plants';
import { HeroBotanical } from '../components/BotanicalArt';
import { Breadcrumb } from '../components/Breadcrumb';
import { Modal } from '../components/Modal';
import { SeasonCalendar } from '../components/SeasonCalendar';
import { Skeleton } from '../components/Skeleton';
import { TagChip } from '../components/TagChip';
import { useBilingual } from '../i18n/bilingual';
import { useLibraryPlantName } from '../i18n/libraryName';
import { prettifySlug } from '../i18n/slug';
import type {
  CompanionsResponse,
  Garden,
  LibraryPlant,
  LibraryPlantDetail,
  PlantDisease,
} from '../types';

function AddToGardenModal({
  plant,
  onClose,
}: {
  plant: LibraryPlant;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { name: libName } = useLibraryPlantName();
  const [gardens, setGardens] = useState<Garden[] | null>(null);
  const [gardenId, setGardenId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [plantedDate, setPlantedDate] = useState('');
  const [customWater, setCustomWater] = useState('');
  const [customFertilize, setCustomFertilize] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(!plant.water_frequency_days);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<Garden | null>(null);

  const hasSchedule = !!plant.water_frequency_days;

  useEffect(() => {
    listGardens()
      .then((g) => {
        setGardens(g);
        if (g.length > 0) setGardenId(g[0].id);
      })
      .catch((err) => setError(getApiErrorMessage(err, t('gardens.loadError'))));
  }, [t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gardenId) {
      setError(t('libraryPlant.addModal.pickGarden'));
      return;
    }
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      setError(t('plantSearch.quantityInvalid'));
      return;
    }
    // Empty -> omit (no override). Positive 1-365 -> set. Anything else -> invalid.
    const parseFrequency = (value: string): number | 'empty' | 'invalid' => {
      const trimmed = value.trim();
      if (trimmed === '') return 'empty';
      const n = Number(trimmed);
      if (!Number.isInteger(n) || n < 1 || n > 365) return 'invalid';
      return n;
    };
    const water = parseFrequency(customWater);
    const fertilize = parseFrequency(customFertilize);
    if (water === 'invalid' || fertilize === 'invalid') {
      setError(t('plant.customSchedule.rangeInvalid'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await addPlantToGarden(gardenId, {
        plant_library_id: plant.id,
        quantity: qty,
        ...(plantedDate ? { planted_date: plantedDate } : {}),
        ...(typeof water === 'number' ? { custom_water_frequency_days: water } : {}),
        ...(typeof fertilize === 'number' ? { custom_fertilize_frequency_days: fertilize } : {}),
      });
      setSuccess(gardens?.find((g) => g.id === gardenId) ?? null);
    } catch (err) {
      setError(getApiErrorMessage(err, t('plantSearch.failed')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={t('libraryPlant.addModal.title', { name: libName(plant) })} onClose={onClose}>
      {success ? (
        <div className="space-y-4 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary-dark">
            <PartyPopper className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
          </span>
          <p className="text-sm text-ink">
            {t('libraryPlant.addModal.success', { plant: libName(plant), garden: success.name })}
          </p>
          <div className="flex justify-center gap-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              {t('common.close')}
            </button>
            <Link to={`/gardens/${success.id}`} className="btn-primary">
              {t('libraryPlant.addModal.viewGarden')}
            </Link>
          </div>
        </div>
      ) : gardens === null ? (
        <p className="py-4 text-center text-sm text-ink-faint">
          {t('libraryPlant.addModal.loadingGardens')}
        </p>
      ) : gardens.length === 0 ? (
        <div className="space-y-3 text-center">
          <p className="text-sm text-ink-soft">{t('libraryPlant.addModal.noGardens')}</p>
          <Link to="/gardens" className="btn-primary inline-flex">
            {t('libraryPlant.addModal.goToGardens')}
          </Link>
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate>
          {error && (
            <div className="rounded-md border border-danger-line bg-danger-bg px-3 py-2 text-sm text-danger" role="alert">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="atg-garden" className="mb-1 block text-sm font-medium text-ink-soft">
              {t('libraryPlant.addModal.garden')}
            </label>
            <select
              id="atg-garden"
              value={gardenId}
              onChange={(e) => setGardenId(e.target.value)}
              className="input-field"
            >
              {gardens.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="atg-qty" className="mb-1 block text-sm font-medium text-ink-soft">
                {t('plantSearch.quantity')}
              </label>
              <input
                id="atg-qty"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label htmlFor="atg-date" className="mb-1 block text-sm font-medium text-ink-soft">
                {t('plantSearch.plantedDate')}
              </label>
              <input
                id="atg-date"
                type="date"
                value={plantedDate}
                onChange={(e) => setPlantedDate(e.target.value)}
                className="input-field"
              />
            </div>
          </div>
          <div className="rounded-md border border-line p-3">
            {hasSchedule && !scheduleOpen ? (
              <button
                type="button"
                onClick={() => setScheduleOpen(true)}
                className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {t('plant.customSchedule.sectionTitle')}
              </button>
            ) : (
              <>
                <p className="mb-2 text-sm font-medium text-ink-soft">
                  {t('plant.customSchedule.sectionTitle')}
                </p>
                {!hasSchedule && (
                  <p className="mb-3 text-xs text-ink-faint">
                    {t('plant.customSchedule.sectionHint')}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="atg-water" className="mb-1 block text-sm font-medium text-ink-soft">
                      {t('plant.customSchedule.waterLabel')}{' '}
                      <span className="font-normal text-ink-faint">({t('common.optional')})</span>
                    </label>
                    <input
                      id="atg-water"
                      type="number"
                      min={1}
                      max={365}
                      value={customWater}
                      onChange={(e) => setCustomWater(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label htmlFor="atg-fertilize" className="mb-1 block text-sm font-medium text-ink-soft">
                      {t('plant.customSchedule.fertilizeLabel')}{' '}
                      <span className="font-normal text-ink-faint">({t('common.optional')})</span>
                    </label>
                    <input
                      id="atg-fertilize"
                      type="number"
                      min={1}
                      max={365}
                      value={customFertilize}
                      onChange={(e) => setCustomFertilize(e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting
                ? t('libraryPlant.addModal.submitting')
                : t('libraryPlant.addModal.submit')}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

/** Section header: copper eyebrow over a Playfair title. */
function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-4">
      <p className="eyebrow mb-2.5">{eyebrow}</p>
      <h2 className="font-display text-2xl font-semibold text-ink">{title}</h2>
    </div>
  );
}

/** A care-guide tile; renders nothing when its content is empty. */
function CareBlock({
  icon: Icon,
  label,
  body,
}: {
  icon: LucideIcon;
  label: string;
  body: string;
}) {
  if (!body) return null;
  return (
    <div className="care-cell bg-surface p-5">
      <span className="mb-3 flex h-[30px] w-[30px] items-center justify-center rounded-[3px] bg-forest-pale text-forest">
        <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.09em] text-copper">{label}</p>
      {/* P1: 400 weight, 13.5px for readability. */}
      <p className="whitespace-pre-line text-[13.5px] font-normal leading-[1.8] text-ink">{body}</p>
    </div>
  );
}

const DISEASE_KIND_STYLES: Record<PlantDisease['kind'], { badge: string; icon: LucideIcon }> = {
  disease: { badge: 'bg-warn-bg text-warn border-warn-line', icon: Bug },
  pest: { badge: 'bg-warn-bg text-warn border-warn-line', icon: Bug },
  disorder: { badge: 'bg-frost-bg text-frost border-frost-line', icon: ShieldAlert },
  behavior: { badge: 'bg-frost-bg text-frost border-frost-line', icon: Wind },
};

function DiseaseCard({ disease }: { disease: PlantDisease }) {
  const { t } = useTranslation();
  const { pick } = useBilingual();
  const style = DISEASE_KIND_STYLES[disease.kind];
  const KindIcon = style.icon;
  const name = pick(disease.name_pl, disease.name_en);
  const symptoms = pick(disease.symptoms_pl, disease.symptoms_en);
  const treatment = pick(disease.treatment_pl, disease.treatment_en);
  const prevention = pick(disease.prevention_pl, disease.prevention_en);

  return (
    <div className="bg-surface p-5">
      <div className="mb-3 flex flex-wrap items-start gap-2.5">
        <span
          className={`mt-0.5 inline-flex items-center gap-1 rounded-[2px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.1em] ${style.badge}`}
        >
          <KindIcon className="h-2.5 w-2.5" strokeWidth={2} aria-hidden="true" />
          {t(`diseaseKind.${disease.kind}`)}
        </span>
        <h3 className="font-display text-[17px] font-semibold text-ink">{name}</h3>
      </div>
      <div className="space-y-1 text-[13px]">
        {symptoms && (
          <>
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-ink-faint">
              {t('plantProfile.symptoms')}
            </p>
            <p className="font-light leading-[1.8] text-ink">{symptoms}</p>
          </>
        )}
        {treatment && (
          // P11: clean, intentional treatment box — rounded 3px, forest-pale fill,
          // generous left padding; no flat left-border that fought the radius.
          <div className="mt-2 rounded-[3px] bg-forest-pale py-2.5 pl-4 pr-3.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-forest-mid">
              {t('plantProfile.treatment')}
            </p>
            <p className="leading-[1.7] text-forest-mid">{treatment}</p>
          </div>
        )}
        {prevention && (
          <>
            <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.1em] text-ink-faint">
              {t('plantProfile.prevention')}
            </p>
            <p className="font-light leading-[1.8] text-ink">{prevention}</p>
          </>
        )}
      </div>
    </div>
  );
}

/** One stat cell in the quick-stats bar; only rendered when value present. */
function StatCell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border-r border-line px-5 py-4 last:border-r-0">
      <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-ink-faint">{label}</p>
      <p className="font-display text-[22px] font-semibold leading-none text-ink">{value}</p>
      {sub && <p className="mt-1 text-[11px] font-light text-ink-faint">{sub}</p>}
    </div>
  );
}

function CompanionsBlock({
  tone,
  title,
  plants,
}: {
  tone: 'good' | 'bad';
  title: string;
  plants: LibraryPlant[];
}) {
  const { t } = useTranslation();
  const { name: libName } = useLibraryPlantName();
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-md border border-line bg-surface">
      <div
        className={`border-b border-line px-4 py-3 text-[10px] font-bold uppercase tracking-[0.09em] ${
          tone === 'good' ? 'bg-forest-pale text-forest' : 'bg-danger-bg text-danger'
        }`}
      >
        {title}
      </div>
      <div className="flex flex-col px-4 py-2.5">
        {plants.length === 0 ? (
          <p className="py-1 text-[13px] font-light text-ink-faint">{t('libraryPlant.noneListed')}</p>
        ) : (
          plants.map((p) => (
            <Link
              key={p.id}
              to={`/library/${p.id}`}
              className="flex items-center gap-2 border-b border-paper py-1.5 text-[13px] font-light text-ink last:border-b-0 hover:text-copper"
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  tone === 'good' ? 'bg-forest-light' : 'bg-danger'
                }`}
              />
              {libName(p)}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

export function LibraryPlantPage() {
  const { t } = useTranslation();
  const { name: libName } = useLibraryPlantName();
  const { pick, pickField } = useBilingual();
  const { id } = useParams<{ id: string }>();
  const plantId = id ?? '';

  const [plant, setPlant] = useState<LibraryPlantDetail | null>(null);
  const [companions, setCompanions] = useState<CompanionsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (!plantId) return;
    let cancelled = false;
    setPlant(null);
    setCompanions(null);
    getLibraryPlant(plantId)
      .then((p) => {
        if (!cancelled) setPlant(p);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, t('libraryPlant.loadError')));
      });
    getLibraryPlantCompanions(plantId)
      .then((c) => {
        if (!cancelled) setCompanions(c);
      })
      .catch(() => {
        if (!cancelled) setCompanions({ companions: [], antagonists: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [plantId, t]);

  if (error) {
    return (
      <div className="card p-6 text-center">
        <p className="text-sm text-danger">{error}</p>
        <Link
          to="/library"
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          {t('libraryPlant.backToLibrary')}
        </Link>
      </div>
    );
  }

  if (!plant) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-72" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  const currentMonth = new Date().getMonth() + 1;

  const name = libName(plant);
  const description = pickField(plant, 'description');
  const light = pickField(plant, 'light');
  const soil = pickField(plant, 'soil');
  const wateringDetail = pickField(plant, 'watering_detail');
  const fertilizing = pickField(plant, 'fertilizing');
  const pruning = pickField(plant, 'pruning');
  const propagation = pickField(plant, 'propagation');
  const harvestDetail = pickField(plant, 'harvest_detail');
  const overwintering = pickField(plant, 'overwintering');
  const toxicity = pickField(plant, 'toxicity');
  const tips = pick(plant.tips_pl, plant.tips_en);
  const hasCareGuide = Boolean(
    light || soil || wateringDetail || fertilizing || pruning || propagation || harvestDetail || overwintering,
  );

  const difficultyLabel = t(`library.difficulty.${plant.difficulty}`, {
    defaultValue: plant.difficulty,
  });

  // Quick-stats: only cells with data.
  const stats: { label: string; value: string; sub?: string }[] = [];
  if (plant.typical_height_cm)
    stats.push({ label: t('libraryPlant.stats.height'), value: `${plant.typical_height_cm}`, sub: 'cm' });
  if (plant.spacing_cm)
    stats.push({ label: t('libraryPlant.stats.spacing'), value: `${plant.spacing_cm}`, sub: 'cm' });
  if (plant.water_frequency_days)
    stats.push({
      label: t('libraryPlant.stats.watering'),
      value: `${plant.water_frequency_days}`,
      sub: t('libraryPlant.stats.everyDaysShort', { count: plant.water_frequency_days }),
    });
  if (plant.fertilize_frequency_days)
    stats.push({
      label: t('libraryPlant.stats.fertilizing'),
      value: `${plant.fertilize_frequency_days}`,
      sub: t('libraryPlant.stats.everyDaysShort', { count: plant.fertilize_frequency_days }),
    });
  if (plant.harvest_months.length > 0)
    stats.push({
      label: t('libraryPlant.stats.harvest'),
      value: String(Math.min(...plant.harvest_months)).padStart(2, '0'),
      sub: t('libraryPlant.timeline.legendHarvest'),
    });

  // "Now to do" context hint from current month vs the plant's windows.
  let nowKey = 'libraryPlant.sidebar.nowGeneric';
  if (plant.harvest_months.includes(currentMonth)) nowKey = 'libraryPlant.sidebar.nowHarvest';
  else if (plant.sow_months.includes(currentMonth)) nowKey = 'libraryPlant.sidebar.nowSow';
  else if (plant.transplant_months.includes(currentMonth)) nowKey = 'libraryPlant.sidebar.nowTransplant';

  const params: { name: string; val: string }[] = [
    {
      name: t('libraryPlant.sunRequirement'),
      val: t(`library.sun.${plant.sun_requirement}`, { defaultValue: plant.sun_requirement }),
    },
  ];
  if (plant.water_frequency_days)
    params.push({
      name: t('libraryPlant.waterEvery'),
      val: t('common.everyDays', { count: plant.water_frequency_days }),
    });
  if (plant.fertilize_frequency_days)
    params.push({
      name: t('libraryPlant.fertilizeEvery'),
      val: t('common.everyDays', { count: plant.fertilize_frequency_days }),
    });
  if (plant.typical_height_cm)
    params.push({ name: t('libraryPlant.typicalHeight'), val: `${plant.typical_height_cm} cm` });
  if (plant.spacing_cm)
    params.push({ name: t('libraryPlant.spacing'), val: `${plant.spacing_cm} cm` });
  if (plant.hardiness_zone)
    params.push({ name: t('plantProfile.hardiness'), val: plant.hardiness_zone });

  // H2: at most 4 hero tags — category (primary) + lifecycle + difficulty +
  // frost-sensitive. Raw plant.tags are intentionally not surfaced here so the
  // row never exceeds four and stays legible over the photo.
  const heroTags: { label: string; primary?: boolean; to?: string }[] = [
    {
      label: t(`library.category.${plant.category}`, { defaultValue: plant.category }),
      primary: true,
      to: `/library?category=${encodeURIComponent(plant.category)}`,
    },
    {
      label: t(`library.lifecycle.${plant.lifecycle}`, { defaultValue: plant.lifecycle }),
      to: `/library?lifecycle=${encodeURIComponent(plant.lifecycle)}`,
    },
    {
      label: difficultyLabel,
      to: `/library?difficulty=${encodeURIComponent(plant.difficulty)}`,
    },
  ];
  if (plant.frost_sensitive) heroTags.push({ label: t('library.frostSensitive') });
  const visibleHeroTags = heroTags.slice(0, 4);

  return (
    <div className="-mx-4 -mt-6 md:-mx-8 md:-mt-8">
      {/* Breadcrumb: Library / <category> / <plant name>. */}
      <div className="px-4 pt-4 md:px-8">
        <Breadcrumb
          items={[
            { label: t('nav.library'), to: '/library' },
            {
              label: t(`library.category.${plant.category}`, { defaultValue: plant.category }),
              to: `/library?category=${encodeURIComponent(plant.category)}`,
            },
            { label: name },
          ]}
        />
      </div>

      {/* HERO */}
      <div className="relative mt-3 h-[420px] overflow-hidden sm:h-[480px]">
        {plant.image_url ? (
          <div className="absolute inset-0 bg-forest">
            <img
              src={plant.image_url}
              alt={name}
              className="h-full w-full object-cover opacity-75"
              loading="eager"
            />
          </div>
        ) : (
          // P6: radial fallback — deepest toward the bottom-left where the title
          // sits, lifting toward the top-right; keeps the forest palette.
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(120% 120% at 78% 18%, #3D6342 0%, #2D4A31 38%, #1A2E1E 68%, #111F13 100%)',
            }}
          >
            <HeroBotanical />
          </div>
        )}
        {/* H1: stronger overlay — darken from ~30% height to near-opaque at the
            bottom, plus an inset bottom shadow so the title reads over any photo. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, transparent 30%, rgba(8,16,10,0.45) 62%, rgba(8,16,10,0.92) 100%)',
            boxShadow: 'inset 0 -200px 120px -40px rgba(8,16,10,0.95)',
          }}
        />
        <div className="absolute inset-x-0 bottom-0 grid grid-cols-1 items-end gap-6 px-6 pb-9 pt-12 sm:grid-cols-[1fr_auto] sm:px-16">
          <div>
            {/* H4: 20px gap below the tag row. H2: padding 2px 7px, font 9px. */}
            <div className="mb-5 flex flex-wrap gap-1.5">
              {visibleHeroTags.map((tag, i) => {
                const className = `rounded-[2px] border px-[7px] py-[2px] text-[9px] font-semibold uppercase tracking-[0.1em] transition ${
                  tag.primary
                    ? 'border-copper bg-copper text-white hover:bg-copper-light'
                    : 'border-white/25 bg-white/[0.06] text-white/70 hover:border-white/50 hover:text-white'
                }`;
                return tag.to ? (
                  <Link key={i} to={tag.to} className={className}>
                    {tag.label}
                  </Link>
                ) : (
                  <span key={i} className={className}>
                    {tag.label}
                  </span>
                );
              })}
            </div>
            {/* H3: dominant title — clamp(48px, 5vw, 72px) Playfair 700. */}
            <h1
              className="font-display font-bold leading-[1.02] tracking-tight text-white"
              style={{ fontSize: 'clamp(48px, 5vw, 72px)' }}
            >
              {name}
            </h1>
            {plant.latin_name && (
              <p className="mt-2.5 font-display text-sm italic text-white/55">{plant.latin_name}</p>
            )}
          </div>
          {/* H5: container px-16 (64px) gives the right block the same 64px edge
              gap as the left content. */}
          <div className="text-left sm:pb-1 sm:text-right">
            <p className="mb-1 text-[10px] uppercase tracking-[0.08em] text-white/45">
              {t('plantDetail.difficulty')}
            </p>
            <p className="font-display text-2xl font-semibold text-copper-light">{difficultyLabel}</p>
            {plant.frost_sensitive && (
              <p className="mt-2 flex items-center gap-1.5 text-[10px] tracking-[0.04em] text-white/40 sm:justify-end">
                <Snowflake className="h-3 w-3 opacity-50" strokeWidth={2} aria-hidden="true" />
                {t('library.frostSensitive')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Status sentence directly under the hero — the "what now / what next"
          answer is the first thing you read. */}
      <div className="mx-auto max-w-6xl px-4 pt-8 md:px-8">
        <SeasonCalendar
          section="status"
          sowMonths={plant.sow_months}
          transplantMonths={plant.transplant_months}
          harvestMonths={plant.harvest_months}
        />
      </div>

      {/* MAIN GRID */}
      <div className="mx-auto max-w-6xl px-4 pb-20 md:px-8">
        <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-[1fr_300px] lg:gap-16">
          {/* CONTENT */}
          <div>
            {!plant.enriched && (
              <div className="mb-8 flex items-center gap-2 rounded-md border border-warn-line bg-warn-bg px-4 py-3 text-sm text-warn">
                <Sprout className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                {t('plantProfile.comingSoon')}
              </div>
            )}

            {/* Quick stats. P4: 24px top gap on stacked (≤960px) layouts so it
                doesn't hug the hero bottom; flush on the desktop two-col grid. */}
            {stats.length > 0 && (
              <div
                className="mb-2 mt-6 grid overflow-hidden rounded-md border border-line bg-surface lg:mt-0"
                style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
              >
                {stats.map((s, i) => (
                  <StatCell key={i} label={s.label} value={s.value} sub={s.sub} />
                ))}
              </div>
            )}

            {/* Season timeline axis — borderless, at the top of the content
                column (the status sentence lives up under the hero). */}
            <section className="mt-10">
              <SeasonCalendar
                section="axis"
                sowMonths={plant.sow_months}
                transplantMonths={plant.transplant_months}
                harvestMonths={plant.harvest_months}
              />
            </section>
            <hr className="copper-rule my-12" />

            {/* Description with drop cap */}
            {description && (
              <section className="mt-10">
                <SectionHeader
                  eyebrow={t('libraryPlant.eyebrow.description')}
                  title={t('plantProfile.description')}
                />
                <p className="drop-cap whitespace-pre-line text-[15px] font-light leading-[1.85] text-ink">
                  {description}
                </p>
              </section>
            )}

            {/* Toxicity */}
            {toxicity && (
              <div className="mt-6 flex items-start gap-3 rounded-md border border-warn-line bg-warn-bg px-4 py-3.5">
                <ShieldAlert className="mt-0.5 h-[18px] w-[18px] shrink-0 text-warn" strokeWidth={1.75} aria-hidden="true" />
                <p className="text-[12px] leading-[1.65] text-warn">
                  <strong className="font-semibold">{t('plantProfile.toxicity')}: </strong>
                  {toxicity}
                </p>
              </div>
            )}

            {/* Care guide */}
            {hasCareGuide && (
              <>
                <hr className="copper-rule my-12" />
                <section>
                  <SectionHeader
                    eyebrow={t('libraryPlant.eyebrow.careGuide')}
                    title={t('plantProfile.careGuide')}
                  />
                  <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2">
                    <CareBlock icon={Sun} label={t('plantProfile.light')} body={light} />
                    <CareBlock icon={Mountain} label={t('plantProfile.soil')} body={soil} />
                    <CareBlock icon={Droplet} label={t('plantProfile.watering')} body={wateringDetail} />
                    <CareBlock icon={Wheat} label={t('plantProfile.fertilizing')} body={fertilizing} />
                    <CareBlock icon={Scissors} label={t('plantProfile.pruning')} body={pruning} />
                    <CareBlock icon={Sprout} label={t('plantProfile.propagation')} body={propagation} />
                    <CareBlock icon={Wheat} label={t('plantProfile.harvest')} body={harvestDetail} />
                    <CareBlock icon={Snowflake} label={t('plantProfile.overwintering')} body={overwintering} />
                  </div>
                </section>
              </>
            )}

            {/* Tips */}
            {tips.length > 0 && (
              <>
                <hr className="copper-rule my-12" />
                <section>
                  <SectionHeader eyebrow={t('libraryPlant.eyebrow.tips')} title={t('plantProfile.tips')} />
                  <div className="overflow-hidden rounded-md border border-line">
                    {tips.map((tip, i) => (
                      <div
                        key={i}
                        // P12: tips are not interactive — no hover bg, default cursor.
                        className="flex cursor-default items-start gap-3.5 border-b border-line bg-surface px-5 py-3.5 text-[13px] font-light leading-[1.7] text-ink last:border-b-0"
                      >
                        <span className="w-5 shrink-0 text-right font-display text-[17px] font-bold leading-tight text-copper">
                          {i + 1}
                        </span>
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            {/* Diseases */}
            {plant.diseases.length > 0 && (
              <>
                <hr className="copper-rule my-12" />
                <section>
                  <SectionHeader
                    eyebrow={t('libraryPlant.eyebrow.diseases')}
                    title={t('plantProfile.diseases')}
                  />
                  <div className="flex flex-col gap-px overflow-hidden rounded-md border border-line bg-line">
                    {plant.diseases.map((disease, i) => (
                      <DiseaseCard key={i} disease={disease} />
                    ))}
                  </div>
                </section>
              </>
            )}

            {/* Companions */}
            <hr className="copper-rule my-12" />
            <section>
              <SectionHeader
                eyebrow={t('libraryPlant.eyebrow.companions')}
                title={t('libraryPlant.goodCompanions')}
              />
              {/* P9: stretch so good/bad blocks are equal height. */}
              <div className="grid grid-cols-1 items-stretch gap-3.5 sm:grid-cols-2">
                <CompanionsBlock
                  tone="good"
                  title={t('libraryPlant.goodCompanions')}
                  plants={companions?.companions ?? []}
                />
                <CompanionsBlock
                  tone="bad"
                  title={t('libraryPlant.keepApart')}
                  plants={companions?.antagonists ?? []}
                />
              </div>
            </section>

            {plant.source === 'gbif' && (
              <div className="mt-8 flex items-start gap-2 rounded-md border border-warn-line bg-warn-bg px-4 py-3 text-sm text-warn">
                <Globe className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                {t('libraryPlant.catalogNote')}
              </div>
            )}
          </div>

          {/* SIDEBAR */}
          <aside className="self-start lg:sticky lg:top-20">
            {/* CTA */}
            <div className="mb-3.5 rounded-md bg-forest px-5 py-5 text-center">
              <p className="font-display text-[17px] font-semibold text-white">
                {t('libraryPlant.sidebar.ctaTitle')}
              </p>
              <p className="mb-3.5 mt-1 text-[11px] font-light text-white/50">
                {t('libraryPlant.sidebar.ctaSub')}
              </p>
              {/* P3: CTA label bumped to 13px. */}
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-[3px] bg-parchment px-4 py-2.5 text-[13px] font-semibold tracking-[0.04em] text-forest transition hover:bg-white"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {t('libraryPlant.sidebar.ctaButton')}
              </button>
            </div>

            {/* Now to do */}
            <div className="mb-3.5 rounded-md border border-forest-light/25 bg-forest-pale px-4 py-4">
              <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.1em] text-forest">
                {t('libraryPlant.sidebar.nowTitle')}
              </p>
              <p className="text-[12px] leading-[1.7] text-forest-mid">{t(nowKey)}</p>
            </div>

            {/* Params + pests + status card */}
            <div className="overflow-hidden rounded-md border border-line bg-surface">
              <div className="border-b border-line px-[18px] py-[18px]">
                <p className="mb-2.5 text-[9px] font-bold uppercase tracking-[0.1em] text-ink-faint">
                  {t('libraryPlant.sidebar.paramsTitle')}
                </p>
                {params.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-baseline justify-between border-b border-paper py-1.5 text-[12px] last:border-b-0"
                  >
                    <span className="font-light text-ink-muted">{p.name}</span>
                    <span className="font-medium text-ink">{p.val}</span>
                  </div>
                ))}
              </div>
              {plant.common_pests.length > 0 && (
                <div className="border-b border-line px-[18px] py-[18px]">
                  <p className="mb-2.5 text-[9px] font-bold uppercase tracking-[0.1em] text-ink-faint">
                    {t('libraryPlant.sidebar.pestsTitle')}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {plant.common_pests.map((pest) => (
                      <span
                        key={pest}
                        className="rounded-[2px] border border-line bg-paper px-2 py-0.5 text-[10px] text-ink-muted"
                      >
                        {t(`pest.${pest}`, { defaultValue: prettifySlug(pest) })}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {plant.tags.length > 0 && (
                <div className="border-b border-line px-[18px] py-[18px]">
                  <p className="mb-2.5 text-[9px] font-bold uppercase tracking-[0.1em] text-ink-faint">
                    {t('library.tagsTitle')}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {plant.tags.map((tag) => (
                      <TagChip key={tag} tag={tag} />
                    ))}
                  </div>
                </div>
              )}
              <div className="px-[18px] py-[18px]">
                <p className="mb-2.5 text-[9px] font-bold uppercase tracking-[0.1em] text-ink-faint">
                  {t('libraryPlant.sidebar.statusTitle')}
                </p>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-light text-ink-muted">
                    {plant.enriched
                      ? t('libraryPlant.sidebar.statusEnriched')
                      : t('libraryPlant.sidebar.statusBasic')}
                  </span>
                  <span
                    className={`flex items-center gap-1.5 font-medium ${
                      plant.enriched ? 'text-forest-light' : 'text-ink-faint'
                    }`}
                  >
                    <Thermometer className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                    {plant.hardiness_zone || (
                      <ArrowLeftRight className="h-3.5 w-3.5 opacity-40" aria-hidden="true" />
                    )}
                  </span>
                </div>
              </div>
            </div>

            {plant.care_notes && (
              <div className="mt-3.5 rounded-md border border-copper-pale bg-copper-pale/50 px-4 py-3.5">
                <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-copper">
                  {t('libraryPlant.careNotes')}
                </p>
                <p className="text-[12px] leading-[1.7] text-ink">{plant.care_notes}</p>
              </div>
            )}
          </aside>
        </div>
      </div>

      {showAdd && <AddToGardenModal plant={plant} onClose={() => setShowAdd(false)} />}
    </div>
  );
}
