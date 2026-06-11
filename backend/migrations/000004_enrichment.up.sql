-- Rich "single source of truth" enrichment for the plant library: bilingual
-- (PL/EN) long-form care guidance, an open-source image, and a relational table
-- of diseases/pests/disorders with symptoms → treatment → prevention.

ALTER TABLE library_plants
    ADD COLUMN description_pl     TEXT NOT NULL DEFAULT '',
    ADD COLUMN description_en     TEXT NOT NULL DEFAULT '',
    ADD COLUMN watering_detail_pl TEXT NOT NULL DEFAULT '',
    ADD COLUMN watering_detail_en TEXT NOT NULL DEFAULT '',
    ADD COLUMN fertilizing_pl     TEXT NOT NULL DEFAULT '',
    ADD COLUMN fertilizing_en     TEXT NOT NULL DEFAULT '',
    ADD COLUMN light_pl           TEXT NOT NULL DEFAULT '',
    ADD COLUMN light_en           TEXT NOT NULL DEFAULT '',
    ADD COLUMN soil_pl            TEXT NOT NULL DEFAULT '',
    ADD COLUMN soil_en            TEXT NOT NULL DEFAULT '',
    ADD COLUMN pruning_pl         TEXT NOT NULL DEFAULT '',
    ADD COLUMN pruning_en         TEXT NOT NULL DEFAULT '',
    ADD COLUMN propagation_pl     TEXT NOT NULL DEFAULT '',
    ADD COLUMN propagation_en     TEXT NOT NULL DEFAULT '',
    ADD COLUMN harvest_detail_pl  TEXT NOT NULL DEFAULT '',
    ADD COLUMN harvest_detail_en  TEXT NOT NULL DEFAULT '',
    ADD COLUMN overwintering_pl   TEXT NOT NULL DEFAULT '',
    ADD COLUMN overwintering_en   TEXT NOT NULL DEFAULT '',
    ADD COLUMN toxicity_pl        TEXT NOT NULL DEFAULT '',
    ADD COLUMN toxicity_en        TEXT NOT NULL DEFAULT '',
    ADD COLUMN hardiness_zone     TEXT NOT NULL DEFAULT '',
    ADD COLUMN tips_pl            TEXT NOT NULL DEFAULT '[]',
    ADD COLUMN tips_en            TEXT NOT NULL DEFAULT '[]',
    ADD COLUMN image_url          TEXT NOT NULL DEFAULT '',
    ADD COLUMN image_thumb_url    TEXT NOT NULL DEFAULT '',
    ADD COLUMN image_source_url   TEXT NOT NULL DEFAULT '',
    ADD COLUMN image_license      TEXT NOT NULL DEFAULT '',
    ADD COLUMN image_attribution  TEXT NOT NULL DEFAULT '',
    ADD COLUMN enriched           BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_library_enriched ON library_plants (enriched);

CREATE TABLE plant_diseases (
    id           BIGSERIAL PRIMARY KEY,
    plant_id     TEXT NOT NULL REFERENCES library_plants(id) ON DELETE CASCADE,
    kind         TEXT NOT NULL DEFAULT 'disease', -- disease | pest | disorder | behavior
    name_pl      TEXT NOT NULL DEFAULT '',
    name_en      TEXT NOT NULL DEFAULT '',
    symptoms_pl  TEXT NOT NULL DEFAULT '',
    symptoms_en  TEXT NOT NULL DEFAULT '',
    treatment_pl TEXT NOT NULL DEFAULT '',
    treatment_en TEXT NOT NULL DEFAULT '',
    prevention_pl TEXT NOT NULL DEFAULT '',
    prevention_en TEXT NOT NULL DEFAULT '',
    sort_order   INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_plant_diseases_plant ON plant_diseases (plant_id);
