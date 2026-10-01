import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database file path inside /data directory for persistent storage
const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

export interface DatabaseSchema {
  animeList: any[];
  movieList: any[];
  heroBanners: any[];
  homepageSections: any[];
  categories: any[];
  genres: any[];
  appSettings: any;
  users: any[];
  savedItems: any[];
  watchProgressList: any[];
  adminAuditLogs: any[];
  databaseMeta: {
    version: string;
    last_updated_at: string;
    sync_id: string;
  };
}

const DEFAULT_CATEGORIES = [
  { id: 'all', name: 'All', icon: 'Sparkles', description: 'Everything in the catalog', display_order: 0, is_enabled: true },
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
  { id: 'mystery', name: 'Mystery', slug: 'mystery', display_order: 6 }
];

const DEFAULT_SECTIONS = [
  {
    id: 'sec-01',
    title: 'New Episodes',
    subtitle: 'Fresh releases available now',
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
    subtitle: 'Feature films with high definition stream',
    section_type: 'popular_movies',
    content_source: 'manual',
    max_items: 8,
    display_order: 3,
    is_enabled: true
  },
  {
    id: 'sec-04',
    title: 'Action & Sci-Fi Hits',
    subtitle: 'Adrenaline pumped anime series',
    section_type: 'genre_curated',
    content_source: 'genre_action',
    max_items: 8,
    display_order: 4,
    is_enabled: true
  }
];

const DEFAULT_SETTINGS = {
  appName: 'Stark Anime',
  tagline: 'Stream Anime & Movies in Ultra HD',
  theme: 'dark_cinematic',
  defaultQuality: '1080p',
  heroAutoplay: true,
  heroDurationMs: 5000,
  maxHeroBanners: 5,
  recommendationsCount: 9,
  maintenanceMode: false,
  copyrightEmail: 'compliance@starkanime.app',
  supportUrl: 'https://t.me/StarkAnimeSupport',
  antiPiracyEnforced: true,
  streamingCdnUrl: '',
  broadcastNotice: ''
};

