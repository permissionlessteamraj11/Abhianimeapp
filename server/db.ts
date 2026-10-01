import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory resolution
const DATA_DIR = path.resolve(__dirname, '../data');
const BACKUPS_DIR = path.resolve(DATA_DIR, 'backups');
const DB_FILE = path.resolve(DATA_DIR, 'stark_anime.db.json');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

export interface DatabaseSchema {
  version: number;
  last_updated_at: string;
  categories: any[];
  genres: any[];
  anime: any[];
  movies: any[];
  hero_banners: any[];
  homepage_sections: any[];
  settings: any;
  users: any[];
  saved_items: any[];
  watch_progress: any[];
  audit_logs: any[];
  copyright_claims: any[];
  reports: any[];
}

const DEFAULT_CATEGORIES = [
  { id: 'all', name: 'All', icon: 'Sparkles', description: 'Everything in the authorized catalog', display_order: 0, is_enabled: true },
  { id: 'anime', name: 'Anime Series', icon: 'Tv', description: 'Serialized animated seasons & episodes', display_order: 1, is_enabled: true },
  { id: 'movies', name: 'Movies', icon: 'Film', description: 'Feature-length animated motion pictures', display_order: 2, is_enabled: true },
  { id: 'action', name: 'Action', icon: 'Flame', description: 'High-octane battles and martial prowess', display_order: 3, is_enabled: true },
  { id: 'fantasy', name: 'Fantasy', icon: 'Wand2', description: 'Mythical realms, magic and sorcery', display_order: 4, is_enabled: true },
  { id: 'scifi', name: 'Sci-Fi', icon: 'Cpu', description: 'Cyberpunk, space exploration and futuristic dystopias', display_order: 5, is_enabled: true }
];

const DEFAULT_GENRES = [
  { id: 'action', name: 'Action', slug: 'action', display_order: 1 },
  { id: 'scifi', name: 'Sci-Fi', slug: 'scifi', display_order: 2 },
  { id: 'fantasy', name: 'Fantasy', slug: 'fantasy', display_order: 3 },
  { id: 'cyberpunk', name: 'Cyberpunk', slug: 'cyberpunk', display_order: 4 },
  { id: 'adventure', name: 'Adventure', slug: 'adventure', display_order: 5 },
  { id: 'mystery', name: 'Mystery', slug: 'mystery', display_order: 6 },
  { id: 'supernatural', name: 'Supernatural', slug: 'supernatural', display_order: 7 }
];

const DEFAULT_SECTIONS = [
  {
    id: 'sec-01',
    title: 'New Episodes',
    subtitle: 'Fresh releases authorized for this week',
    section_type: 'new_episodes',
    content_source: 'automatic_recent',
    max_items: 8,
    display_order: 1,
    is_enabled: true
  },
  {
    id: 'sec-02',
    title: 'Trending Now',
    subtitle: 'Most watched by community viewers',
    section_type: 'trending',
    content_source: 'automatic_views',
    max_items: 8,
    display_order: 2,
    is_enabled: true
  },
  {
    id: 'sec-03',
    title: 'Popular Movies',
    subtitle: 'Feature films with theatrical audio',
    section_type: 'popular_movies',
    content_source: 'manual',
    max_items: 8,
    display_order: 3,
    is_enabled: true
  }
];

const DEFAULT_SETTINGS = {
  appName: 'Stark Anime',
  tagline: 'Authorized Mobile Anime & Movie Streaming',
  theme: 'dark_cinematic',
  defaultQuality: '1080p',
  heroAutoplay: true,
  heroDurationMs: 5000,
  maxHeroBanners: 5,
  recommendationsCount: 9,
  maintenanceMode: false,
  maintenanceNotice: 'Stark Anime is currently performing scheduled infrastructure maintenance. We will be back online shortly.',
  announcementActive: false,
  announcementText: '🔥 New Season Episodes Just Added in 1080p!',
  announcementType: 'info',
  tokenValidityHours: 4,
  streamWatermarkEnabled: true,
  antiRipProtection: true,
  copyrightEmail: 'compliance@starkanime.app',
  supportUrl: 'https://t.me/StarkAnimeSupport',
  antiPiracyEnforced: true
};

