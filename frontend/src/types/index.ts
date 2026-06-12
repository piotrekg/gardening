// Types mirroring docs/API.md (PlantDiary API Contract v1) exactly.
// All JSON fields are snake_case. IDs are typed as string (opaque identifiers
// passed verbatim between API responses, URLs and request bodies).

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export interface ApiErrorBody {
  error: string;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  /** Access-token TTL in seconds (900). */
  expires_in: number;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface LogoutRequest {
  refresh_token: string;
}

// ---------------------------------------------------------------------------
// Gardens
// ---------------------------------------------------------------------------

export type LocationType = 'indoor' | 'outdoor' | 'greenhouse';

export interface Garden {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  location_type: LocationType;
  area_sqm: number | null;
  plant_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateGardenRequest {
  name: string;
  description?: string;
  location_type: LocationType;
  area_sqm?: number;
}

export type UpdateGardenRequest = Partial<CreateGardenRequest>;

export interface GardenResponse {
  garden: Garden;
}

export interface GardensListResponse {
  gardens: Garden[];
}

export interface GardenHealthSummary {
  overdue_water: number;
  overdue_fertilize: number;
  due_today: number;
  ok: number;
  total: number;
}

export interface GardenDetailResponse {
  garden: Garden;
  health_summary: GardenHealthSummary;
}

// ---------------------------------------------------------------------------
// Plant library
// ---------------------------------------------------------------------------

export interface LibraryPlant {
  id: string;
  source?: string;
  family?: string;
  common_name_pl: string;
  common_name_en: string;
  latin_name: string;
  category: string;
  lifecycle: string;
  difficulty: string;
  sun_requirement: string;
  water_frequency_days: number | null;
  fertilize_frequency_days: number | null;
  sow_months: number[];
  transplant_months: number[];
  harvest_months: number[];
  frost_sensitive: boolean;
  companion_plants: string[];
  antagonist_plants: string[];
  typical_height_cm: number | null;
  spacing_cm: number | null;
  care_notes: string;
  common_pests: string[];
  tags: string[];
  /** Lightweight enrichment carried by list/search results and embedded instance libraries. */
  image_thumb_url?: string;
  image_url?: string;
  enriched?: boolean;
}

/** Kind of plant problem described in a disease record. */
export type DiseaseKind = 'disease' | 'pest' | 'disorder' | 'behavior';

/** A plant problem with bilingual symptoms/treatment/prevention. */
export interface PlantDisease {
  kind: DiseaseKind;
  name_pl: string;
  name_en: string;
  symptoms_pl: string;
  symptoms_en: string;
  treatment_pl: string;
  treatment_en: string;
  prevention_pl: string;
  prevention_en: string;
}

/**
 * Full enriched library plant returned by GET /api/plants/library/:id.
 * Bilingual long-form fields are always present but may be empty strings/arrays.
 */
export interface LibraryPlantDetail extends LibraryPlant {
  description_pl: string;
  description_en: string;
  watering_detail_pl: string;
  watering_detail_en: string;
  fertilizing_pl: string;
  fertilizing_en: string;
  light_pl: string;
  light_en: string;
  soil_pl: string;
  soil_en: string;
  pruning_pl: string;
  pruning_en: string;
  propagation_pl: string;
  propagation_en: string;
  harvest_detail_pl: string;
  harvest_detail_en: string;
  overwintering_pl: string;
  overwintering_en: string;
  toxicity_pl: string;
  toxicity_en: string;
  hardiness_zone: string;
  tips_pl: string[];
  tips_en: string[];
  enriched: boolean;
  image_url: string;
  image_thumb_url: string;
  image_source_url: string;
  image_license: string;
  image_attribution: string;
  diseases: PlantDisease[];
}

export type Difficulty = 'easy' | 'medium' | 'hard';
export type SunRequirement = 'full_sun' | 'partial_shade' | 'shade';

export interface LibrarySearchParams {
  search?: string;
  category?: string;
  lifecycle?: string;
  difficulty?: Difficulty;
  sun?: SunRequirement;
  /** Exact, case-insensitive tag match. */
  tag?: string;
  /** When true, only fully-documented (enriched) plants are returned. */
  enriched?: boolean;
  page?: number;
  page_size?: number;
}

export interface LibraryListResponse {
  plants: LibraryPlant[];
  total: number;
  page: number;
  page_size: number;
}

export interface LibraryCategoriesResponse {
  categories: string[];
}

export interface LibraryPlantResponse {
  plant: LibraryPlantDetail;
}

export interface CompanionsResponse {
  companions: LibraryPlant[];
  antagonists: LibraryPlant[];
}

// ---------------------------------------------------------------------------
// Plant instances
// ---------------------------------------------------------------------------

export type PlantStatus = 'active' | 'harvested' | 'removed' | 'dead';

export type CareStatusValue = 'overdue' | 'due_today' | 'ok' | 'unknown';

export interface CareStatus {
  water: CareStatusValue;
  fertilize: CareStatusValue;
}

export interface PlantInstance {
  id: string;
  garden_id: string;
  user_id: string;
  plant_library_id: string | null;
  custom_name: string | null;
  /** custom_name if set, else library common_name_pl. */
  display_name: string;
  planted_date: string | null;
  quantity: number;
  location_notes: string | null;
  status: PlantStatus;
  last_watered_at: string | null;
  last_fertilized_at: string | null;
  care_status: CareStatus;
  /** Per-instance watering override in days (null = use library default). */
  custom_water_frequency_days: number | null;
  /** Per-instance fertilizing override in days (null = use library default). */
  custom_fertilize_frequency_days: number | null;
  /** Frequency actually used for status (override if set, else library; 0 = unknown). */
  effective_water_frequency_days: number;
  /** Frequency actually used for status (override if set, else library; 0 = unknown). */
  effective_fertilize_frequency_days: number;
  library: LibraryPlant | null;
  created_at: string;
  updated_at: string;
}

/** Instances embedded in dashboard responses include garden_name. */
export interface DashboardPlantInstance extends PlantInstance {
  garden_name: string;
}

export interface CreatePlantInstanceRequest {
  plant_library_id?: string;
  custom_name?: string;
  planted_date?: string;
  location_notes?: string;
  quantity?: number;
  /** 1–365 sets a per-instance watering override; 0 clears it. */
  custom_water_frequency_days?: number;
  /** 1–365 sets a per-instance fertilizing override; 0 clears it. */
  custom_fertilize_frequency_days?: number;
}

export interface UpdatePlantInstanceRequest {
  custom_name?: string;
  location_notes?: string;
  quantity?: number;
  status?: PlantStatus;
  planted_date?: string;
  /** 1–365 sets a per-instance watering override; 0 clears it; omit to leave unchanged. */
  custom_water_frequency_days?: number;
  /** 1–365 sets a per-instance fertilizing override; 0 clears it; omit to leave unchanged. */
  custom_fertilize_frequency_days?: number;
}

export interface PlantInstanceResponse {
  plant: PlantInstance;
}

export interface PlantInstancesListResponse {
  plants: PlantInstance[];
}

export interface PlantInstanceDetailResponse {
  plant: PlantInstance;
  /** Last 10 care entries. */
  recent_care: CareEntry[];
}

// ---------------------------------------------------------------------------
// Care log
// ---------------------------------------------------------------------------

export type CareAction =
  | 'watered'
  | 'fertilized'
  | 'pruned'
  | 'repotted'
  | 'treated'
  | 'observed'
  | 'harvested';

export interface CareEntry {
  id: string;
  plant_instance_id: string;
  user_id: string;
  action: CareAction;
  note: string | null;
  quantity_harvested: number | null;
  timestamp: string;
  created_at: string;
}

export interface CreateCareEntryRequest {
  action: CareAction;
  note?: string;
  quantity_harvested?: number;
  timestamp?: string;
}

export interface CareEntryResponse {
  entry: CareEntry;
}

export interface CareLogResponse {
  entries: CareEntry[];
  total: number;
  page: number;
  page_size: number;
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

export interface Photo {
  id: string;
  plant_instance_id: string;
  url: string;
  thumb_url: string;
  file_size: number;
  created_at: string;
}

export interface PhotoResponse {
  photo: Photo;
}

export interface PhotosListResponse {
  photos: Photo[];
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface RecentCareEntry extends CareEntry {
  plant_name: string;
  garden_name: string;
}

export interface DashboardStats {
  garden_count: number;
  plant_count: number;
  care_actions_this_week: number;
}

export interface DashboardResponse {
  overdue_water: DashboardPlantInstance[];
  overdue_fertilize: DashboardPlantInstance[];
  due_today: DashboardPlantInstance[];
  sow_this_month: LibraryPlant[];
  transplant_this_month: LibraryPlant[];
  upcoming_harvests: DashboardPlantInstance[];
  recent_care: RecentCareEntry[];
  stats: DashboardStats;
}

// ---------------------------------------------------------------------------
// Compatibility
// ---------------------------------------------------------------------------

export type ConflictSeverity = 'warning' | 'conflict';

export interface CompatibilityConflict {
  plant_a: PlantInstance;
  plant_b: PlantInstance;
  severity: ConflictSeverity;
  reason: string;
}

export interface CompatibilityResponse {
  conflicts: CompatibilityConflict[];
}

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

export interface CalendarGardenTasks {
  sow: PlantInstance[];
  transplant: PlantInstance[];
  harvest: PlantInstance[];
}

export interface CalendarResponse {
  month: number;
  year: number;
  garden_tasks: CalendarGardenTasks;
  /** Library plants whose sow_months include the requested month. */
  recommendations: LibraryPlant[];
  frost_warning: boolean;
  frost_note: string;
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export interface AppNotification {
  id: string;
  type: string;
  message: string;
  plant_instance_id: string | null;
  created_at: string;
}

export interface NotificationsResponse {
  notifications: AppNotification[];
  unread_count: number;
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export interface HealthResponse {
  status: string;
  version: string;
  db: string;
  plant_library: number;
  uptime_seconds: number;
}
