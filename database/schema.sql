-- =====================================================================
-- KUROSTREAM: TELEGRAM ANIME STREAMING MINI APP - DATABASE SCHEMA
-- Target Database: PostgreSQL 14+ / Supabase / Neon / Cloud SQL
-- Content Policy: Strictly Authorized Distribution Rights
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ---------------------------------------------------------------------
-- 1. USERS & SESSIONS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id BIGINT UNIQUE NOT NULL,
    first_name VARCHAR(128) NOT NULL,
    last_name VARCHAR(128),
    username VARCHAR(128),
    language_code VARCHAR(16) DEFAULT 'en',
    photo_url TEXT,
    is_suspended BOOLEAN DEFAULT FALSE,
    suspension_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_last_active ON users(last_active_at);

-- ---------------------------------------------------------------------
-- 2. ADMINS & SESSIONS & AUDIT LOGS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(64) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role VARCHAR(32) DEFAULT 'admin' CHECK (role IN ('superadmin', 'admin', 'moderator')),
    telegram_id BIGINT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS admin_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_sessions_token ON admin_sessions(session_token);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
    admin_username VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(128),
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_created_at ON admin_audit_logs(created_at DESC);

-- ---------------------------------------------------------------------
-- 3. CATEGORIES & GENRES
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    icon VARCHAR(64),
    description TEXT,
    display_order INT DEFAULT 0,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS genres (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    slug VARCHAR(64) UNIQUE NOT NULL,
    display_order INT DEFAULT 0
);

-- ---------------------------------------------------------------------
-- 4. ANIME SERIES
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS anime (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    alt_title VARCHAR(255),
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    poster_url TEXT NOT NULL,
    backdrop_url TEXT NOT NULL,
    trailer_url TEXT,
    release_year INT NOT NULL,
    rating NUMERIC(3, 1) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 10.0),
    classification VARCHAR(16) NOT NULL DEFAULT 'TV-14' CHECK (classification IN ('G', 'PG', 'PG-13', 'TV-14', 'TV-MA')),
    status VARCHAR(32) NOT NULL DEFAULT 'Ongoing' CHECK (status IN ('Ongoing', 'Completed', 'Coming Soon')),
    language VARCHAR(64) DEFAULT 'Japanese',
    available_audio TEXT[] DEFAULT ARRAY['Japanese'],
    available_subtitles TEXT[] DEFAULT ARRAY['English'],
    
    -- Content Policy & License Confirmation
    distribution_rights_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    distribution_license_notes TEXT,
    rights_confirmed_by VARCHAR(64),
    rights_confirmed_at TIMESTAMP WITH TIME ZONE,
    
    is_published BOOLEAN DEFAULT FALSE,
    view_count BIGINT DEFAULT 0,
    created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_anime_published ON anime(is_published);
CREATE INDEX idx_anime_rating ON anime(rating DESC);
CREATE INDEX idx_anime_title_trgm ON anime USING gin(title gin_trgm_ops);

-- ---------------------------------------------------------------------
-- 5. MOVIES
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS movies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    alt_title VARCHAR(255),
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    poster_url TEXT NOT NULL,
    backdrop_url TEXT NOT NULL,
    release_year INT NOT NULL,
    runtime_minutes INT NOT NULL,
    rating NUMERIC(3, 1) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 10.0),
    classification VARCHAR(16) NOT NULL DEFAULT 'PG-13' CHECK (classification IN ('G', 'PG', 'PG-13', 'TV-14', 'TV-MA')),
    status VARCHAR(32) NOT NULL DEFAULT 'Completed' CHECK (status IN ('Completed', 'Coming Soon')),
    language VARCHAR(64) DEFAULT 'Japanese',
    available_audio TEXT[] DEFAULT ARRAY['Japanese'],
    available_subtitles TEXT[] DEFAULT ARRAY['English'],
    
    -- Content Policy & License Confirmation
    distribution_rights_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    distribution_license_notes TEXT,
    rights_confirmed_by VARCHAR(64),
    rights_confirmed_at TIMESTAMP WITH TIME ZONE,
    
    is_published BOOLEAN DEFAULT FALSE,
    view_count BIGINT DEFAULT 0,
    created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_movies_published ON movies(is_published);
