-- =====================================================================
-- KUROSTREAM: INITIAL MIGRATIONS & SEED DATA
-- =====================================================================

-- 1. Default App Settings
INSERT INTO app_settings (key, value) VALUES
('platform_config', '{
  "appName": "KuroStream",
  "tagline": "Authorized Mobile Anime Streaming",
  "theme": "dark_cinematic",
  "defaultQuality": "1080p",
  "heroAutoplay": true,
  "heroDurationMs": 6000,
  "maxHeroBanners": 5,
  "recommendationsCount": 9,
  "maintenanceMode": false,
  "copyrightEmail": "compliance@kurostream.app",
  "supportUrl": "https://t.me/KuroStreamSupport",
  "antiPiracyEnforced": true
}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 2. Initial Categories
INSERT INTO categories (id, name, icon, description, display_order, is_enabled) VALUES
('all', 'All', 'Sparkles', 'Everything in the catalog', 0, true),
('anime', 'Anime Series', 'Tv', 'Serialized animated seasons & episodes', 1, true),
('movies', 'Movies', 'Film', 'Feature-length animated motion pictures', 2, true),
('action', 'Action', 'Flame', 'High-octane battles and martial prowess', 3, true),
('fantasy', 'Fantasy', 'Wand2', 'Mythical realms, magic and sorcery', 4, true),
('scifi', 'Sci-Fi', 'Cpu', 'Cyberpunk, space exploration and futuristic dystopias', 5, true)
ON CONFLICT (id) DO NOTHING;

-- 3. Initial Genres
INSERT INTO genres (id, name, slug, display_order) VALUES
('action', 'Action', 'action', 1),
('fantasy', 'Fantasy', 'fantasy', 2),
('scifi', 'Sci-Fi', 'sci-fi', 3),
('supernatural', 'Supernatural', 'supernatural', 4),
('adventure', 'Adventure', 'adventure', 5),
('mystery', 'Mystery', 'mystery', 6),
('cyberpunk', 'Cyberpunk', 'cyberpunk', 7)
ON CONFLICT (id) DO NOTHING;

-- 4. Initial Default Admin Account
-- Password hash for 'kuroAdmin2026!'
INSERT INTO admins (id, username, password_hash, email, role, is_active) VALUES
('a0000000-0000-0000-0000-000000000001', 'admin', '$2b$10$tZz53lG5a123456789012u8H69.kI441e8Q0147vQhYyV0pW5r.zG', 'admin@kurostream.app', 'superadmin', true)
ON CONFLICT (username) DO NOTHING;
