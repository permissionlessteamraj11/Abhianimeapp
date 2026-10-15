import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory resolution: VPS persistent local JSON DB file storage
const DATA_DIR = path.resolve(__dirname, '../data');
const BACKUPS_DIR = path.resolve(DATA_DIR, 'backups');
const DB_FILE = path.resolve(DATA_DIR, 'stark_anime.db.json');
const BUNDLED_DB_FILE = path.resolve(__dirname, '../data/stark_anime.db.json');
const PROCESSING_JOBS_FILE = path.resolve(DATA_DIR, 'processing_jobs.json');

// Ensure local directories exist safely
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('[DatabaseEngine] Notice: Initial data directory creation bypassed (read-only environment):', e);
}

// Sidecar Operational State Interface for Background Video Processing Jobs
export interface VideoProcessingJob {
  id: string;
  anime_id: string;
  season_id?: string;
  episode_id?: string;
  movie_id?: string;
  source_file: string;
  original_filename: string;
  status: 'Queued' | 'Downloading' | 'Validating' | 'Processing' | 'Ready' | 'Published' | 'Failed' | 'Cancelled';
  progress_percent: number;
  current_step?: string;
  qualities_generated: string[];
  output_urls: Record<string, string>;
  master_m3u8_url?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
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
  comments?: any[];
  content_reactions?: any[];
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
  { id: 'adventure', name: 'Adventure', slug: 'adventure', display_order: 2 },
  { id: 'comedy', name: 'Comedy', slug: 'comedy', display_order: 3 },
  { id: 'cyberpunk', name: 'Cyberpunk', slug: 'cyberpunk', display_order: 4 },
  { id: 'drama', name: 'Drama', slug: 'drama', display_order: 5 },
  { id: 'fantasy', name: 'Fantasy', slug: 'fantasy', display_order: 6 },
  { id: 'horror', name: 'Horror', slug: 'horror', display_order: 7 },
  { id: 'isekai', name: 'Isekai', slug: 'isekai', display_order: 8 },
  { id: 'mecha', name: 'Mecha', slug: 'mecha', display_order: 9 },
  { id: 'mystery', name: 'Mystery', slug: 'mystery', display_order: 10 },
  { id: 'romance', name: 'Romance', slug: 'romance', display_order: 11 },
  { id: 'scifi', name: 'Sci-Fi', slug: 'scifi', display_order: 12 },
  { id: 'seinen', name: 'Seinen', slug: 'seinen', display_order: 13 },
  { id: 'shounen', name: 'Shounen', slug: 'shounen', display_order: 14 },
  { id: 'slice_of_life', name: 'Slice of Life', slug: 'slice-of-life', display_order: 15 },
  { id: 'sports', name: 'Sports', slug: 'sports', display_order: 16 },
  { id: 'supernatural', name: 'Supernatural', slug: 'supernatural', display_order: 17 },
  { id: 'thriller', name: 'Thriller', slug: 'thriller', display_order: 18 }
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

const MASTER_SEED_ANIME: any[] = [];
const MASTER_SEED_MOVIES: any[] = [];
const MASTER_SEED_BANNERS: any[] = [];

class DatabaseEngine {
  private db: DatabaseSchema;
  private subscribers: Set<(event: { type: string; version: number; payload?: any }) => void> = new Set();
  private isSaving: boolean = false;
  private pendingSave: boolean = false;

  constructor() {
    this.db = this.loadOrInitialize();
  }

  private validateSchema(parsed: any): DatabaseSchema {
    return {
      version: typeof parsed.version === 'number' ? parsed.version : 1,
      last_updated_at: parsed.last_updated_at || new Date().toISOString(),
      categories: Array.isArray(parsed.categories) && parsed.categories.length > 0 ? parsed.categories : DEFAULT_CATEGORIES,
      genres: Array.isArray(parsed.genres) && parsed.genres.length > 0 ? parsed.genres : DEFAULT_GENRES,
      anime: Array.isArray(parsed.anime) ? parsed.anime : [],
      movies: Array.isArray(parsed.movies) ? parsed.movies : [],
      hero_banners: Array.isArray(parsed.hero_banners) ? parsed.hero_banners : [],
      homepage_sections: Array.isArray(parsed.homepage_sections) && parsed.homepage_sections.length > 0 ? parsed.homepage_sections : DEFAULT_SECTIONS,
      settings: parsed.settings || DEFAULT_SETTINGS,
      users: Array.isArray(parsed.users) ? parsed.users : [],
      saved_items: Array.isArray(parsed.saved_items) ? parsed.saved_items : [],
      watch_progress: Array.isArray(parsed.watch_progress) ? parsed.watch_progress : [],
      audit_logs: Array.isArray(parsed.audit_logs) ? parsed.audit_logs : [],
      copyright_claims: Array.isArray(parsed.copyright_claims) ? parsed.copyright_claims : [],
      reports: Array.isArray(parsed.reports) ? parsed.reports : [],
      comments: Array.isArray(parsed.comments) ? parsed.comments : [],
      content_reactions: Array.isArray(parsed.content_reactions) ? parsed.content_reactions : []
    };
  }

