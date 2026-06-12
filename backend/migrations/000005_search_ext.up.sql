-- Extended searchable text: the rich bilingual enrichment content (description,
-- care guide, fertilizing, tips, ...) lowercased, so full-text search covers
-- everything we know about a plant — not just its names/tags. Populated by the
-- enrichment overlay; base search_text keeps names/latin/family/tags.
ALTER TABLE library_plants ADD COLUMN search_ext TEXT NOT NULL DEFAULT '';

CREATE INDEX idx_library_search_ext_trgm ON library_plants USING gin (search_ext gin_trgm_ops);