CREATE INDEX idx_movies_rating ON movies(rating DESC);
CREATE INDEX idx_movies_title_trgm ON movies USING gin(title gin_trgm_ops);

-- ---------------------------------------------------------------------
-- 6. CONTENT TAXONOMY MAPPINGS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_genres (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_type VARCHAR(16) NOT NULL CHECK (content_type IN ('anime', 'movie')),
    content_id UUID NOT NULL,
    genre_id VARCHAR(64) NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
    UNIQUE (content_type, content_id, genre_id)
);

CREATE TABLE IF NOT EXISTS content_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_type VARCHAR(16) NOT NULL CHECK (content_type IN ('anime', 'movie')),
    content_id UUID NOT NULL,
    category_id VARCHAR(64) NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    UNIQUE (content_type, content_id, category_id)
);

-- ---------------------------------------------------------------------
-- 7. SEASONS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS seasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    anime_id UUID NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    season_number INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(anime_id, season_number)
);

CREATE INDEX idx_seasons_anime ON seasons(anime_id);

-- ---------------------------------------------------------------------
-- 8. EPISODES
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS episodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    anime_id UUID NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    episode_number INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail_url TEXT NOT NULL,
    duration_seconds INT NOT NULL DEFAULT 1440,
    release_date DATE,
    
    -- Content Policy & Rights Confirmation
    distribution_rights_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    rights_confirmed_by VARCHAR(64),
    rights_confirmed_at TIMESTAMP WITH TIME ZONE,
    
    is_published BOOLEAN DEFAULT TRUE,
    view_count BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(season_id, episode_number)
);

CREATE INDEX idx_episodes_season ON episodes(season_id);
CREATE INDEX idx_episodes_anime ON episodes(anime_id);

-- ---------------------------------------------------------------------
-- 9. VIDEO ASSETS & STREAMING METADATA
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS video_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_type VARCHAR(16) NOT NULL CHECK (parent_type IN ('episode', 'movie')),
    parent_id UUID NOT NULL,
    quality VARCHAR(16) NOT NULL CHECK (quality IN ('144p', '240p', '360p', '480p', '720p', '1080p', '2K', '4K', '8K')),
    storage_key TEXT NOT NULL,
    hls_manifest_url TEXT,
    duration_seconds INT NOT NULL,
    file_size_bytes BIGINT,
    codec VARCHAR(32) DEFAULT 'h264',
    bitrate_kbps INT,
    width INT,
    height INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(parent_type, parent_id, quality)
);

CREATE INDEX idx_video_assets_parent ON video_assets(parent_type, parent_id);

CREATE TABLE IF NOT EXISTS subtitle_tracks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_type VARCHAR(16) NOT NULL CHECK (parent_type IN ('episode', 'movie')),
    parent_id UUID NOT NULL,
    language_code VARCHAR(16) NOT NULL,
    label VARCHAR(64) NOT NULL,
    storage_key TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS audio_tracks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_type VARCHAR(16) NOT NULL CHECK (parent_type IN ('episode', 'movie')),
    parent_id UUID NOT NULL,
    language_code VARCHAR(16) NOT NULL,
    label VARCHAR(64) NOT NULL,
    codec VARCHAR(32) DEFAULT 'aac',
    is_default BOOLEAN DEFAULT FALSE
);