const MASTER_SEED_ANIME = [
  {
    id: 'anime_chrono_blade',
    title: 'Chrono Blade: Zero',
    slug: 'chrono-blade-zero',
    description: 'In Neo-Kyoto 2142, cybernetically augmented swordsman Jin unravels a temporal conspiracy threatening reality itself. Armed with a blade that bends seconds, he must duel rogue chronomancers across fractured timelines.',
    poster_url: '/images/poster_chrono_blade.jpg',
    backdrop_url: '/images/hero_cyber_samurai.jpg',
    rating: 9.3,
    release_year: 2026,
    status: 'Ongoing',
    classification: 'PG-13',
    language: 'Japanese',
    available_audio: ['Japanese', 'English', 'Hindi'],
    available_subtitles: ['English', 'Hindi', 'Spanish'],
    distribution_rights_confirmed: true,
    is_published: true,
    view_count: 14200,
    genres: ['Action', 'Sci-Fi', 'Cyberpunk'],
    categories: ['all', 'anime', 'action', 'scifi'],
    seasons: [
      {
        id: 's1_chrono',
        anime_id: 'anime_chrono_blade',
        season_number: 1,
        title: 'Season 1: Temporal Awakening',
        description: 'The beginning of Jin’s quest across fractured time sectors in Neo-Kyoto.',
        is_published: true,
        episodes: [
          {
            id: 'ep1_chrono',
            anime_id: 'anime_chrono_blade',
            season_id: 's1_chrono',
            episode_number: 1,
            title: 'Episode 1: The Zero Hour Blade',
            description: 'Jin activates his temporal chronometer blade during a syndicate ambush in the lower sectors.',
            duration_seconds: 1440,
            thumbnail_url: '/images/hero_cyber_samurai.jpg',
            stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            view_count: 5200,
            is_published: true,
            distribution_rights_confirmed: true
          },
          {
            id: 'ep2_chrono',
            anime_id: 'anime_chrono_blade',
            season_id: 's1_chrono',
            episode_number: 2,
            title: 'Episode 2: Echoes of the Past',
            description: 'A shadowy chronomancer assassin strikes at the high council, leaving reality distortions.',
            duration_seconds: 1500,
            thumbnail_url: '/images/hero_cyber_samurai.jpg',
            stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
            view_count: 4600,
            is_published: true,
            distribution_rights_confirmed: true
          },
          {
            id: 'ep3_chrono',
            anime_id: 'anime_chrono_blade',
            season_id: 's1_chrono',
            episode_number: 3,
            title: 'Episode 3: Fracture Point',
            description: 'Jin infiltrates the subterranean core reactor before the timeline collapses permanently.',
            duration_seconds: 1470,
            thumbnail_url: '/images/hero_cyber_samurai.jpg',
            stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
            view_count: 4400,
            is_published: true,
            distribution_rights_confirmed: true
          }
        ]
      }
    ]
  },
  {
    id: 'anime_mystic_alchemy',
    title: 'Mystic Alchemy Chronicles',
    slug: 'mystic-alchemy-chronicles',
    description: 'Two alchemist prodigies decipher a celestial grimoire to restore balance to a shattered kingdom while facing ancient chimera beasts.',
    poster_url: '/images/hero_celestial_academy.jpg',
    backdrop_url: '/images/hero_celestial_academy.jpg',
    rating: 8.9,
    release_year: 2026,
    status: 'Ongoing',
    classification: 'PG-13',
    language: 'Japanese',
    available_audio: ['Japanese', 'English'],
    available_subtitles: ['English', 'Hindi'],
    distribution_rights_confirmed: true,
    is_published: true,
    view_count: 9800,
    genres: ['Fantasy', 'Adventure', 'Mystery'],
    categories: ['all', 'anime', 'fantasy'],
    seasons: [
      {
        id: 's1_mystic',
        anime_id: 'anime_mystic_alchemy',
        season_number: 1,
        title: 'Season 1: The Celestial Seal',
        description: 'First journey to the ruins of Mount Valen.',
        is_published: true,
        episodes: [
          {
            id: 'ep1_mystic',
            anime_id: 'anime_mystic_alchemy',
            season_id: 's1_mystic',
            episode_number: 1,
            title: 'Episode 1: The Alchemic Seal',
            description: 'A glowing grimoire awakens in the royal library of Valen.',
            duration_seconds: 1440,
            thumbnail_url: '/images/hero_celestial_academy.jpg',
            stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            view_count: 3800,
            is_published: true,
            distribution_rights_confirmed: true
          },
          {
            id: 'ep2_mystic',
            anime_id: 'anime_mystic_alchemy',
            season_id: 's1_mystic',
            episode_number: 2,
            title: 'Episode 2: Chimera in the Mist',
            description: 'The alchemist duo faces rogue elemental beasts at the ancient bridge.',
            duration_seconds: 1440,
            thumbnail_url: '/images/hero_celestial_academy.jpg',
            stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
            view_count: 3200,
            is_published: true,
            distribution_rights_confirmed: true
          }
        ]
      }
    ]
  },
  {
    id: 'anime_stellar_odyssey',
    title: 'Stellar Odyssey 2199',
    slug: 'stellar-odyssey-2199',
    description: 'An intergalactic explorer crew discovers an alien monolith broadcasting coordinates to the forgotten cradle of humanity.',
    poster_url: '/images/hero_space_dystopia.jpg',
    backdrop_url: '/images/hero_space_dystopia.jpg',
    rating: 9.1,
    release_year: 2026,
    status: 'Ongoing',
    classification: 'PG-13',
    language: 'Japanese',
    available_audio: ['Japanese', 'English'],
    available_subtitles: ['English'],
    distribution_rights_confirmed: true,
    is_published: true,
    view_count: 8500,
    genres: ['Sci-Fi', 'Space', 'Adventure'],
    categories: ['all', 'anime', 'scifi'],
    seasons: [
      {
        id: 's1_stellar',
        anime_id: 'anime_stellar_odyssey',
        season_number: 1,
        title: 'Season 1: Deep Nebula',
        description: 'Venture beyond known jump gates.',
        is_published: true,
        episodes: [
          {
            id: 'ep1_stellar',
            anime_id: 'anime_stellar_odyssey',
            season_id: 's1_stellar',
            episode_number: 1,
            title: 'Episode 1: The Warp Gate',
            description: 'The ship Orion jumps into the uncharted Perseus arm.',
            duration_seconds: 1520,
            thumbnail_url: '/images/hero_space_dystopia.jpg',
            stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            view_count: 4100,
            is_published: true,
            distribution_rights_confirmed: true
          }
        ]
      }
    ]
  }
];