  private loadOrInitialize(): DatabaseSchema {
    try {
      let targetFile = DB_FILE;
      if (!fs.existsSync(targetFile) && fs.existsSync(BUNDLED_DB_FILE)) {
        targetFile = BUNDLED_DB_FILE;
      }

      if (fs.existsSync(targetFile)) {
        const raw = fs.readFileSync(targetFile, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.version === 'number') {
          const validated = this.validateSchema(parsed);
          console.log(`[DatabaseEngine] Loaded local database v${validated.version} (${validated.anime.length} anime, ${validated.movies.length} movies)`);
          return validated;
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
      anime: [],
      movies: [],
      hero_banners: [],
      homepage_sections: DEFAULT_SECTIONS,
      settings: DEFAULT_SETTINGS,
      users: [],
      saved_items: [],
      watch_progress: [],
      audit_logs: [],
      copyright_claims: [],
      reports: [],
      comments: [],
      content_reactions: []
    };

    this.persistSync(fresh);
    console.log('[DatabaseEngine] Initialized brand new persistent database.');
    return fresh;
  }

  private persistSync(data: DatabaseSchema): void {
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
      const serialized = JSON.stringify(data, null, 2);
      fs.writeFileSync(tmpFile, serialized, 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      console.warn('[DatabaseEngine] Error writing persistent JSON database:', err);
    }
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
      storageType: 'JSON File Persistent Database',
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
      genres: Array.isArray(animeData.genres) && animeData.genres.length > 0 ? animeData.genres : ['Action'],
      categories: Array.isArray(animeData.categories) ? animeData.categories : ['all', 'anime'],
      placements: Array.isArray(animeData.placements) ? animeData.placements : (animeData.placements ? [animeData.placements] : []),
      section_ids: Array.isArray(animeData.section_ids) ? animeData.section_ids : [],
      seasons: Array.isArray(animeData.seasons) && animeData.seasons.length > 0
        ? animeData.seasons
        : (existingIdx >= 0 && Array.isArray(this.db.anime[existingIdx].seasons) ? this.db.anime[existingIdx].seasons : []),
      updated_at: new Date().toISOString()
    };

    if (existingIdx >= 0) {
      this.db.anime[existingIdx] = { ...this.db.anime[existingIdx], ...record };
    } else {
      record.created_at = new Date().toISOString();
      this.db.anime.unshift(record);
    }

    // Auto-sync with Hero Carousel if 'hero' placement is selected
    if (record.placements?.includes('hero')) {
      const bannerIdx = this.db.hero_banners.findIndex((b: any) => b.linked_id === record.id);
      const bannerData = {
        id: bannerIdx >= 0 ? this.db.hero_banners[bannerIdx].id : `hero-${record.id}`,
        title: record.title,
        subtitle: record.genres ? record.genres.slice(0, 2).join(' • ') : '',
        image_url: record.backdrop_url || record.poster_url,
        linked_type: 'anime',
        linked_id: record.id,
        button_text: 'Watch Now',
        display_order: 1,
        is_enabled: true,
        rating: record.rating,
        year: record.release_year,
        classification: record.classification,
        description: record.description
      };
      if (bannerIdx >= 0) {
        this.db.hero_banners[bannerIdx] = { ...this.db.hero_banners[bannerIdx], ...bannerData };
      } else {
        this.db.hero_banners.unshift(bannerData);
      }
    } else {
      const bannerIdx = this.db.hero_banners.findIndex((b: any) => b.linked_id === record.id && b.id === `hero-${record.id}`);
      if (bannerIdx >= 0) {
        this.db.hero_banners.splice(bannerIdx, 1);
      }
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
    if (!anime.seasons) anime.seasons = [];

    let season = anime.seasons.find((s: any) => s.id === seasonId);
    if (!season && anime.seasons.length > 0) {
      season = anime.seasons[0];
    }
    if (!season) {
      season = {
        id: seasonId || `s-${Date.now()}`,
        anime_id: animeId,
        season_number: 1,
        title: 'Season 1',
        description: '',
        is_published: true,
        episodes: []
      };
      anime.seasons.push(season);
    }

    if (!season.episodes) season.episodes = [];
    const episodeId = episodeData.id || `ep-${Date.now()}`;
    const idx = season.episodes.findIndex((e: any) => e.id === episodeId);

    const streamUrls = episodeData.stream_urls && typeof episodeData.stream_urls === 'object' ? episodeData.stream_urls : {};
    const mainStreamUrl =
      episodeData.stream_url ||
      streamUrls['1080p'] ||
      streamUrls['720p'] ||
      streamUrls['480p'] ||
      '';

    const epRecord = {
      ...episodeData,
      id: episodeId,
      anime_id: animeId,
      season_id: season.id,
      episode_number: Number(episodeData.episode_number) || season.episodes.length + 1,
      title: episodeData.title || `Episode ${episodeData.episode_number || season.episodes.length + 1}`,
      description: episodeData.description || '',
      duration_seconds: Number(episodeData.duration_seconds) || 1440,
      thumbnail_url: episodeData.thumbnail_url || anime.backdrop_url || '/images/hero_cyber_samurai.jpg',
      stream_url: mainStreamUrl,
      stream_urls: streamUrls,
      is_published: episodeData.is_published !== false,
      distribution_rights_confirmed: true,
      view_count: episodeData.view_count || 0
    };

    if (idx >= 0) {
      season.episodes[idx] = { ...season.episodes[idx], ...epRecord };
    } else {
      season.episodes.push(epRecord);
    }

    this.queueSave('EPISODE_SAVED', { animeId, seasonId: season.id, episodeId });
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
      genres: Array.isArray(movieData.genres) && movieData.genres.length > 0 ? movieData.genres : ['Action'],
      categories: Array.isArray(movieData.categories) ? movieData.categories : ['all', 'movies'],
      placements: Array.isArray(movieData.placements) ? movieData.placements : (movieData.placements ? [movieData.placements] : []),
      section_ids: Array.isArray(movieData.section_ids) ? movieData.section_ids : [],
      stream_url: movieData.stream_url || '',
      updated_at: new Date().toISOString()
    };

    if (existingIdx >= 0) {
      this.db.movies[existingIdx] = { ...this.db.movies[existingIdx], ...record };
    } else {
      record.created_at = new Date().toISOString();
      this.db.movies.unshift(record);
    }

    // Auto-sync with Hero Carousel if 'hero' placement is selected
    if (record.placements?.includes('hero')) {
      const bannerIdx = this.db.hero_banners.findIndex((b: any) => b.linked_id === record.id);
      const bannerData = {
        id: bannerIdx >= 0 ? this.db.hero_banners[bannerIdx].id : `hero-${record.id}`,
        title: record.title,
        subtitle: record.genres ? record.genres.slice(0, 2).join(' • ') : '',
        image_url: record.backdrop_url || record.poster_url,
        linked_type: 'movie',
        linked_id: record.id,
        button_text: 'Watch Movie',
        display_order: 1,
        is_enabled: true,
        rating: record.rating,
        year: record.release_year,
        classification: record.classification,
        description: record.description
      };
      if (bannerIdx >= 0) {
        this.db.hero_banners[bannerIdx] = { ...this.db.hero_banners[bannerIdx], ...bannerData };
      } else {
        this.db.hero_banners.unshift(bannerData);
      }
    } else {
      const bannerIdx = this.db.hero_banners.findIndex((b: any) => b.linked_id === record.id && b.id === `hero-${record.id}`);
      if (bannerIdx >= 0) {
        this.db.hero_banners.splice(bannerIdx, 1);
      }
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

  // --- CONTENT REACTIONS (LIKES & DISLIKES) ---
  public getReactions(targetType: string, targetId: string, currentUserId?: number): { likesCount: number; dislikesCount: number; userReaction: 'like' | 'dislike' | null } {
    if (!this.db.content_reactions) this.db.content_reactions = [];
    const list = this.db.content_reactions.filter((r) => r.target_type === targetType && r.target_id === targetId);
    const likesCount = list.filter((r) => r.reaction_type === 'like').length;
    const dislikesCount = list.filter((r) => r.reaction_type === 'dislike').length;
    let userReaction: 'like' | 'dislike' | null = null;
    if (currentUserId) {
      const match = list.find((r) => Number(r.user_id) === Number(currentUserId));
      if (match) userReaction = match.reaction_type;
    }
    return { likesCount, dislikesCount, userReaction };
  }

  public toggleReaction(targetType: string, targetId: string, userId: number, reactionType: 'like' | 'dislike'): { likesCount: number; dislikesCount: number; userReaction: 'like' | 'dislike' | null } {
    const user = this.getUser(userId);
    if (user?.is_suspended) {
      throw new Error('Your account is currently suspended from reacting.');
    }

    if (!this.db.content_reactions) this.db.content_reactions = [];
    const idx = this.db.content_reactions.findIndex((r) => r.target_type === targetType && r.target_id === targetId && Number(r.user_id) === Number(userId));

    if (idx >= 0) {
      const existing = this.db.content_reactions[idx];
      if (existing.reaction_type === reactionType) {
        // Toggle off
        this.db.content_reactions.splice(idx, 1);
      } else {
        // Switch reaction
        this.db.content_reactions[idx].reaction_type = reactionType;
        this.db.content_reactions[idx].updated_at = new Date().toISOString();
      }
    } else {
      // Add reaction
      this.db.content_reactions.push({
        id: `react-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        user_id: userId,
        target_type: targetType,
        target_id: targetId,
        reaction_type: reactionType,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    this.queueSave('REACTION_TOGGLED', { targetType, targetId, userId });
    return this.getReactions(targetType, targetId, userId);
  }

  // --- COMMENTS & MODERATION ---
  public getComments(targetType: string, targetId: string, currentUserId?: number): any[] {
    if (!this.db.comments) this.db.comments = [];
    const rawComments = this.db.comments.filter((c) => c.target_type === targetType && c.target_id === targetId && !c.is_deleted);

    // Sort chronologically descending (newest first)
    rawComments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return rawComments.map((c) => {
      const likedBy: number[] = Array.isArray(c.liked_by_users) ? c.liked_by_users : [];
      const isLiked = currentUserId ? likedBy.includes(Number(currentUserId)) : false;
      return {
        id: c.id,
        target_type: c.target_type,
        target_id: c.target_id,
        user_id: String(c.user_id),
        username: c.username,
        user_avatar: c.user_avatar,
        badge: c.badge || 'Viewer',
        text: c.text,
        created_at: c.created_at,
        likes_count: c.likes_count || likedBy.length,
        is_liked: isLiked,
        replies_count: 0
      };
    });
  }

  public postComment(data: { target_type: string; target_id: string; user_id: number; username: string; user_avatar?: string; text: string }): any {
    const user = this.getUser(data.user_id);
    if (user?.is_suspended) {
      throw new Error('Your account is suspended. You cannot post comments.');
    }

    if (!data.text || !data.text.trim()) {
      throw new Error('Comment text cannot be empty.');
    }

    if (!this.db.comments) this.db.comments = [];

    const record = {
      id: `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      target_type: data.target_type,
      target_id: data.target_id,
      user_id: data.user_id,
      username: data.username.trim() || 'Viewer',
      user_avatar: data.user_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
      badge: user?.username === 'rajpapa' ? 'Admin' : 'Viewer',
      text: data.text.trim(),
      likes_count: 0,
      liked_by_users: [],
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.db.comments.unshift(record);
    this.queueSave('COMMENT_POSTED', { commentId: record.id, userId: data.user_id });

    return {
      id: record.id,
      target_type: record.target_type,
      target_id: record.target_id,
      user_id: String(record.user_id),
      username: record.username,
      user_avatar: record.user_avatar,
      badge: record.badge,
      text: record.text,
      created_at: record.created_at,
      likes_count: 0,
      is_liked: false,
      replies_count: 0
    };
  }

  public toggleLikeComment(commentId: string, userId: number): { likes_count: number; is_liked: boolean } {
    if (!this.db.comments) this.db.comments = [];
    const comment = this.db.comments.find((c) => c.id === commentId && !c.is_deleted);
    if (!comment) throw new Error('Comment not found');

    if (!Array.isArray(comment.liked_by_users)) comment.liked_by_users = [];
    const uidNum = Number(userId);
    const idx = comment.liked_by_users.indexOf(uidNum);

    let isLiked = false;
    if (idx >= 0) {
      comment.liked_by_users.splice(idx, 1);
      isLiked = false;
    } else {
      comment.liked_by_users.push(uidNum);
      isLiked = true;
    }

    comment.likes_count = comment.liked_by_users.length;
    this.queueSave('COMMENT_LIKE_TOGGLED', { commentId, userId });

    return { likes_count: comment.likes_count, is_liked: isLiked };
  }

  public getAllCommentsForAdmin(): any[] {
    if (!this.db.comments) this.db.comments = [];
    return this.db.comments
      .filter((c) => !c.is_deleted)
      .map((c) => {
        const authorUser = this.getUser(Number(c.user_id));
        return {
          id: c.id,
          target_type: c.target_type,
          target_id: c.target_id,
          user_id: c.user_id,
          username: c.username,
          user_avatar: c.user_avatar,
          text: c.text,
          likes_count: c.likes_count || 0,
          created_at: c.created_at,
          is_author_suspended: authorUser?.is_suspended || false
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public deleteComment(commentId: string): boolean {
    if (!this.db.comments) this.db.comments = [];
    const comment = this.db.comments.find((c) => c.id === commentId);
    if (comment) {
      comment.is_deleted = true;
      this.queueSave('COMMENT_DELETED', { commentId });
      return true;
    }
    return false;
  }

  public deleteCommentAndBanUser(commentId: string, reason?: string): { success: boolean; userId?: number } {
    if (!this.db.comments) this.db.comments = [];
    const comment = this.db.comments.find((c) => c.id === commentId);
    if (!comment) return { success: false };

    comment.is_deleted = true;
    const userId = Number(comment.user_id);
    if (userId) {
      this.suspendUser(userId, true, reason || 'Inappropriate comment policy violation');
    }

    // Also soft-delete all other comments by this user
    this.db.comments.forEach((c) => {
      if (Number(c.user_id) === userId) {
        c.is_deleted = true;
      }
    });

    this.queueSave('COMMENT_DELETED_AND_USER_BANNED', { commentId, userId });
    return { success: true, userId };
  }

  // --- SIDECAR OPERATIONAL PROCESSING JOBS ---
  public getProcessingJobs(): VideoProcessingJob[] {
    try {
      if (fs.existsSync(PROCESSING_JOBS_FILE)) {
        const raw = fs.readFileSync(PROCESSING_JOBS_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('[DatabaseEngine] Error reading processing jobs file:', err);
    }
    return [];
  }

  public saveProcessingJob(job: VideoProcessingJob): VideoProcessingJob {
    const jobs = this.getProcessingJobs();
    const idx = jobs.findIndex((j) => j.id === job.id);
    job.updated_at = new Date().toISOString();
    if (idx >= 0) {
      jobs[idx] = { ...jobs[idx], ...job };
    } else {
      jobs.unshift(job);
    }
    try {
      const tmp = `${PROCESSING_JOBS_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tmp, JSON.stringify(jobs, null, 2), 'utf-8');
      fs.renameSync(tmp, PROCESSING_JOBS_FILE);
    } catch (err) {
      console.error('[DatabaseEngine] Error saving processing job:', err);
    }
    return job;
  }

  public getProcessingJobById(id: string): VideoProcessingJob | undefined {
    return this.getProcessingJobs().find((j) => j.id === id);
  }

  public deleteProcessingJob(id: string): boolean {
    let jobs = this.getProcessingJobs();
    const initLen = jobs.length;
    jobs = jobs.filter((j) => j.id !== id);
    if (jobs.length !== initLen) {
      try {
        const tmp = `${PROCESSING_JOBS_FILE}.tmp.${Date.now()}`;
        fs.writeFileSync(tmp, JSON.stringify(jobs, null, 2), 'utf-8');
        fs.renameSync(tmp, PROCESSING_JOBS_FILE);
        return true;
      } catch (err) {
        console.error('[DatabaseEngine] Error deleting processing job:', err);
      }
    }
    return false;
  }
}

export const db = new DatabaseEngine();
