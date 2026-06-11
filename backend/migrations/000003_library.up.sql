-- The plant library moves out of flat JSON into a queryable table. JSON files
-- become seed input only; this table is the runtime system of record, served
-- by SQL with indexes. Array-valued fields are stored as JSON-encoded TEXT
-- (we never filter on them in SQL — the month/companion lookups run off the
-- hydrated in-memory cache — so a typed JSONB column buys nothing here).
CREATE TABLE library_plants (
    id                       TEXT PRIMARY KEY,
    source                   TEXT NOT NULL DEFAULT 'curated',
    family                   TEXT NOT NULL DEFAULT '',
    common_name_pl           TEXT NOT NULL DEFAULT '',
    common_name_en           TEXT NOT NULL DEFAULT '',
    latin_name               TEXT NOT NULL DEFAULT '',
    category                 TEXT NOT NULL DEFAULT '',
    lifecycle                TEXT NOT NULL DEFAULT '',
    difficulty               TEXT NOT NULL DEFAULT '',
    sun_requirement          TEXT NOT NULL DEFAULT '',
    water_frequency_days     INTEGER NOT NULL DEFAULT 0,
    fertilize_frequency_days INTEGER NOT NULL DEFAULT 0,
    sow_months               TEXT NOT NULL DEFAULT '[]',
    transplant_months        TEXT NOT NULL DEFAULT '[]',
    harvest_months           TEXT NOT NULL DEFAULT '[]',
    frost_sensitive          BOOLEAN NOT NULL DEFAULT false,
    companion_plants         TEXT NOT NULL DEFAULT '[]',
    antagonist_plants        TEXT NOT NULL DEFAULT '[]',
    typical_height_cm        INTEGER NOT NULL DEFAULT 0,
    spacing_cm               INTEGER NOT NULL DEFAULT 0,
    care_notes               TEXT NOT NULL DEFAULT '',
    common_pests             TEXT NOT NULL DEFAULT '[]',
    tags                     TEXT NOT NULL DEFAULT '[]',
    -- Unicode-lowercased "pl en latin family tags", populated by the seeder for
    -- diacritic-correct case-insensitive substring search.
    search_text              TEXT NOT NULL DEFAULT '',
    -- Lowercased display name; listings sort curated-first then by this.
    sort_key                 TEXT NOT NULL DEFAULT ''
);

CREATE INDEX idx_library_category ON library_plants (category);
CREATE INDEX idx_library_lifecycle ON library_plants (lifecycle);
CREATE INDEX idx_library_source_sort ON library_plants (source, sort_key);

-- Trigram index makes the substring LIKE search on search_text index-assisted.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_library_search_trgm ON library_plants USING gin (search_text gin_trgm_ops);

-- Key/value table for seed bookkeeping (library content version, etc.).
CREATE TABLE app_meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