const SEED_ANIME = [
  {
    id: 'anime-cyber-samurai',
    title: 'Cyber Samurai: 2099',
    slug: 'cyber-samurai-2099',
    description: 'In Neo-Kyoto, a cybernetic ronin must dismantle an underground syndicate controlling human cyber-enhancements.',
    poster_url: '/images/poster_chrono_blade.jpg',
    backdrop_url: '/images/hero_cyber_samurai.jpg',
    rating: 9.4,
    release_year: 2026,
    status: 'Ongoing',
    classification: 'TV-MA',
    genres: ['Action', 'Cyberpunk', 'Sci-Fi'],
    categories: ['all', 'anime', 'action', 'scifi'],
    is_published: true,
    distribution_rights_confirmed: true,
    view_count: 1240,
    language: 'Japanese',
    available_audio: ['Japanese (Original)', 'English Dub', 'Hindi Dub'],
    available_subtitles: ['English', 'Hindi', 'Spanish'],
    seasons: [
      {
        id: 'season-cs-1',
        anime_id: 'anime-cyber-samurai',
        season_number: 1,
        title: 'Season 1: Neon Shadows',
        description: 'The cyber-ronin awakens and uncovers the syndicate conspiracy.',
        is_published: true,
        episodes: [
          {
            id: 'ep-cs-1-1',
            anime_id: 'anime-cyber-samurai',
            season_id: 'season-cs-1',
            episode_number: 1,
            title: 'The Steel Ronin Awakens',
            description: 'Kaito is reactivated in the depths of Sector 7 after twenty years offline.',
            thumbnail_url: '/images/hero_cyber_samurai.jpg',
            stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            duration_seconds: 1440,
            distribution_rights_confirmed: true,
            is_published: true,
            view_count: 580
          },
          {
            id: 'ep-cs-1-2',
            anime_id: 'anime-cyber-samurai',
            season_id: 'season-cs-1',
            episode_number: 2,
            title: 'Neon Bloodbath',
            description: 'A fierce confrontation with syndicate enforcers in the upper skyway.',
            thumbnail_url: '/images/hero_cyber_samurai.jpg',
            stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
            duration_seconds: 1380,
            distribution_rights_confirmed: true,
            is_published: true,
            view_count: 420
          },
          {
            id: 'ep-cs-1-3',
            anime_id: 'anime-cyber-samurai',
            season_id: 'season-cs-1',
            episode_number: 3,
            title: 'Ghost in the Katana',
            description: 'Kaito discovers that his blade contains the digital consciousness of his former mentor.',
            thumbnail_url: '/images/hero_cyber_samurai.jpg',
            stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
            duration_seconds: 1520,
            distribution_rights_confirmed: true,
            is_published: true,
            view_count: 380
          }
        ]
      },
      {
        id: 'season-cs-2',
        anime_id: 'anime-cyber-samurai',
        season_number: 2,
        title: 'Season 2: Cybernetic War',
        description: 'The rebellion begins across the towering sectors of Neo-Kyoto.',
        is_published: true,
        episodes: [
          {
            id: 'ep-cs-2-1',
            anime_id: 'anime-cyber-samurai',
            season_id: 'season-cs-2',
            episode_number: 1,
            title: 'Code of the Syndicate',
            description: 'Kaito infiltrates the orbital server tower above Neo-Kyoto.',
            thumbnail_url: '/images/hero_cyber_samurai.jpg',
            stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            duration_seconds: 1480,
            distribution_rights_confirmed: true,
            is_published: true,
            view_count: 290
          }
        ]
      }
    ]
  },
  {
    id: 'anime-mystic-alchemy',
    title: 'Mystic Alchemy Chronicles',
    slug: 'mystic-alchemy-chronicles',
    description: 'Two alchemist prodigies decipher the forbidden celestial grimoire before the Eclipse of Shadows sweeps across their kingdom.',
    poster_url: '/images/poster_shadow_phantom.jpg',
    backdrop_url: '/images/hero_mystic_alchemy.jpg',
    rating: 9.1,
    release_year: 2025,
    status: 'Ongoing',
    classification: 'PG-13',
    genres: ['Fantasy', 'Adventure', 'Mystery'],
    categories: ['all', 'anime', 'fantasy'],
    is_published: true,
    distribution_rights_confirmed: true,
    view_count: 980,
    language: 'Japanese',
    available_audio: ['Japanese (Original)', 'English Dub'],
    available_subtitles: ['English', 'Hindi'],
    seasons: [
      {
        id: 'season-ma-1',
        anime_id: 'anime-mystic-alchemy',
        season_number: 1,
        title: 'Season 1: Celestial Codex',
        description: 'The mystery of the golden circle unfolds.',
        is_published: true,
        episodes: [
          {
            id: 'ep-ma-1-1',
            anime_id: 'anime-mystic-alchemy',
            season_id: 'season-ma-1',
            episode_number: 1,
            title: 'The Forbidden Grimoire',
            description: 'A dark grimoire surfaces in the secret archives of Grand Spire.',
            thumbnail_url: '/images/hero_mystic_alchemy.jpg',
            stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            duration_seconds: 1440,
            distribution_rights_confirmed: true,
            is_published: true,
            view_count: 512
          },
          {
            id: 'ep-ma-1-2',
            anime_id: 'anime-mystic-alchemy',
            season_id: 'season-ma-1',
            episode_number: 2,
            title: 'Transmutation of Blood',
            description: 'The alchemists defend their guild against the inquisitor legions.',
            thumbnail_url: '/images/hero_mystic_alchemy.jpg',
            stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
            duration_seconds: 1500,
            distribution_rights_confirmed: true,
            is_published: true,
            view_count: 420
          }
        ]
      }
    ]
  },
  {
    id: 'anime-stellar-odyssey',
    title: 'Stellar Odyssey',
    slug: 'stellar-odyssey',
    description: 'The deep-space exploration vessel Icarus navigates beyond the known galaxy in search of the ancient Genesis Signal.',
    poster_url: '/images/poster_stellar_odyssey.jpg',
    backdrop_url: '/images/poster_stellar_odyssey.jpg',
    rating: 8.9,
    release_year: 2026,
    status: 'Ongoing',
    classification: 'TV-14',
    genres: ['Sci-Fi', 'Adventure'],
    categories: ['all', 'anime', 'scifi'],
    is_published: true,
    distribution_rights_confirmed: true,
    view_count: 850,
    language: 'Japanese',
    available_audio: ['Japanese (Original)', 'English Dub'],
    available_subtitles: ['English', 'Hindi'],
    seasons: [
      {
        id: 'season-so-1',
        anime_id: 'anime-stellar-odyssey',
        season_number: 1,
        title: 'Season 1: Deep Horizon',
        description: 'Voyage into the uncharted nebula.',
        is_published: true,
        episodes: [
          {
            id: 'ep-so-1-1',
            anime_id: 'anime-stellar-odyssey',
            season_id: 'season-so-1',
            episode_number: 1,
            title: 'Beyond the Kuiper Belt',
            description: 'The crew uncovers a derelict hyper-spatial gate.',
            thumbnail_url: '/images/poster_stellar_odyssey.jpg',
            stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
            duration_seconds: 1420,
            distribution_rights_confirmed: true,
            is_published: true,
            view_count: 670
          },
          {
            id: 'ep-so-1-2',
            anime_id: 'anime-stellar-odyssey',
            season_id: 'season-so-1',
            episode_number: 2,
            title: 'The Silent Singularity',
            description: 'Trapped in the gravitational pull of a rogue black hole.',
            thumbnail_url: '/images/poster_stellar_odyssey.jpg',
            stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
            duration_seconds: 1480,
            distribution_rights_confirmed: true,
            is_published: true,
            view_count: 590
          }
        ]
      }
    ]
  }
];

