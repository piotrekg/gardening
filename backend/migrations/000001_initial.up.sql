CREATE TABLE users (
    id            TEXT PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name          TEXT NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE refresh_tokens (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

CREATE TABLE gardens (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    description   TEXT NOT NULL DEFAULT '',
    location_type TEXT NOT NULL DEFAULT 'outdoor',
    area_sqm      DOUBLE PRECISION,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at    TIMESTAMP
);
CREATE INDEX idx_gardens_user ON gardens(user_id);
CREATE INDEX idx_gardens_deleted ON gardens(deleted_at);

CREATE TABLE plant_instances (
    id                TEXT PRIMARY KEY,
    garden_id         TEXT NOT NULL REFERENCES gardens(id) ON DELETE CASCADE,
    user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plant_library_id  TEXT,
    custom_name       TEXT,
    planted_date      TIMESTAMP,
    quantity          INTEGER NOT NULL DEFAULT 1,
    location_notes    TEXT NOT NULL DEFAULT '',
    status            TEXT NOT NULL DEFAULT 'active',
    last_watered_at   TIMESTAMP,
    last_fertilized_at TIMESTAMP,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at        TIMESTAMP
);
CREATE INDEX idx_plant_instances_garden ON plant_instances(garden_id);
CREATE INDEX idx_plant_instances_user ON plant_instances(user_id);
CREATE INDEX idx_plant_instances_deleted ON plant_instances(deleted_at);

CREATE TABLE care_log (
    id                 TEXT PRIMARY KEY,
    plant_instance_id  TEXT NOT NULL REFERENCES plant_instances(id) ON DELETE CASCADE,
    user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action             TEXT NOT NULL,
    note               TEXT NOT NULL DEFAULT '',
    quantity_harvested DOUBLE PRECISION,
    timestamp          TIMESTAMP NOT NULL,
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_care_log_plant ON care_log(plant_instance_id);
CREATE INDEX idx_care_log_user_ts ON care_log(user_id, timestamp);

CREATE TABLE photos (
    id                TEXT PRIMARY KEY,
    plant_instance_id TEXT NOT NULL REFERENCES plant_instances(id) ON DELETE CASCADE,
    user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename          TEXT NOT NULL,
    thumb_filename    TEXT NOT NULL,
    file_size         INTEGER NOT NULL,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_photos_plant ON photos(plant_instance_id);

CREATE TABLE notifications (
    id                TEXT PRIMARY KEY,
    user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plant_instance_id TEXT REFERENCES plant_instances(id) ON DELETE CASCADE,
    type              TEXT NOT NULL,
    message           TEXT NOT NULL,
    read_at           TIMESTAMP,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read_at);
