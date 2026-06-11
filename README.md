# PlantDiary 🌱

**plantdiary.app** — a production-ready garden management web application.
Track your gardens, plants, watering and fertilizing schedules, harvests,
photos, and companion-planting conflicts — tuned for Polish / Central European
gardens (climate zone 6a).

## Stack

| Layer | Tech |
|---|---|
| Backend | Go · Gin · GORM · PostgreSQL 17 (pure-Go pgx driver) |
| Frontend | React 18 · TypeScript · Vite · TailwindCSS v4 · Zustand · Axios |
| Auth | JWT (15 min access / 7 day refresh with rotation) · bcrypt |
| Plant data | Curated JSON (570 plants, full care data) + GBIF catalog (~13.3k European species), seeded into the `library_plants` Postgres table; search served by SQL, hot per-plant lookups by an in-memory cache |
| Migrations | Embedded sequential SQL runner (golang-migrate file/table convention), PostgreSQL dialect |
| Deployment | Docker Compose (app + dedicated Postgres) behind the host's Traefik · systemd/nginx configs included |

## Features

- **Auth** — register/login/refresh/logout with refresh-token rotation and revocation.
- **Gardens** — multiple gardens per user (indoor/outdoor/greenhouse), soft delete.
- **Plant library** — 86 curated plants with Polish names, sowing/transplant/harvest
  months, watering & fertilizing frequencies, companions and antagonists, **plus a
  ~5.9k-species European catalog** imported from GBIF (latin + PL/EN names) so almost
  any European plant can be found and added; catalog plants have no care schedule.
- **Catalog importer** — `cmd/plantimport` fetches Europe-recorded vascular plants
  from the public GBIF API (occurrence-ranked, with vernacular names) and writes the
  committed `catalog.json`; the running server makes no external API calls.
- **Plant instances** — add library or custom plants to gardens; computed care
  status (`overdue` / `due_today` / `ok`) from care history and library frequency.
- **Care log** — watered, fertilized, pruned, repotted, treated, observed, harvested.
- **Photos** — multipart upload (≤10 MB, jpg/png/webp), pure-Go thumbnails (≤400px).
- **Dashboard** — overdue/due-today plants, monthly sow/transplant tips, upcoming
  harvests, recent activity, weekly stats.
- **Companion advisor** — antagonist pairs co-located in a garden (warning/conflict).
- **Seasonal calendar** — month-by-month tasks with PL zone 6a frost warnings.
- **Notifications** — in-app, generated for badly overdue watering, deduped per day.

Full API contract: [`docs/API.md`](docs/API.md).

## Development

```bash
# backend (requires Go 1.26+)
cd backend
JWT_SECRET=dev-secret go run ./cmd/server/      # http://localhost:8080

# frontend (requires Node 20+)
cd frontend
npm install
npm run dev                                     # http://localhost:5173, proxies /api

# tests & checks
make vet test
./scripts/smoke.sh http://localhost:8080        # full e2e suite
```

Backend configuration (env): `PORT` (8080), `DB_PATH`, `UPLOAD_PATH`,
`JWT_SECRET` (required), `FRONTEND_DIST` (serve built SPA), `PLANTS_PATH`
(override the embedded library).

## Deployment

`./scripts/deploy.sh` cross-compiles the static linux/amd64 binary
(CGO disabled — pure-Go SQLite), builds the frontend, rsyncs everything to
`ds9:/home/piotrek/srv/rpi-backup/private/plantdiary/` and starts the compose
service. Routing is handled by the host's existing Traefik:

- `http://plantdiary.local/` — via Pi-hole local DNS
- `http://192.168.50.11/` — bare-IP fallback router (priority 1)

The host allows no passwordless sudo and its ports 80/8080 belong to Traefik,
so the originally specced nginx + systemd path is not used; those configs are
kept in [`deploy/`](deploy/) (`nginx.conf`, `plantdiary.service`,
`manual-deploy.sh`) for a future standalone host.

### Implementation notes

- **golang-migrate** could not be used directly: its sqlite driver
  (`modernc.org/sqlite`) and the pure-Go GORM driver (`glebarez/go-sqlite`)
  both register a `database/sql` driver named `sqlite` and panic when imported
  together. `internal/migrate` is a small sequential runner that keeps the
  golang-migrate file naming and `schema_migrations` table shape.
- WebP uploads get JPEG thumbnails (Go has no pure-Go webp encoder).
- The plant library and migrations are embedded — the binary is fully
  self-contained apart from `/data`.