const SEED_MOVIES = [
  {
    id: 'movie-chrono-blade',
    title: 'Chrono Blade: The Shattered Timeline',
    slug: 'chrono-blade-movie',
    description: 'A temporal swordmaster races across parallel dimensions to avert the catastrophic collapse of reality.',
    poster_url: '/images/poster_chrono_blade.jpg',
    backdrop_url: '/images/hero_cyber_samurai.jpg',
    runtime_minutes: 114,
    rating: 9.3,
    release_year: 2026,
    classification: 'PG-13',
    genres: ['Action', 'Sci-Fi'],
    categories: ['all', 'movies', 'action'],
    stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    is_published: true,
    distribution_rights_confirmed: true,
    view_count: 1420
  },
  {
    id: 'movie-shadow-phantom',
    title: 'Shadow Phantom: Final Requiem',
    slug: 'shadow-phantom-movie',
    description: 'In the ruins of Neo-Tokyo, the last spectral assassin must complete one final contract before dusk.',
    poster_url: '/images/poster_shadow_phantom.jpg',
    backdrop_url: '/images/hero_mystic_alchemy.jpg',
    runtime_minutes: 108,
    rating: 9.0,
    release_year: 2025,
    classification: 'TV-MA',
    genres: ['Action', 'Fantasy'],
    categories: ['all', 'movies', 'fantasy'],
    stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    is_published: true,
    distribution_rights_confirmed: true,
    view_count: 1190
  }
];

const SEED_HERO_BANNERS = [
  {
    id: 'banner-01',
    content_type: 'anime',
    content_id: 'anime-cyber-samurai',
    title: 'Cyber Samurai: 2099',
    tagline: 'The Ronin Has Awakened in Neo-Kyoto',
    image_url: '/images/hero_cyber_samurai.jpg',
    badge_text: 'HOT NEW SEASON',
    button_text: 'Watch S1 Episode 1',
    display_order: 1,
    is_enabled: true
  },
  {
    id: 'banner-02',
    content_type: 'anime',
    content_id: 'anime-mystic-alchemy',
    title: 'Mystic Alchemy Chronicles',
    tagline: 'Unravel the Forbidden Celestial Codex',
    image_url: '/images/hero_mystic_alchemy.jpg',
    badge_text: 'EXCLUSIVE SERIES',
    button_text: 'Stream Now',
    display_order: 2,
    is_enabled: true
  },
  {
    id: 'banner-03',
    content_type: 'movie',
    content_id: 'movie-chrono-blade',
    title: 'Chrono Blade: Movie',
    tagline: 'Experience the 4K Theatrical Sensation',
    image_url: '/images/poster_chrono_blade.jpg',
    badge_text: 'BLOCKBUSTER MOVIE',
    button_text: 'Watch Full Movie',
    display_order: 3,
    is_enabled: true
  }
];

