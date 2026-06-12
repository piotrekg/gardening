DROP INDEX IF EXISTS idx_library_search_ext_trgm;
ALTER TABLE library_plants DROP COLUMN IF EXISTS search_ext;
