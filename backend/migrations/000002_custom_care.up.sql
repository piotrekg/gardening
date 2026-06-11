-- Per-instance care frequency overrides. When set, they take precedence over the
-- plant library values in care-status computation, so catalog/custom plants
-- (which have no library schedule) can still show overdue/due/ok.
ALTER TABLE plant_instances ADD COLUMN custom_water_frequency_days INTEGER;
ALTER TABLE plant_instances ADD COLUMN custom_fertilize_frequency_days INTEGER;