class DatabaseManager {
  private data: DatabaseSchema;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.data = this.loadDatabase();
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(fileContent);
        if (parsed && Array.isArray(parsed.animeList) && parsed.animeList.length > 0) {
          return {
            ...parsed,
            categories: parsed.categories?.length > 0 ? parsed.categories : DEFAULT_CATEGORIES,
            genres: parsed.genres?.length > 0 ? parsed.genres : DEFAULT_GENRES,
            homepageSections: parsed.homepageSections?.length > 0 ? parsed.homepageSections : DEFAULT_SECTIONS,
            appSettings: parsed.appSettings || DEFAULT_SETTINGS
          };
        }
      }
    } catch (err) {
      console.error('[DatabaseManager] Error reading database.json, initializing seeds:', err);
    }

    // Default Seed state
    const seedDb: DatabaseSchema = {
      animeList: SEED_ANIME,
      movieList: SEED_MOVIES,
      heroBanners: SEED_HERO_BANNERS,
      homepageSections: DEFAULT_SECTIONS,
      categories: DEFAULT_CATEGORIES,
      genres: DEFAULT_GENRES,
      appSettings: DEFAULT_SETTINGS,
      users: [],
      savedItems: [],
      watchProgressList: [],
      adminAuditLogs: [],
      databaseMeta: {
        version: '2.0.0',
        last_updated_at: new Date().toISOString(),
        sync_id: `sync_${Date.now()}`
      }
    };

    this.persistImmediately(seedDb);
    return seedDb;
  }

  private persistImmediately(dbState: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      dbState.databaseMeta.last_updated_at = new Date().toISOString();
      dbState.databaseMeta.sync_id = `sync_${Date.now()}`;
      const tempPath = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(dbState, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('[DatabaseManager] Failed to persist database:', err);
    }
  }

  public save() {
    this.persistImmediately(this.data);
  }

  public getDb(): DatabaseSchema {
    return this.data;
  }

  public getAnimeList() {
    return this.data.animeList;
  }

  public getMovieList() {
    return this.data.movieList;
  }

  public getHeroBanners() {
    return this.data.heroBanners;
  }

  public getHomepageSections() {
    return this.data.homepageSections;
  }

  public getCategories() {
    return this.data.categories;
  }

  public getAppSettings() {
    return this.data.appSettings;
  }

  public getUsers() {
    return this.data.users;
  }

  public getSavedItems() {
    return this.data.savedItems;
  }

  public getWatchProgressList() {
    return this.data.watchProgressList;
  }

  public getAuditLogs() {
    return this.data.adminAuditLogs;
  }

  // Anime operations
  public saveAnime(animeData: any) {
    animeData.distribution_rights_confirmed = true;
    const existingIdx = this.data.animeList.findIndex((a) => a.id === animeData.id);
    if (existingIdx >= 0) {
      this.data.animeList[existingIdx] = {
        ...this.data.animeList[existingIdx],
        ...animeData,
        updated_at: new Date().toISOString()
      };
      this.save();
      return this.data.animeList[existingIdx];
    } else {
      const newAnime = {
        ...animeData,
        id: animeData.id || `anime-${Date.now()}`,
        slug: (animeData.title || 'anime').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        view_count: animeData.view_count || 0,
        seasons: animeData.seasons || [],
        created_at: new Date().toISOString()
      };
      this.data.animeList.unshift(newAnime);
      this.save();
      return newAnime;
    }
  }

  public deleteAnime(id: string) {
    this.data.animeList = this.data.animeList.filter((a) => a.id !== id);
    this.save();
  }

  // Season operations
  public saveSeason(animeId: string, seasonData: any) {
    const anime = this.data.animeList.find((a) => a.id === animeId);
    if (!anime) throw new Error('Anime not found.');
    if (!anime.seasons) anime.seasons = [];

    const existingIdx = anime.seasons.findIndex((s: any) => s.id === seasonData.id);
    if (existingIdx >= 0) {
      anime.seasons[existingIdx] = { ...anime.seasons[existingIdx], ...seasonData };
    } else {
      anime.seasons.push({
        ...seasonData,
        id: seasonData.id || `season-${Date.now()}`,
        anime_id: animeId,
        episodes: seasonData.episodes || []
      });
    }
    this.save();
    return anime.seasons;
  }

  public deleteSeason(animeId: string, seasonId: string) {
    const anime = this.data.animeList.find((a) => a.id === animeId);
    if (!anime) throw new Error('Anime not found.');
    if (anime.seasons) {
      anime.seasons = anime.seasons.filter((s: any) => s.id !== seasonId);
    }
    this.save();
    return anime.seasons || [];
  }

  // Episode operations
  public saveEpisode(animeId: string, seasonId: string, episodeData: any) {
    const anime = this.data.animeList.find((a) => a.id === animeId);
    if (!anime) throw new Error('Anime not found.');
    const season = anime.seasons?.find((s: any) => s.id === seasonId);
    if (!season) throw new Error('Season not found.');
    if (!season.episodes) season.episodes = [];

    episodeData.distribution_rights_confirmed = true;
    const epIdx = season.episodes.findIndex((e: any) => e.id === episodeData.id);
    if (epIdx >= 0) {
      season.episodes[epIdx] = {
        ...season.episodes[epIdx],
        ...episodeData,
        updated_at: new Date().toISOString()
      };
    } else {
      season.episodes.push({
        ...episodeData,
        id: episodeData.id || `ep-${Date.now()}`,
        anime_id: animeId,
        season_id: seasonId,
        view_count: episodeData.view_count || 0,
        created_at: new Date().toISOString()
      });
    }
    this.save();
    return season.episodes;
  }

  public deleteEpisode(animeId: string, seasonId: string, episodeId: string) {
    const anime = this.data.animeList.find((a) => a.id === animeId);
    if (!anime) throw new Error('Anime not found.');
    const season = anime.seasons?.find((s: any) => s.id === seasonId);
    if (!season) throw new Error('Season not found.');
    if (season.episodes) {
      season.episodes = season.episodes.filter((e: any) => e.id !== episodeId);
    }
    this.save();
    return season.episodes || [];
  }

  // Movie operations
  public saveMovie(movieData: any) {
    movieData.distribution_rights_confirmed = true;
    const existingIdx = this.data.movieList.findIndex((m) => m.id === movieData.id);
    if (existingIdx >= 0) {
      this.data.movieList[existingIdx] = {
        ...this.data.movieList[existingIdx],
        ...movieData,
        updated_at: new Date().toISOString()
      };
      this.save();
      return this.data.movieList[existingIdx];
    } else {
      const newMovie = {
        ...movieData,
        id: movieData.id || `movie-${Date.now()}`,
        slug: (movieData.title || 'movie').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        view_count: movieData.view_count || 0,
        created_at: new Date().toISOString()
      };
      this.data.movieList.unshift(newMovie);
      this.save();
      return newMovie;
    }
  }

  public deleteMovie(id: string) {
    this.data.movieList = this.data.movieList.filter((m) => m.id !== id);
    this.save();
  }

  // Hero Banners
  public saveHeroBanner(bannerData: any) {
    const existingIdx = this.data.heroBanners.findIndex((b) => b.id === bannerData.id);
    if (existingIdx >= 0) {
      this.data.heroBanners[existingIdx] = { ...this.data.heroBanners[existingIdx], ...bannerData };
      this.save();
      return this.data.heroBanners[existingIdx];
    } else {
      const newBanner = {
        ...bannerData,
        id: bannerData.id || `hb-${Date.now()}`
      };
      this.data.heroBanners.push(newBanner);
      this.save();
      return newBanner;
    }
  }

  public deleteHeroBanner(id: string) {
    this.data.heroBanners = this.data.heroBanners.filter((b) => b.id !== id);
    this.save();
  }

  // Sections
  public saveSection(secData: any) {
    const existingIdx = this.data.homepageSections.findIndex((s) => s.id === secData.id);
    if (existingIdx >= 0) {
      this.data.homepageSections[existingIdx] = { ...this.data.homepageSections[existingIdx], ...secData };
      this.save();
      return this.data.homepageSections[existingIdx];
    } else {
      const newSec = {
        ...secData,
        id: secData.id || `sec-${Date.now()}`
      };
      this.data.homepageSections.push(newSec);
      this.save();
      return newSec;
    }
  }

  public deleteSection(id: string) {
    this.data.homepageSections = this.data.homepageSections.filter((s) => s.id !== id);
    this.save();
  }

  // Categories
  public saveCategory(catData: any) {
    const existingIdx = this.data.categories.findIndex((c) => c.id === catData.id);
    if (existingIdx >= 0) {
      this.data.categories[existingIdx] = { ...this.data.categories[existingIdx], ...catData };
      this.save();
      return this.data.categories[existingIdx];
    } else {
      const newCat = {
        ...catData,
        id: catData.id || `cat-${Date.now()}`
      };
      this.data.categories.push(newCat);
      this.save();
      return newCat;
    }
  }

  public deleteCategory(id: string) {
    this.data.categories = this.data.categories.filter((c) => c.id !== id);
    this.save();
  }

  // Settings
  public saveSettings(settingsData: any) {
    this.data.appSettings = { ...this.data.appSettings, ...settingsData };
    this.save();
    return this.data.appSettings;
  }

  // Reset to default seed catalog
  public resetToSeeds() {
    this.data.animeList = JSON.parse(JSON.stringify(SEED_ANIME));
    this.data.movieList = JSON.parse(JSON.stringify(SEED_MOVIES));
    this.data.heroBanners = JSON.parse(JSON.stringify(SEED_HERO_BANNERS));
    this.data.homepageSections = JSON.parse(JSON.stringify(DEFAULT_SECTIONS));
    this.data.categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
    this.data.appSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    this.save();
    return this.data;
  }

  // Import full JSON
  public importFull(newDb: any) {
    if (newDb && Array.isArray(newDb.animeList)) {
      this.data.animeList = newDb.animeList;
      if (Array.isArray(newDb.movieList)) this.data.movieList = newDb.movieList;
      if (Array.isArray(newDb.heroBanners)) this.data.heroBanners = newDb.heroBanners;
      if (Array.isArray(newDb.homepageSections)) this.data.homepageSections = newDb.homepageSections;
      if (Array.isArray(newDb.categories)) this.data.categories = newDb.categories;
      if (newDb.appSettings) this.data.appSettings = newDb.appSettings;
      this.save();
    }
    return this.data;
  }

  // Helper: Build live home view for all user devices
  public getPopulatedHome() {
    const activeCategories = this.data.categories
      .filter((c) => c.is_enabled)
      .sort((a, b) => a.display_order - b.display_order);

    const activeHeroBanners = this.data.heroBanners
      .filter((b) => b.is_enabled)
      .sort((a, b) => a.display_order - b.display_order)
      .slice(0, this.data.appSettings?.maxHeroBanners || 5);

    const populatedSections = this.data.homepageSections
      .filter((sec) => sec.is_enabled)
      .sort((a, b) => a.display_order - b.display_order)
      .map((sec) => {
        let items: any[] = [];
        if (sec.section_type === 'new_episodes') {
          items = [...this.data.animeList].filter((a) => a.is_published).slice(0, sec.max_items || 8);
        } else if (sec.section_type === 'trending') {
          items = [...this.data.animeList, ...this.data.movieList]
            .filter((item) => item.is_published)
            .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
            .slice(0, sec.max_items || 8);
        } else if (sec.section_type === 'popular_movies') {
          items = [...this.data.movieList].filter((m) => m.is_published).slice(0, sec.max_items || 8);
        } else if (sec.section_type === 'genre_curated') {
          items = [...this.data.animeList, ...this.data.movieList]
            .filter((item) => item.is_published && (item.genres?.includes('Action') || item.genres?.includes('Sci-Fi')))
            .slice(0, sec.max_items || 8);
        } else {
          items = [...this.data.animeList, ...this.data.movieList].filter((item) => item.is_published).slice(0, sec.max_items || 8);
        }
        return { ...sec, items };
      });

    return {
      categories: activeCategories,
      heroBanners: activeHeroBanners,
      homepageSections: populatedSections,
      settings: this.data.appSettings,
      sync_id: this.data.databaseMeta?.sync_id || `sync_${Date.now()}`
    };
  }
}

export const db = new DatabaseManager();
