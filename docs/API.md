# PlantDiary API Contract v1

Base URL: `/api`. All JSON fields snake_case. Auth via `Authorization: Bearer <access_token>`.
Errors: `{"error": "human readable message"}` with status 400 (validation), 401 (auth), 403, 404, 409, 500.

## Auth
- `POST /api/auth/register` body `{email, password, name}` → 201 `{user, access_token, refresh_token, expires_in}`
  - password: min 8 chars, ≥1 uppercase, ≥1 digit. email unique → 409 on conflict.
- `POST /api/auth/login` body `{email, password}` → 200 same shape as register.
- `POST /api/auth/refresh` body `{refresh_token}` → 200 `{access_token, refresh_token, expires_in}` (rotation: old token revoked).
- `POST /api/auth/logout` body `{refresh_token}` → 204.
- `GET /api/auth/me` → 200 `{id, email, name, created_at}`.

`user` object: `{id, email, name, created_at}`. `expires_in` = access token TTL seconds (900).

## Gardens
Garden object: `{id, user_id, name, description, location_type, area_sqm, plant_count, created_at, updated_at}`
`location_type` ∈ `indoor|outdoor|greenhouse`.
- `POST /api/gardens` `{name, description?, location_type, area_sqm?}` → 201 `{garden}`
- `GET /api/gardens` → `{gardens: [...]}` (each with `plant_count`)
- `GET /api/gardens/:id` → `{garden, health_summary: {overdue_water, overdue_fertilize, due_today, ok, total}}`
- `PUT /api/gardens/:id` (same body as POST, partial ok) → `{garden}`
- `DELETE /api/gardens/:id` → 204 (soft delete)

## Plant library
Library plant object: the plants.json schema (id, common_name_pl, common_name_en, latin_name, category, lifecycle, difficulty, sun_requirement, water_frequency_days, fertilize_frequency_days, sow_months, transplant_months, harvest_months, frost_sensitive, companion_plants, antagonist_plants, typical_height_cm, spacing_cm, care_notes, common_pests, tags) plus two optional catalog fields:
- `source`: `"curated"` (≈86 plants with full care data) or `"gbif"` (broad European catalog, ~5.9k species). Omitted/empty treated as curated.
- `family`: botanical family (catalog plants only).

Catalog (`gbif`) plants have no care schedule: numeric care fields are `0` and month arrays empty (UI shows "Brak danych"). Their `category` may be `wild`. They are searchable (name/latin/family) and can be added to gardens like any other plant. Curated plants always win on a latin-name collision and sort first in unfiltered listings.
- `GET /api/plants/library?search=&category=&lifecycle=&page=1&page_size=20` → `{plants: [...], total, page, page_size}`
  - search matches common_name_pl / common_name_en / latin_name, case-insensitive substring.
- `GET /api/plants/library/categories` → `{categories: ["vegetable", ...]}`
- `GET /api/plants/library/:id` → `{plant}`
- `GET /api/plants/library/:id/companions` → `{companions: [plant...], antagonists: [plant...]}` (full library objects; unresolvable slugs omitted)

## Plant instances
Instance object: `{id, garden_id, user_id, plant_library_id, custom_name, display_name, planted_date, quantity, location_notes, status, last_watered_at, last_fertilized_at, care_status, library, created_at, updated_at}`
- `display_name`: custom_name if set, else library common_name_pl.
- `status` ∈ `active|harvested|removed|dead`.
- `care_status`: `{water: "overdue|due_today|ok|unknown", fertilize: same}` — unknown when no library entry / never watered+no planted date.
- `library`: embedded library plant or null.
- `POST /api/gardens/:gardenId/plants` `{plant_library_id?, custom_name?, planted_date?, location_notes?, quantity?}` (at least one of plant_library_id/custom_name) → 201 `{plant}`
- `GET /api/gardens/:gardenId/plants` → `{plants: [...]}`
- `GET /api/gardens/:gardenId/plants/:id` → `{plant, recent_care: [entry...]}` (last 10)
- `PUT /api/gardens/:gardenId/plants/:id` `{custom_name?, location_notes?, quantity?, status?, planted_date?}` → `{plant}`
- `DELETE /api/gardens/:gardenId/plants/:id` → 204

## Care log
Entry: `{id, plant_instance_id, user_id, action, note, quantity_harvested, timestamp, created_at}`
`action` ∈ `watered|fertilized|pruned|repotted|treated|observed|harvested`.
- `POST /api/gardens/:gardenId/plants/:plantId/care` `{action, note?, quantity_harvested?, timestamp?}` → 201 `{entry}` (updates last_watered_at/last_fertilized_at)
- `GET /api/gardens/:gardenId/plants/:plantId/care?page=1&page_size=20` → `{entries: [...], total, page, page_size}` (newest first)

## Photos
Photo: `{id, plant_instance_id, url, thumb_url, file_size, created_at}`
- `POST .../photos` multipart field `photo`; max 10MB; jpg/png/webp → 201 `{photo}`
- `GET .../photos` → `{photos: [...]}`
- `DELETE .../photos/:photoId` → 204
- Files served at `GET /uploads/{userID}/{plantInstanceID}/{filename}`.

## Dashboard
`GET /api/dashboard` → 
```json
{
  "overdue_water": [instance...], "overdue_fertilize": [instance...], "due_today": [instance...],
  "sow_this_month": [library plant...], "transplant_this_month": [library plant...],
  "upcoming_harvests": [instance...],
  "recent_care": [{entry..., "plant_name": "...", "garden_name": "..."}],
  "stats": {"garden_count": 0, "plant_count": 0, "care_actions_this_week": 0}
}
```
Instances here include `garden_name`.

## Compatibility
`GET /api/gardens/:gardenId/compatibility` → `{conflicts: [{plant_a: instance, plant_b: instance, severity: "warning"|"conflict", reason}]}`
- `conflict` when both list each other as antagonists (or matching category slug), `warning` when one-directional.

## Calendar
`GET /api/calendar?month=6&year=2026` → 
```json
{
  "month": 6, "year": 2026,
  "garden_tasks": {"sow": [instance...], "transplant": [instance...], "harvest": [instance...]},
  "recommendations": [library plant...],   // sow_months includes month
  "frost_warning": false,
  "frost_note": "Last frost ~mid-April, first frost ~mid-October (PL zone 6a)"
}
```
`frost_warning` true for months 1-4 and 10-12.

## Notifications
- `GET /api/notifications` → `{notifications: [{id, type, message, plant_instance_id, created_at}], unread_count}`
- `POST /api/notifications/read` → 204

## Health
`GET /api/health` → `{"status":"ok","version":"1.0.0","db":"connected","plant_library":85,"uptime_seconds":1234}`