const MASTER_SEED_MOVIES = [
  {
    id: 'mov_ghost_protocol',
    title: 'Ghost Protocol: Neo Tokyo',
    slug: 'ghost-protocol-neo-tokyo',
    description: 'A theatrical animated masterpiece following an elite tactical unit hunting down an AI entity that has weaponized cybernetic citizens.',
    poster_url: '/images/poster_chrono_blade.jpg',
    backdrop_url: '/images/hero_cyber_samurai.jpg',
    runtime_minutes: 118,
    rating: 9.4,
    release_year: 2026,
    classification: 'PG-13',
    language: 'Japanese',
    available_audio: ['Japanese', 'English', 'Hindi'],
    available_subtitles: ['English', 'Hindi'],
    distribution_rights_confirmed: true,
    is_published: true,
    view_count: 18400,
    genres: ['Action', 'Sci-Fi', 'Cyberpunk'],
    categories: ['all', 'movies', 'action', 'scifi'],
    stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'
  },
  {
    id: 'mov_spirited_realms',
    title: 'Spirited Realms: The Sacred Gate',
    slug: 'spirited-realms-the-sacred-gate',
    description: 'When an ancient torii gate unlocks between modern Tokyo and the spirit dimension, a gifted shrine maiden must seal it before chaos spreads.',
    poster_url: '/images/hero_celestial_academy.jpg',
    backdrop_url: '/images/hero_celestial_academy.jpg',
    runtime_minutes: 104,
    rating: 9.0,
    release_year: 2026,
    classification: 'PG-13',
    language: 'Japanese',
    available_audio: ['Japanese', 'English'],
    available_subtitles: ['English', 'Spanish'],
    distribution_rights_confirmed: true,
    is_published: true,
    view_count: 12100,
    genres: ['Fantasy', 'Supernatural'],
    categories: ['all', 'movies', 'fantasy'],
    stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'
  }
];

const MASTER_SEED_BANNERS = [
  {
    id: 'banner-01',
    title: 'Chrono Blade: Zero',
    subtitle: 'Exclusive Premiere • 4K HDR',
    badge_text: 'NOW STREAMING',
    image_url: '/images/hero_cyber_samurai.jpg',
    mobile_image_url: '/images/hero_cyber_samurai.jpg',
    linked_type: 'anime',
    linked_id: 'anime_chrono_blade',
    display_order: 1,
    is_enabled: true
  },
  {
    id: 'banner-02',
    title: 'Ghost Protocol: Neo Tokyo',
    subtitle: 'Theatrical Release in Dolby Audio',
    badge_text: 'MOVIE SPOTLIGHT',
    image_url: '/images/poster_chrono_blade.jpg',
    mobile_image_url: '/images/poster_chrono_blade.jpg',
    linked_type: 'movie',
    linked_id: 'mov_ghost_protocol',
    display_order: 2,
    is_enabled: true
  }
];

class DatabaseEngine {
  private db: DatabaseSchema;
  private subscribers: Set<(event: { type: string; version: number; payload?: any }) => void> = new Set();
  private isSaving: boolean = false;
  private pendingSave: boolean = false;

  constructor() {
    this.db = this.loadOrInitialize();
  }