-- ---------------------------------------------------------------------
-- 10. HERO BANNERS & HOMEPAGE SECTIONS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hero_banners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    image_url TEXT NOT NULL,
    linked_type VARCHAR(16) NOT NULL CHECK (linked_type IN ('anime', 'movie', 'category')),
    linked_id VARCHAR(128) NOT NULL,
    button_text VARCHAR(64) DEFAULT 'Watch Now',
    display_order INT DEFAULT 0,
    is_enabled BOOLEAN DEFAULT TRUE,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS homepage_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(128) NOT NULL,
    subtitle VARCHAR(255),
    section_type VARCHAR(64) NOT NULL, -- 'new_episodes', 'trending', 'popular_movies', 'genre_curated'
    content_source VARCHAR(64) NOT NULL, -- 'automatic_recent', 'automatic_views', 'manual'
    genre_id VARCHAR(64) REFERENCES genres(id) ON DELETE SET NULL,
    max_items INT DEFAULT 10,
    display_order INT DEFAULT 0,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS homepage_section_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID NOT NULL REFERENCES homepage_sections(id) ON DELETE CASCADE,
    content_type VARCHAR(16) NOT NULL CHECK (content_type IN ('anime', 'movie')),
    content_id UUID NOT NULL,
    display_order INT DEFAULT 0,
    UNIQUE(section_id, content_type, content_id)
);

-- ---------------------------------------------------------------------
-- 11. USER INTERACTIONS: SAVED, WATCH HISTORY, WATCH PROGRESS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS saved_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_type VARCHAR(16) NOT NULL CHECK (content_type IN ('anime', 'movie')),
    content_id UUID NOT NULL,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, content_type, content_id)
);

CREATE INDEX idx_saved_items_user ON saved_items(user_id);

CREATE TABLE IF NOT EXISTS watch_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_type VARCHAR(16) NOT NULL CHECK (content_type IN ('anime', 'movie')),
    content_id UUID NOT NULL,
    season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
    episode_id UUID REFERENCES episodes(id) ON DELETE CASCADE,
    position_seconds INT NOT NULL DEFAULT 0,
    duration_seconds INT NOT NULL DEFAULT 1,
    completion_percentage NUMERIC(5,2) DEFAULT 0.0,
    is_completed BOOLEAN DEFAULT FALSE,
    last_watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, content_type, content_id, episode_id)
);

CREATE INDEX idx_watch_progress_user ON watch_progress(user_id, last_watched_at DESC);

-- ---------------------------------------------------------------------
-- 12. COMPLIANCE, COPYRIGHT & MODERATION
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS copyright_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claimant_name VARCHAR(128) NOT NULL,
    claimant_email VARCHAR(255) NOT NULL,
    organization VARCHAR(128),
    content_type VARCHAR(16) NOT NULL,
    content_id UUID NOT NULL,
    alleged_work_description TEXT NOT NULL,
    infringement_details TEXT NOT NULL,
    proof_documents_url TEXT,
    status VARCHAR(32) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'content_taken_down', 'rejected')),
    resolution_notes TEXT,
    reviewed_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    content_type VARCHAR(16) NOT NULL,
    content_id UUID NOT NULL,
    reason VARCHAR(64) NOT NULL,
    details TEXT,
    status VARCHAR(32) DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS app_settings (
    key VARCHAR(64) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 13. COMMENTS & CONTENT REACTIONS (LIKES / DISLIKES)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id BIGINT NOT NULL,
    target_type VARCHAR(16) NOT NULL CHECK (target_type IN ('anime', 'movie', 'episode')),
    target_id VARCHAR(128) NOT NULL,
    reaction_type VARCHAR(16) NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, target_type, target_id)
);

CREATE INDEX idx_content_reactions_target ON content_reactions(target_type, target_id);

CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_type VARCHAR(16) NOT NULL CHECK (target_type IN ('anime', 'movie', 'episode')),
    target_id VARCHAR(128) NOT NULL,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL,
    username VARCHAR(128) NOT NULL,
    user_avatar TEXT,
    badge VARCHAR(64) DEFAULT 'Viewer',
    text TEXT NOT NULL,
    likes_count INT DEFAULT 0,
    liked_by_users JSONB DEFAULT '[]'::jsonb,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_comments_target ON comments(target_type, target_id, created_at DESC);
