-- Cinely Core Database Schema

CREATE TABLE IF NOT EXISTS media_items (
    id TEXT PRIMARY KEY,
    media_kind TEXT NOT NULL,
    original_title TEXT NOT NULL,
    default_title TEXT NOT NULL,
    overview TEXT,
    tagline TEXT,
    release_date TEXT,
    release_year INTEGER,
    runtime_minutes INTEGER,
    certification TEXT,
    poster_url TEXT,
    backdrop_url TEXT,
    trailer_url TEXT,
    rating REAL,
    popularity_score REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS media_external_mappings (
    id TEXT PRIMARY KEY,
    media_item_id TEXT NOT NULL,
    provider_name TEXT NOT NULL,
    external_id TEXT NOT NULL,
    raw_payload TEXT,
    last_synced_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(provider_name, external_id),
    FOREIGN KEY(media_item_id) REFERENCES media_items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS media_genres (
    media_item_id TEXT NOT NULL,
    genre TEXT NOT NULL,
    PRIMARY KEY(media_item_id, genre),
    FOREIGN KEY(media_item_id) REFERENCES media_items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS media_credits (
    id TEXT PRIMARY KEY,
    media_item_id TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL, -- 'director', 'writer', 'cast'
    character_name TEXT,
    profile_url TEXT,
    order_index INTEGER DEFAULT 0,
    FOREIGN KEY(media_item_id) REFERENCES media_items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS seasons (
    id TEXT PRIMARY KEY,
    series_id TEXT NOT NULL,
    season_number INTEGER NOT NULL,
    title TEXT,
    overview TEXT,
    poster_url TEXT,
    air_date TEXT,
    episode_count INTEGER NOT NULL DEFAULT 0,
    UNIQUE(series_id, season_number),
    FOREIGN KEY(series_id) REFERENCES media_items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS episodes (
    id TEXT PRIMARY KEY,
    season_id TEXT NOT NULL,
    series_id TEXT NOT NULL,
    episode_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    overview TEXT,
    still_url TEXT,
    air_date TEXT,
    runtime_minutes INTEGER,
    UNIQUE(season_id, episode_number),
    FOREIGN KEY(season_id) REFERENCES seasons(id) ON DELETE CASCADE,
    FOREIGN KEY(series_id) REFERENCES media_items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS addon_catalog (
    id TEXT PRIMARY KEY,
    manifest_url TEXT NOT NULL,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    background_url TEXT,
    types TEXT NOT NULL, -- JSON array
    resources TEXT NOT NULL, -- JSON array
    catalogs TEXT, -- JSON array
    id_prefixes TEXT, -- JSON array
    categories TEXT NOT NULL, -- JSON array of 16 authentic categories
    stars INTEGER NOT NULL DEFAULT 0,
    is_configurable INTEGER NOT NULL DEFAULT 0,
    is_default INTEGER NOT NULL DEFAULT 0,
    raw_manifest TEXT NOT NULL,
    synced_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_addon_preferences (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    addon_id TEXT NOT NULL,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    priority_order INTEGER NOT NULL DEFAULT 100,
    key_version TEXT NOT NULL DEFAULT 'v1',
    key_id TEXT NOT NULL DEFAULT 'cinely-master-v1',
    nonce_iv TEXT,
    auth_tag TEXT,
    encrypted_config TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, addon_id),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(addon_id) REFERENCES addon_catalog(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_addon_prefs_user_order
ON user_addon_preferences(user_id, is_enabled, priority_order ASC);

CREATE TABLE IF NOT EXISTS user_progress (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    media_id TEXT NOT NULL,
    season_number INTEGER NOT NULL DEFAULT 0,
    episode_number INTEGER NOT NULL DEFAULT 0,
    position_seconds REAL NOT NULL DEFAULT 0,
    duration_seconds REAL NOT NULL DEFAULT 0,
    completed INTEGER NOT NULL DEFAULT 0,
    client_sequence INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, media_id, season_number, episode_number),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(media_id) REFERENCES media_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_progress_lookup
ON user_progress(user_id, media_id, season_number, episode_number);

CREATE INDEX IF NOT EXISTS idx_user_progress_user_updated
ON user_progress(user_id, updated_at DESC);



CREATE TABLE IF NOT EXISTS user_refresh_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    revoked_at TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_watchlist (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    media_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, media_id),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(media_id) REFERENCES media_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_watchlist_user_created
ON user_watchlist(user_id, created_at DESC);