  private loadOrInitialize(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.version === 'number') {
          // Verify critical arrays
          parsed.anime = Array.isArray(parsed.anime) ? parsed.anime : [];
          parsed.movies = Array.isArray(parsed.movies) ? parsed.movies : [];
          parsed.hero_banners = Array.isArray(parsed.hero_banners) ? parsed.hero_banners : [];
          parsed.homepage_sections = Array.isArray(parsed.homepage_sections) && parsed.homepage_sections.length > 0 ? parsed.homepage_sections : DEFAULT_SECTIONS;
          parsed.categories = Array.isArray(parsed.categories) && parsed.categories.length > 0 ? parsed.categories : DEFAULT_CATEGORIES;
          parsed.genres = Array.isArray(parsed.genres) && parsed.genres.length > 0 ? parsed.genres : DEFAULT_GENRES;
          parsed.settings = parsed.settings || DEFAULT_SETTINGS;
          parsed.users = Array.isArray(parsed.users) ? parsed.users : [];
          parsed.saved_items = Array.isArray(parsed.saved_items) ? parsed.saved_items : [];
          parsed.watch_progress = Array.isArray(parsed.watch_progress) ? parsed.watch_progress : [];
          parsed.audit_logs = Array.isArray(parsed.audit_logs) ? parsed.audit_logs : [];
          parsed.copyright_claims = Array.isArray(parsed.copyright_claims) ? parsed.copyright_claims : [];
          parsed.reports = Array.isArray(parsed.reports) ? parsed.reports : [];

          // If catalog is completely empty, auto-seed master titles so users always have rich streaming content!
          if (parsed.anime.length === 0 && parsed.movies.length === 0) {
            parsed.anime = JSON.parse(JSON.stringify(MASTER_SEED_ANIME));
            parsed.movies = JSON.parse(JSON.stringify(MASTER_SEED_MOVIES));
            parsed.hero_banners = JSON.parse(JSON.stringify(MASTER_SEED_BANNERS));
            parsed.version += 1;
            parsed.last_updated_at = new Date().toISOString();
            this.persistSync(parsed);
          }

          console.log(`[DatabaseEngine] Loaded database v${parsed.version} (${parsed.anime.length} anime, ${parsed.movies.length} movies)`);
          return parsed;
        }
      }
    } catch (err) {
      console.error('[DatabaseEngine] Error reading database file, creating fresh master DB:', err);
    }

    const fresh: DatabaseSchema = {
      version: 1,
      last_updated_at: new Date().toISOString(),
      categories: DEFAULT_CATEGORIES,
      genres: DEFAULT_GENRES,
      anime: JSON.parse(JSON.stringify(MASTER_SEED_ANIME)),
      movies: JSON.parse(JSON.stringify(MASTER_SEED_MOVIES)),
      hero_banners: JSON.parse(JSON.stringify(MASTER_SEED_BANNERS)),
      homepage_sections: DEFAULT_SECTIONS,
      settings: DEFAULT_SETTINGS,
      users: [
        {
          id: 'usr-849204812',
          telegram_id: 849204812,
          first_name: 'Ren',
          last_name: 'Kurogane',
          username: 'ren_kuro',
          language_code: 'en',
          is_suspended: false,
          created_at: new Date().toISOString(),
          last_active_at: new Date().toISOString()
        }
      ],
      saved_items: [],
      watch_progress: [],
      audit_logs: [],
      copyright_claims: [],
      reports: []
    };

    this.persistSync(fresh);
    console.log('[DatabaseEngine] Initialized brand new persistent database with master seed catalog.');
    return fresh;
  }

  private persistSync(data: DatabaseSchema): void {
    const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
    const serialized = JSON.stringify(data, null, 2);
    fs.writeFileSync(tmpFile, serialized, 'utf-8');
    fs.renameSync(tmpFile, DB_FILE);
  }

  private queueSave(eventType: string, payload?: any): void {
    this.db.version += 1;
    this.db.last_updated_at = new Date().toISOString();

    // Notify in-process listeners (SSE, etc.)
    const event = { type: eventType, version: this.db.version, payload };
    this.subscribers.forEach((sub) => {
      try {
        sub(event);
      } catch (err) {
        console.error('[DatabaseEngine] Subscriber error:', err);
      }
    });

    if (this.isSaving) {
      this.pendingSave = true;
      return;
    }

    this.isSaving = true;
    setImmediate(() => {
      try {
        this.persistSync(this.db);
      } catch (err) {
        console.error('[DatabaseEngine] Write error:', err);
      } finally {
        this.isSaving = false;
        if (this.pendingSave) {
          this.pendingSave = false;
          this.queueSave('COALESCED_UPDATE');
        }
      }
    });
  }

  // Live Subscription for Server-Sent Events / Realtime Sync
  public subscribe(listener: (event: { type: string; version: number; payload?: any }) => void): () => void {
    this.subscribers.add(listener);
    return () => {
      this.subscribers.delete(listener);
    };
  }

  public getVersion(): number {
    return this.db.version;
  }

  public getLastUpdated(): string {
    return this.db.last_updated_at;
  }

  public getStats() {
    let totalSeasons = 0;
    let totalEpisodes = 0;
    this.db.anime.forEach((a) => {
      totalSeasons += a.seasons?.length || 0;
      a.seasons?.forEach((s: any) => {
        totalEpisodes += s.episodes?.length || 0;
      });
    });

    let fileSize = 0;
    try {
      if (fs.existsSync(DB_FILE)) {
        fileSize = fs.statSync(DB_FILE).size;
      }
    } catch {}

    return {
      connected: true,
      dbPath: DB_FILE,
      fileSizeBytes: fileSize,
      fileSizeKb: (fileSize / 1024).toFixed(2),
      version: this.db.version,
      lastUpdated: this.db.last_updated_at,
      totalAnime: this.db.anime.length,
      totalMovies: this.db.movies.length,
      totalSeasons,
      totalEpisodes,
      totalHeroBanners: this.db.hero_banners.length,
      totalSections: this.db.homepage_sections.length,
      totalCategories: this.db.categories.length,
      totalUsers: this.db.users.length,
      totalAuditLogs: this.db.audit_logs.length,
      activeSubscribers: this.subscribers.size
    };
  }

  // --- ANIME CRUD ---
  public getAllAnime(): any[] {
    return this.db.anime;
  }

  public getAnimeById(id: string): any | undefined {
    return this.db.anime.find((a) => a.id === id);
  }

  public saveAnime(animeData: any): any {
    const id = animeData.id || `anime-${Date.now()}`;
    const slug = (animeData.title || id).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const existingIdx = this.db.anime.findIndex((a) => a.id === id);

    const record = {
      ...animeData,
      id,
      slug: animeData.slug || slug,
      title: animeData.title || 'Untitled Anime',
      description: animeData.description || '',
      poster_url: animeData.poster_url || '/images/poster_chrono_blade.jpg',
      backdrop_url: animeData.backdrop_url || '/images/hero_cyber_samurai.jpg',
      rating: Number(animeData.rating) || 8.5,
      release_year: Number(animeData.release_year) || new Date().getFullYear(),
      status: animeData.status || 'Ongoing',
      classification: animeData.classification || 'PG-13',
      language: animeData.language || 'Japanese',
      available_audio: animeData.available_audio || ['Japanese', 'English'],
      available_subtitles: animeData.available_subtitles || ['English', 'Hindi'],
      distribution_rights_confirmed: true,
      is_published: animeData.is_published !== false,
      view_count: animeData.view_count || 0,
      genres: animeData.genres || ['Action'],
      categories: animeData.categories || ['all', 'anime'],
      seasons: Array.isArray(animeData.seasons) ? animeData.seasons : [],
      updated_at: new Date().toISOString()
    };

    if (existingIdx >= 0) {
      this.db.anime[existingIdx] = { ...this.db.anime[existingIdx], ...record };
    } else {
      record.created_at = new Date().toISOString();
      this.db.anime.unshift(record);
    }

    this.queueSave('ANIME_SAVED', { id });
    return record;
  }

  public deleteAnime(id: string): boolean {
    const idx = this.db.anime.findIndex((a) => a.id === id);
    if (idx >= 0) {
      this.db.anime.splice(idx, 1);
      this.queueSave('ANIME_DELETED', { id });
      return true;
    }
    return false;
  }

  // --- SEASONS & EPISODES ---
  public saveSeason(animeId: string, seasonData: any): any {
    const anime = this.getAnimeById(animeId);
    if (!anime) throw new Error('Anime series not found');

    if (!anime.seasons) anime.seasons = [];
    const seasonId = seasonData.id || `s-${Date.now()}`;
    const idx = anime.seasons.findIndex((s: any) => s.id === seasonId);

    const sRecord = {
      ...seasonData,
      id: seasonId,
      anime_id: animeId,
      season_number: Number(seasonData.season_number) || anime.seasons.length + 1,
      title: seasonData.title || `Season ${seasonData.season_number || anime.seasons.length + 1}`,
      description: seasonData.description || '',
      is_published: seasonData.is_published !== false,
      episodes: Array.isArray(seasonData.episodes) ? seasonData.episodes : (idx >= 0 ? anime.seasons[idx].episodes || [] : [])
    };

    if (idx >= 0) {
      anime.seasons[idx] = { ...anime.seasons[idx], ...sRecord };
    } else {
      anime.seasons.push(sRecord);
    }

    this.queueSave('SEASON_SAVED', { animeId, seasonId });
    return anime.seasons;
  }

  public deleteSeason(animeId: string, seasonId: string): boolean {
    const anime = this.getAnimeById(animeId);
    if (!anime || !anime.seasons) return false;
    const initialLen = anime.seasons.length;
    anime.seasons = anime.seasons.filter((s: any) => s.id !== seasonId);
    if (anime.seasons.length !== initialLen) {
      this.queueSave('SEASON_DELETED', { animeId, seasonId });
      return true;
    }
    return false;
  }

  public saveEpisode(animeId: string, seasonId: string, episodeData: any): any {
    const anime = this.getAnimeById(animeId);
    if (!anime) throw new Error('Anime series not found');
    const season = anime.seasons?.find((s: any) => s.id === seasonId);
    if (!season) throw new Error('Season not found');

    if (!season.episodes) season.episodes = [];
    const episodeId = episodeData.id || `ep-${Date.now()}`;
    const idx = season.episodes.findIndex((e: any) => e.id === episodeId);

    const epRecord = {
      ...episodeData,
      id: episodeId,
      anime_id: animeId,
      season_id: seasonId,
      episode_number: Number(episodeData.episode_number) || season.episodes.length + 1,
      title: episodeData.title || `Episode ${episodeData.episode_number || season.episodes.length + 1}`,
      description: episodeData.description || '',
      duration_seconds: Number(episodeData.duration_seconds) || 1440,
      thumbnail_url: episodeData.thumbnail_url || anime.backdrop_url || '/images/hero_cyber_samurai.jpg',
      stream_url: episodeData.stream_url || '',
      is_published: episodeData.is_published !== false,
      distribution_rights_confirmed: true,
      view_count: episodeData.view_count || 0
    };

    if (idx >= 0) {
      season.episodes[idx] = { ...season.episodes[idx], ...epRecord };
    } else {
      season.episodes.push(epRecord);
    }

    this.queueSave('EPISODE_SAVED', { animeId, seasonId, episodeId });
    return season.episodes;
  }

  public deleteEpisode(animeId: string, seasonId: string, episodeId: string): boolean {
    const anime = this.getAnimeById(animeId);
    if (!anime) return false;
    const season = anime.seasons?.find((s: any) => s.id === seasonId);
    if (!season || !season.episodes) return false;

    const initialLen = season.episodes.length;
    season.episodes = season.episodes.filter((e: any) => e.id !== episodeId);
    if (season.episodes.length !== initialLen) {
      this.queueSave('EPISODE_DELETED', { animeId, seasonId, episodeId });
      return true;
    }
    return false;
  }

  // --- MOVIES CRUD ---
  public getAllMovies(): any[] {
    return this.db.movies;
  }

  public getMovieById(id: string): any | undefined {
    return this.db.movies.find((m) => m.id === id);
  }

  public saveMovie(movieData: any): any {
    const id = movieData.id || `movie-${Date.now()}`;
    const slug = (movieData.title || id).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const existingIdx = this.db.movies.findIndex((m) => m.id === id);

    const record = {
      ...movieData,
      id,
      slug: movieData.slug || slug,
      title: movieData.title || 'Untitled Movie',
      description: movieData.description || '',
      poster_url: movieData.poster_url || '/images/poster_chrono_blade.jpg',
      backdrop_url: movieData.backdrop_url || '/images/hero_cyber_samurai.jpg',
      runtime_minutes: Number(movieData.runtime_minutes) || 105,
      rating: Number(movieData.rating) || 8.8,
      release_year: Number(movieData.release_year) || new Date().getFullYear(),
      classification: movieData.classification || 'PG-13',
      language: movieData.language || 'Japanese',
      available_audio: movieData.available_audio || ['Japanese', 'English'],
      available_subtitles: movieData.available_subtitles || ['English'],
      distribution_rights_confirmed: true,
      is_published: movieData.is_published !== false,
      view_count: movieData.view_count || 0,
      genres: movieData.genres || ['Action'],
      categories: movieData.categories || ['all', 'movies'],
      stream_url: movieData.stream_url || '',
      updated_at: new Date().toISOString()
    };

    if (existingIdx >= 0) {
      this.db.movies[existingIdx] = { ...this.db.movies[existingIdx], ...record };
    } else {
      record.created_at = new Date().toISOString();
      this.db.movies.unshift(record);
    }

    this.queueSave('MOVIE_SAVED', { id });
    return record;
  }

  public deleteMovie(id: string): boolean {
    const idx = this.db.movies.findIndex((m) => m.id === id);
    if (idx >= 0) {
      this.db.movies.splice(idx, 1);
      this.queueSave('MOVIE_DELETED', { id });
      return true;
    }
    return false;
  }

  // --- HERO BANNERS ---
  public getAllHeroBanners(): any[] {
    return this.db.hero_banners;
  }

  public saveHeroBanner(bannerData: any): any {
    const id = bannerData.id || `banner-${Date.now()}`;
    const idx = this.db.hero_banners.findIndex((b) => b.id === id);

    const record = {
      ...bannerData,
      id,
      title: bannerData.title || 'Featured Title',
      subtitle: bannerData.subtitle || '',
      badge_text: bannerData.badge_text || 'FEATURED',
      image_url: bannerData.image_url || '/images/hero_cyber_samurai.jpg',
      mobile_image_url: bannerData.mobile_image_url || bannerData.image_url || '/images/hero_cyber_samurai.jpg',
      linked_type: bannerData.linked_type || 'anime',
      linked_id: bannerData.linked_id || '',
      display_order: Number(bannerData.display_order) || this.db.hero_banners.length + 1,
      is_enabled: bannerData.is_enabled !== false
    };

    if (idx >= 0) {
      this.db.hero_banners[idx] = { ...this.db.hero_banners[idx], ...record };
    } else {
      this.db.hero_banners.push(record);
    }

    this.queueSave('BANNER_SAVED', { id });
    return record;
  }

  public deleteHeroBanner(id: string): boolean {
    const idx = this.db.hero_banners.findIndex((b) => b.id === id);
    if (idx >= 0) {
      this.db.hero_banners.splice(idx, 1);
      this.queueSave('BANNER_DELETED', { id });
      return true;
    }
    return false;
  }

  // --- HOMEPAGE SECTIONS ---
  public getAllSections(): any[] {
    return this.db.homepage_sections;
  }

  public saveSection(secData: any): any {
    const id = secData.id || `sec-${Date.now()}`;
    const idx = this.db.homepage_sections.findIndex((s) => s.id === id);

    const record = {
      ...secData,
      id,
      title: secData.title || 'New Section',
      subtitle: secData.subtitle || '',
      section_type: secData.section_type || 'trending',
      content_source: secData.content_source || 'automatic_views',
      max_items: Number(secData.max_items) || 8,
      display_order: Number(secData.display_order) || this.db.homepage_sections.length + 1,
      is_enabled: secData.is_enabled !== false
    };

    if (idx >= 0) {
      this.db.homepage_sections[idx] = { ...this.db.homepage_sections[idx], ...record };
    } else {
      this.db.homepage_sections.push(record);
    }

    this.queueSave('SECTION_SAVED', { id });
    return record;
  }

  // --- CATEGORIES ---
  public getAllCategories(): any[] {
    return this.db.categories;
  }

  public saveCategory(catData: any): any {
    const id = catData.id || `cat-${Date.now()}`;
    const idx = this.db.categories.findIndex((c) => c.id === id);

    const record = {
      ...catData,
      id,
      name: catData.name || 'Category',
      icon: catData.icon || 'Sparkles',
      description: catData.description || '',
      display_order: Number(catData.display_order) || this.db.categories.length + 1,
      is_enabled: catData.is_enabled !== false
    };

    if (idx >= 0) {
      this.db.categories[idx] = { ...this.db.categories[idx], ...record };
    } else {
      this.db.categories.push(record);
    }

    this.queueSave('CATEGORY_SAVED', { id });
    return record;
  }

  public deleteCategory(id: string): boolean {
    if (['all', 'anime', 'movies'].includes(id)) {
      throw new Error('Core system categories cannot be deleted.');
    }
    const idx = this.db.categories.findIndex((c) => c.id === id);
    if (idx >= 0) {
      this.db.categories.splice(idx, 1);
      this.queueSave('CATEGORY_DELETED', { id });
      return true;
    }
    return false;
  }

  // --- SETTINGS ---
  public getSettings(): any {
    return this.db.settings;
  }

  public updateSettings(updates: any): any {
    this.db.settings = { ...this.db.settings, ...updates };
    this.queueSave('SETTINGS_UPDATED');
    return this.db.settings;
  }

  // --- USERS ---
  public getUsers(): any[] {
    return this.db.users;
  }

  public getUser(telegramId: number): any | undefined {
    return this.db.users.find((u) => u.telegram_id === telegramId);
  }

  public saveUser(userData: any): any {
    const telegramId = Number(userData.telegram_id);
    const idx = this.db.users.findIndex((u) => u.telegram_id === telegramId);
    if (idx >= 0) {
      this.db.users[idx] = {
        ...this.db.users[idx],
        ...userData,
        last_active_at: new Date().toISOString()
      };
      return this.db.users[idx];
    } else {
      const record = {
        id: `usr-${telegramId}`,
        telegram_id: telegramId,
        first_name: userData.first_name || 'Viewer',
        last_name: userData.last_name || '',
        username: userData.username || '',
        photo_url: userData.photo_url || '',
        language_code: userData.language_code || 'en',
        is_suspended: false,
        created_at: new Date().toISOString(),
        last_active_at: new Date().toISOString()
      };
      this.db.users.push(record);
      this.queueSave('USER_REGISTERED', { telegramId });
      return record;
    }
  }

  public suspendUser(telegramId: number, suspend: boolean, reason?: string): boolean {
    const user = this.getUser(telegramId);
    if (user) {
      user.is_suspended = suspend;
      user.suspension_reason = reason;
      this.queueSave('USER_SUSPENDED', { telegramId, suspend });
      return true;
    }
    return false;
  }

  // --- SAVED ITEMS & WATCH PROGRESS ---
  public getSaved(telegramId: number): any[] {
    return this.db.saved_items.filter((s) => s.user_id === telegramId);
  }

  public addSaved(telegramId: number, contentType: 'anime' | 'movie', contentId: string): any {
    const exists = this.db.saved_items.find(
      (s) => s.user_id === telegramId && s.content_type === contentType && s.content_id === contentId
    );
    if (exists) return exists;

    const record = {
      id: `saved-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: telegramId,
      content_type: contentType,
      content_id: contentId,
      saved_at: new Date().toISOString()
    };
    this.db.saved_items.unshift(record);
    this.queueSave('SAVED_ADDED', { telegramId });
    return record;
  }

  public removeSaved(telegramId: number, contentType: 'anime' | 'movie', contentId: string): boolean {
    const initLen = this.db.saved_items.length;
    this.db.saved_items = this.db.saved_items.filter(
      (s) => !(s.user_id === telegramId && s.content_type === contentType && s.content_id === contentId)
    );
    if (this.db.saved_items.length !== initLen) {
      this.queueSave('SAVED_REMOVED', { telegramId });
      return true;
    }
    return false;
  }

  public getWatchProgress(telegramId: number): any[] {
    return this.db.watch_progress
      .filter((wp) => wp.user_id === telegramId)
      .sort((a, b) => new Date(b.last_watched_at).getTime() - new Date(a.last_watched_at).getTime());
  }

  public saveWatchProgress(data: any): any {
    const idx = this.db.watch_progress.findIndex(
      (wp) =>
        wp.user_id === data.user_id &&
        wp.content_type === data.content_type &&
        wp.content_id === data.content_id &&
        wp.season_id === data.season_id &&
        wp.episode_id === data.episode_id
    );

    const record = {
      id: idx >= 0 ? this.db.watch_progress[idx].id : `wp-${Date.now()}`,
      user_id: data.user_id,
      content_type: data.content_type,
      content_id: data.content_id,
      season_id: data.season_id,
      episode_id: data.episode_id,
      position_seconds: data.position_seconds || 0,
      duration_seconds: data.duration_seconds || 1,
      completion_percentage: data.completion_percentage || 0,
      is_completed: data.is_completed || false,
      last_watched_at: new Date().toISOString(),
      content_title: data.content_title,
      content_poster: data.content_poster,
      episode_title: data.episode_title,
      episode_number: data.episode_number,
      season_number: data.season_number
    };

    if (idx >= 0) {
      this.db.watch_progress[idx] = record;
    } else {
      this.db.watch_progress.unshift(record);
    }

    this.queueSave('PROGRESS_SAVED');
    return record;
  }

  public clearWatchProgress(telegramId: number): void {
    this.db.watch_progress = this.db.watch_progress.filter((wp) => wp.user_id !== telegramId);
    this.queueSave('PROGRESS_CLEARED');
  }

  // --- AUDIT LOGS ---
  public getAuditLogs(): any[] {
    return this.db.audit_logs;
  }

  public addAuditLog(log: any): void {
    const record = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      admin_username: log.admin_username || 'rajpapa',
      action: log.action,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      details: log.details,
      ip_address: log.ip_address || '127.0.0.1',
      created_at: new Date().toISOString()
    };
    this.db.audit_logs.unshift(record);
    if (this.db.audit_logs.length > 300) {
      this.db.audit_logs.pop();
    }
    this.queueSave('AUDIT_LOG');
  }

  // --- FORCE BROADCAST / RE-SEED / BACKUP ---
  public forceBroadcast(): number {
    this.queueSave('GLOBAL_FORCE_SYNC');
    return this.db.version;
  }

  public reseedMasterCatalog(): { anime: number; movies: number; banners: number } {
    this.db.anime = JSON.parse(JSON.stringify(MASTER_SEED_ANIME));
    this.db.movies = JSON.parse(JSON.stringify(MASTER_SEED_MOVIES));
    this.db.hero_banners = JSON.parse(JSON.stringify(MASTER_SEED_BANNERS));
    this.db.homepage_sections = JSON.parse(JSON.stringify(DEFAULT_SECTIONS));
    this.db.categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
    this.queueSave('RESEED_MASTER_CATALOG');
    return {
      anime: this.db.anime.length,
      movies: this.db.movies.length,
      banners: this.db.hero_banners.length
    };
  }

  public exportBackup(): string {
    return JSON.stringify(this.db, null, 2);
  }

  public importBackup(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed.anime) || !Array.isArray(parsed.movies)) {
        throw new Error('Invalid backup schema: missing anime or movies arrays');
      }
      parsed.version = (this.db.version || 1) + 1;
      parsed.last_updated_at = new Date().toISOString();
      this.db = parsed;
      this.persistSync(this.db);
      this.queueSave('RESTORE_BACKUP');
      return true;
    } catch (err) {
      console.error('[DatabaseEngine] Restore failed:', err);
      throw err;
    }
  }
}

export const db = new DatabaseEngine();
