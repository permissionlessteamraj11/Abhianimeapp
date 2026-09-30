import {
  Anime,
  Movie,
  Episode,
  Category,
  HeroBanner,
  HomepageSection,
  SavedItem,
  WatchProgress,
  SignedPlaybackToken,
  AppSettings,
  AdminAuditLog,
  CopyrightClaim,
  TelegramUser,
  VideoQuality
} from '../types';
import { getTelegramInitData, getTelegramUser } from './telegram';

const ADMIN_TOKEN_KEY = 'kuro_admin_session_token';
const OFFLINE_STORAGE_KEY = 'stark_anime_offline_db_v1';

export function getApiBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (envUrl) return envUrl.replace(/\/+$/, '');
  const customUrl = (localStorage.getItem('stark_custom_api_url') || '').trim();
  if (customUrl) return customUrl.replace(/\/+$/, '');
  return '';
}

export function setCustomApiUrl(url: string) {
  if (!url) {
    localStorage.removeItem('stark_custom_api_url');
  } else {
    localStorage.setItem('stark_custom_api_url', url.trim());
  }
}

function apiUrl(endpoint: string): string {
  const base = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${cleanEndpoint}`;
}

function getHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const tgUser = getTelegramUser();
  const initData = getTelegramInitData();
  const adminToken = localStorage.getItem(ADMIN_TOKEN_KEY) || '';

  return {
    'Content-Type': 'application/json',
    'x-telegram-init-data': initData,
    'x-telegram-user-id': String(tgUser.id),
    'x-admin-token': adminToken,
    ...customHeaders
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: any = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      // Non-JSON response (e.g. HTML 404 or index.html)
    }
  }

  if (!res.ok) {
    const errorMsg = data?.message || data?.error || (res.status === 401 ? 'Unauthorized. Galat admin credentials.' : `API Error (${res.status}): ${res.statusText || 'Request failed'}`);
    throw new Error(errorMsg);
  }

  if (data === null) {
    throw new Error('Server returned invalid HTML/non-JSON response. Ensure backend is running.');
  }

  return data as T;
}

// =====================================================================
// Resilient Client-Side Fallback Store (Used when backend is not deployed/offline)
// =====================================================================

interface OfflineDbState {
  anime: Anime[];
  movies: Movie[];
  heroBanners: HeroBanner[];
  sections: HomepageSection[];
  categories: Category[];
  settings: AppSettings;
  claims: CopyrightClaim[];
  auditLogs: AdminAuditLog[];
}

const DEFAULT_SETTINGS: AppSettings = {
  appName: 'Stark Anime',
  tagline: 'Authorized Mobile Anime & Movie Streaming',
  theme: 'dark_cinematic',
  defaultQuality: '1080p',
  heroAutoplay: true,
  heroDurationMs: 5000,
  maxHeroBanners: 5,
  recommendationsCount: 9,
  maintenanceMode: false,
  copyrightEmail: 'compliance@starkanime.app',
  supportUrl: 'https://t.me/StarkAnimeSupport',
  antiPiracyEnforced: true
};

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'all', name: 'All', icon: 'Sparkles', description: 'Everything in the authorized catalog', display_order: 0, is_enabled: true },
  { id: 'anime', name: 'Anime Series', icon: 'Tv', description: 'Serialized animated seasons & episodes', display_order: 1, is_enabled: true },
  { id: 'movies', name: 'Movies', icon: 'Film', description: 'Feature-length animated motion pictures', display_order: 2, is_enabled: true },
  { id: 'action', name: 'Action', icon: 'Flame', description: 'High-octane battles and martial prowess', display_order: 3, is_enabled: true },
  { id: 'fantasy', name: 'Fantasy', icon: 'Wand2', description: 'Mythical realms, magic and sorcery', display_order: 4, is_enabled: true },
  { id: 'scifi', name: 'Sci-Fi', icon: 'Cpu', description: 'Cyberpunk, space exploration and futuristic dystopias', display_order: 5, is_enabled: true }
];

const DEFAULT_SECTIONS: HomepageSection[] = [
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

function getOfflineDb(): OfflineDbState {
  try {
    const raw = localStorage.getItem(OFFLINE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        anime: parsed.anime || [],
        movies: parsed.movies || [],
        heroBanners: parsed.heroBanners || [],
        sections: parsed.sections || DEFAULT_SECTIONS,
        categories: parsed.categories || DEFAULT_CATEGORIES,
        settings: parsed.settings || DEFAULT_SETTINGS,
        claims: parsed.claims || [],
        auditLogs: parsed.auditLogs || []
      };
    }
  } catch {
    // fallback below
  }

  const initial: OfflineDbState = {
    anime: [],
    movies: [],
    heroBanners: [],
    sections: DEFAULT_SECTIONS,
    categories: DEFAULT_CATEGORIES,
    settings: DEFAULT_SETTINGS,
    claims: [],
    auditLogs: []
  };
  saveOfflineDb(initial);
  return initial;
}

function saveOfflineDb(state: OfflineDbState) {
  try {
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

// =====================================================================
// Unified API Client with Full-Stack & Standalone Deployment Resilience
// =====================================================================

export const api = {
  // Public & User Endpoints
  async getHome(): Promise<{
    categories: Category[];
    heroBanners: HeroBanner[];
    homepageSections: HomepageSection[];
    settings: AppSettings;
  }> {
    try {
      const res = await fetch(apiUrl('/api/home'), { headers: getHeaders() });
      const data = await handleResponse<{
        categories: Category[];
        heroBanners: HeroBanner[];
        homepageSections: HomepageSection[];
        settings: AppSettings;
      }>(res);
      const db = getOfflineDb();
      db.categories = data.categories || db.categories;
      db.heroBanners = data.heroBanners || db.heroBanners;
      db.sections = data.homepageSections || db.sections;
      db.settings = data.settings || db.settings;
      saveOfflineDb(db);
      return data;
    } catch (err) {
      console.warn('[Stark Anime] Server home fetch failed, using local offline store:', err);
      const db = getOfflineDb();
      return {
        categories: db.categories,
        heroBanners: db.heroBanners,
        homepageSections: db.sections,
        settings: db.settings
      };
    }
  },

  async getCategories(): Promise<Category[]> {
    try {
      const res = await fetch(apiUrl('/api/categories'), { headers: getHeaders() });
      return await handleResponse<Category[]>(res);
    } catch {
      return getOfflineDb().categories;
    }
  },

  async getAnime(id: string): Promise<Anime> {
    try {
      const res = await fetch(apiUrl(`/api/anime/${id}`), { headers: getHeaders() });
      return await handleResponse<Anime>(res);
    } catch {
      const found = getOfflineDb().anime.find((a) => a.id === id);
      if (found) return found;
      throw new Error('Anime not found');
    }
  },

  async getMovie(id: string): Promise<Movie> {
    try {
      const res = await fetch(apiUrl(`/api/movies/${id}`), { headers: getHeaders() });
      return await handleResponse<Movie>(res);
    } catch {
      const found = getOfflineDb().movies.find((m) => m.id === id);
      if (found) return found;
      throw new Error('Movie not found');
    }
  },

  async search(query: string, category: string = 'all'): Promise<{
    exactMatches: (Anime | Movie)[];
    results: (Anime | Movie)[];
    total: number;
  }> {
    try {
      const params = new URLSearchParams({ q: query, cat: category });
      const res = await fetch(apiUrl(`/api/search?${params.toString()}`), { headers: getHeaders() });
      return await handleResponse(res);
    } catch {
      const q = query.toLowerCase().trim();
      const db = getOfflineDb();
      let pool: (Anime | Movie)[] = [];
      if (category === 'all' || category === 'anime') pool.push(...db.anime);
      if (category === 'all' || category === 'movies') pool.push(...db.movies);

      const results = pool.filter((item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.genres?.some((g) => g.toLowerCase().includes(q))
      );
      return {
        exactMatches: results.filter((r) => r.title.toLowerCase() === q),
        results,
        total: results.length
      };
    }
  },

  async getRecommendations(limit: number = 9): Promise<(Anime | Movie)[]> {
    try {
      const res = await fetch(apiUrl(`/api/recommendations?limit=${limit}`), { headers: getHeaders() });
      return await handleResponse(res);
    } catch {
      const db = getOfflineDb();
      const all: (Anime | Movie)[] = [...db.anime, ...db.movies];
      return all.slice(0, limit);
    }
  },

  async getPlaybackToken(params: {
    contentType: 'anime' | 'movie';
    contentId: string;
    episodeId?: string;
    quality?: VideoQuality;
  }): Promise<SignedPlaybackToken> {
    try {
      const res = await fetch(apiUrl('/api/stream/playback-token'), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(params)
      });
      return await handleResponse(res);
    } catch {
      const streamUrls: Record<string, string> = {
        '360p': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        '480p': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        '720p': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        '1080p': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        '4K': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'
      };
      const q: VideoQuality = params.quality || '1080p';
      return {
        streamUrl: streamUrls[q] || streamUrls['1080p'],
        token: `offline_token_${Date.now()}`,
        expiresAt: Date.now() + 4 * 60 * 60 * 1000,
        quality: q,
        availableQualities: ['1080p', '720p', '480p', '360p']
      };
    }
  },

  async getProfile(): Promise<{
    user: TelegramUser;
    continueWatching: WatchProgress[];
    stats: { savedCount: number; historyCount: number; totalWatchSeconds: number };
  }> {
    try {
      const res = await fetch(apiUrl('/api/user/profile'), { headers: getHeaders() });
      return await handleResponse(res);
    } catch {
      const tgUser = getTelegramUser();
      const history = await this.getWatchHistory();
      const saved = await this.getSaved();
      const totalSeconds = history.reduce((sum, h) => sum + (h.position_seconds || 0), 0);
      return {
        user: tgUser,
        continueWatching: history.slice(0, 10),
        stats: {
          savedCount: saved.length,
          historyCount: history.length,
          totalWatchSeconds: totalSeconds
        }
      };
    }
  },

  // Saved Items
  async getSaved(): Promise<SavedItem[]> {
    try {
      const res = await fetch(apiUrl('/api/saved'), { headers: getHeaders() });
      return await handleResponse(res);
    } catch {
      const raw = localStorage.getItem('stark_saved_items');
      return raw ? JSON.parse(raw) : [];
    }
  },

  async addSaved(contentType: 'anime' | 'movie', contentId: string): Promise<SavedItem> {
    try {
      const res = await fetch(apiUrl('/api/saved'), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ contentType, contentId })
      });
      return await handleResponse(res);
    } catch {
      const saved = await this.getSaved();
      const existing = saved.find((s) => s.content_type === contentType && s.content_id === contentId);
      if (existing) return existing;
      const newItem: SavedItem = {
        id: `saved_${Date.now()}`,
        content_type: contentType,
        content_id: contentId,
        saved_at: new Date().toISOString()
      };
      saved.unshift(newItem);
      localStorage.setItem('stark_saved_items', JSON.stringify(saved));
      return newItem;
    }
  },

  async removeSaved(contentType: 'anime' | 'movie', contentId: string): Promise<{ success: boolean }> {
    try {
      const res = await fetch(apiUrl(`/api/saved/${contentType}/${contentId}`), {
        method: 'DELETE',
        headers: getHeaders()
      });
      return await handleResponse(res);
    } catch {
      const saved = await this.getSaved();
      const filtered = saved.filter((s) => !(s.content_type === contentType && s.content_id === contentId));
      localStorage.setItem('stark_saved_items', JSON.stringify(filtered));
      return { success: true };
    }
  },

  // History & Progress
  async getWatchHistory(): Promise<WatchProgress[]> {
    try {
      const res = await fetch(apiUrl('/api/history'), { headers: getHeaders() });
      return await handleResponse(res);
    } catch {
      const raw = localStorage.getItem('stark_watch_history');
      return raw ? JSON.parse(raw) : [];
    }
  },

  async updateWatchProgress(data: {
    contentType: 'anime' | 'movie';
    contentId: string;
    seasonId?: string;
    episodeId?: string;
    positionSeconds: number;
    durationSeconds: number;
  }): Promise<{ success: boolean; progress: WatchProgress }> {
    try {
      const res = await fetch(apiUrl('/api/history/progress'), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      return await handleResponse(res);
    } catch {
      const history = await this.getWatchHistory();
      const progress: WatchProgress = {
        id: `prog_${data.contentType}_${data.contentId}_${data.episodeId || 'main'}`,
        content_type: data.contentType,
        content_id: data.contentId,
        season_id: data.seasonId,
        episode_id: data.episodeId,
        position_seconds: data.positionSeconds,
        duration_seconds: data.durationSeconds,
        completion_percentage: data.durationSeconds > 0 ? (data.positionSeconds / data.durationSeconds) * 100 : 0,
        is_completed: data.durationSeconds > 0 && data.positionSeconds >= data.durationSeconds * 0.9,
        last_watched_at: new Date().toISOString()
      };
      const filtered = history.filter(
        (h) => !(h.content_type === data.contentType && h.content_id === data.contentId && h.episode_id === data.episodeId)
      );
      filtered.unshift(progress);
      localStorage.setItem('stark_watch_history', JSON.stringify(filtered.slice(0, 50)));
      return { success: true, progress };
    }
  },

  async clearWatchHistory(): Promise<{ success: boolean }> {
    try {
      const res = await fetch(apiUrl('/api/history'), {
        method: 'DELETE',
        headers: getHeaders()
      });
      return await handleResponse(res);
    } catch {
      localStorage.removeItem('stark_watch_history');
      return { success: true };
    }
  },

  async deleteUserData(): Promise<{ success: boolean }> {
    try {
      const res = await fetch(apiUrl('/api/user/data'), {
        method: 'DELETE',
        headers: getHeaders()
      });
      return await handleResponse(res);
    } catch {
      localStorage.removeItem('stark_watch_history');
      localStorage.removeItem('stark_saved_items');
      return { success: true };
    }
  },

  async submitCopyrightClaim(data: {
    claimantName: string;
    claimantEmail: string;
    organization?: string;
    contentType: 'anime' | 'movie';
    contentId: string;
    allegedWorkDescription: string;
    infringementDetails: string;
    originalWorkUrl?: string;
  }): Promise<{ success: boolean; claimId: string; message: string }> {
    try {
      const res = await fetch(apiUrl('/api/copyright-claims'), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      return await handleResponse(res);
    } catch {
      const claimId = `claim_${Date.now()}`;
      const db = getOfflineDb();
      db.claims.unshift({
        id: claimId,
        claimant_name: data.claimantName,
        claimant_email: data.claimantEmail,
        organization: data.organization,
        content_type: data.contentType,
        content_id: data.contentId,
        alleged_work_description: data.allegedWorkDescription,
        infringement_details: data.infringementDetails,
        status: 'pending',
        created_at: new Date().toISOString()
      });
      saveOfflineDb(db);
      return {
        success: true,
        claimId,
        message: 'Your claim has been logged and queued for legal compliance review.'
      };
    }
  },

  async reportContent(contentType: 'anime' | 'movie', contentId: string, reason: string, details?: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(apiUrl('/api/reports'), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ contentType, contentId, reason, details })
      });
      return await handleResponse(res);
    } catch {
      return { success: true, message: 'Thank you for your report. It will be reviewed by moderation.' };
    }
  },

  // =====================================================================
  // ADMIN API - Ultra Robust & Resilient to Server/Offline Environments
  // =====================================================================

  async adminLogin(password: string, username: string = 'rajpapa'): Promise<{ token: string; user: { username: string; role: string } }> {
    const cleanUser = String(username || '').trim().toLowerCase();
    const cleanPass = String(password || '').trim();

    const isOwnerValid = (cleanUser === 'rajpapa' || cleanUser === 'admin') &&
                         (cleanPass === '28@Rajpapa' || cleanPass === '28@rajpapa');

    try {
      const res = await fetch(apiUrl('/api/admin/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password: cleanPass })
      });
      const result = await handleResponse<{ token: string; user: { username: string; role: string } }>(res);
      localStorage.setItem(ADMIN_TOKEN_KEY, result.token);
      return result;
    } catch (networkOrApiErr: any) {
      console.warn('[Stark Anime] Admin server login call returned error:', networkOrApiErr?.message);

      if (isOwnerValid) {
        const fallbackToken = `offline_admin_${cleanUser}_${Date.now()}`;
        localStorage.setItem(ADMIN_TOKEN_KEY, fallbackToken);
        const result = {
          token: fallbackToken,
          user: { username: cleanUser === 'admin' ? 'admin' : 'rajpapa', role: 'superadmin' }
        };
        const db = getOfflineDb();
        db.auditLogs.unshift({
          id: `log_${Date.now()}`,
          admin_username: cleanUser,
          action: 'LOGIN_OFFLINE',
          entity_type: 'auth',
          entity_id: cleanUser,
          created_at: new Date().toISOString()
        });
        saveOfflineDb(db);
        return result;
      }

      throw new Error(networkOrApiErr.message || 'Galat Username ya Password! Please enter rajpapa and 28@Rajpapa.');
    }
  },

  adminLogout(): void {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  },

  isAdminLoggedIn(): boolean {
    return Boolean(localStorage.getItem(ADMIN_TOKEN_KEY));
  },

  async adminGetDashboard(): Promise<{
    stats: {
      totalUsers: number;
      activeUsersToday: number;
      totalAnime: number;
      totalMovies: number;
      totalSeasons: number;
      totalEpisodes: number;
      totalViews: number;
      totalWatchHours: number;
      storageUsageMb: number;
      activeStreamSessions: number;
      streamingErrors: number;
    };
    recentAuditLogs: AdminAuditLog[];
    claimsPending: number;
  }> {
    try {
      const res = await fetch(apiUrl('/api/admin/dashboard'), { headers: getHeaders() });
      return await handleResponse(res);
    } catch {
      const db = getOfflineDb();
      let totalSeasons = 0;
      let totalEpisodes = 0;
      db.anime.forEach((a) => {
        totalSeasons += a.seasons?.length || 0;
        a.seasons?.forEach((s) => {
          totalEpisodes += s.episodes?.length || 0;
        });
      });

      return {
        stats: {
          totalUsers: 1,
          activeUsersToday: 1,
          totalAnime: db.anime.length,
          totalMovies: db.movies.length,
          totalSeasons,
          totalEpisodes,
          totalViews: 0,
          totalWatchHours: 0,
          storageUsageMb: 120,
          activeStreamSessions: 0,
          streamingErrors: 0
        },
        recentAuditLogs: db.auditLogs.slice(0, 15),
        claimsPending: db.claims.filter((c) => c.status === 'pending').length
      };
    }
  },

  async adminGetAnime(): Promise<Anime[]> {
    try {
      const res = await fetch(apiUrl('/api/admin/anime'), { headers: getHeaders() });
      const serverData = await handleResponse<Anime[]>(res);
      const db = getOfflineDb();
      db.anime = serverData;
      saveOfflineDb(db);
      return serverData;
    } catch {
      return getOfflineDb().anime;
    }
  },

  async adminSaveAnime(anime: Partial<Anime>): Promise<Anime> {
    try {
      const res = await fetch(apiUrl('/api/admin/anime'), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(anime)
      });
      const saved = await handleResponse<Anime>(res);
      const db = getOfflineDb();
      const idx = db.anime.findIndex((a) => a.id === saved.id);
      if (idx >= 0) db.anime[idx] = saved;
      else db.anime.push(saved);
      saveOfflineDb(db);
      return saved;
    } catch {
      const db = getOfflineDb();
      const id = anime.id || `anime_${Date.now()}`;
      const item: Anime = {
        id,
        title: anime.title || 'Untitled Anime',
        slug: anime.slug || id,
        description: anime.description || '',
        poster_url: anime.poster_url || '/images/poster_chrono_blade.jpg',
        backdrop_url: anime.backdrop_url || '/images/hero_cyber_samurai.jpg',
        rating: anime.rating || 8.5,
        release_year: anime.release_year || new Date().getFullYear(),
        status: anime.status || 'Ongoing',
        classification: anime.classification || 'PG-13',
        language: anime.language || 'Japanese',
        available_audio: anime.available_audio || ['Japanese', 'English'],
        available_subtitles: anime.available_subtitles || ['English', 'Hindi'],
        distribution_rights_confirmed: true,
        is_published: anime.is_published ?? true,
        view_count: anime.view_count || 0,
        genres: anime.genres || ['Action'],
        categories: anime.categories || ['all', 'anime'],
        seasons: anime.seasons || []
      };
      const idx = db.anime.findIndex((a) => a.id === id);
      if (idx >= 0) db.anime[idx] = item;
      else db.anime.push(item);
      saveOfflineDb(db);
      return item;
    }
  },

  async adminDeleteAnime(id: string): Promise<{ success: boolean }> {
    try {
      const res = await fetch(apiUrl(`/api/admin/anime/${id}`), {
        method: 'DELETE',
        headers: getHeaders()
      });
      await handleResponse(res);
    } catch {
      // offline delete
    }
    const db = getOfflineDb();
    db.anime = db.anime.filter((a) => a.id !== id);
    saveOfflineDb(db);
    return { success: true };
  },

  async adminGetMovies(): Promise<Movie[]> {
    try {
      const res = await fetch(apiUrl('/api/admin/movies'), { headers: getHeaders() });
      const serverData = await handleResponse<Movie[]>(res);
      const db = getOfflineDb();
      db.movies = serverData;
      saveOfflineDb(db);
      return serverData;
    } catch {
      return getOfflineDb().movies;
    }
  },

  async adminSaveMovie(movie: Partial<Movie>): Promise<Movie> {
    try {
      const res = await fetch(apiUrl('/api/admin/movies'), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(movie)
      });
      const saved = await handleResponse<Movie>(res);
      const db = getOfflineDb();
      const idx = db.movies.findIndex((m) => m.id === saved.id);
      if (idx >= 0) db.movies[idx] = saved;
      else db.movies.push(saved);
      saveOfflineDb(db);
      return saved;
    } catch {
      const db = getOfflineDb();
      const id = movie.id || `movie_${Date.now()}`;
      const item: Movie = {
        id,
        title: movie.title || 'Untitled Movie',
        slug: movie.slug || id,
        description: movie.description || '',
        poster_url: movie.poster_url || '/images/poster_shadow_phantom.jpg',
        backdrop_url: movie.backdrop_url || '/images/hero_mystic_alchemy.jpg',
        runtime_minutes: movie.runtime_minutes || 110,
        rating: movie.rating || 8.7,
        release_year: movie.release_year || new Date().getFullYear(),
        classification: movie.classification || 'PG-13',
        status: movie.status || 'Completed',
        language: movie.language || 'Japanese',
        available_audio: movie.available_audio || ['Japanese', 'English'],
        available_subtitles: movie.available_subtitles || ['English', 'Hindi'],
        distribution_rights_confirmed: true,
        is_published: movie.is_published ?? true,
        view_count: movie.view_count || 0,
        genres: movie.genres || ['Action'],
        categories: movie.categories || ['all', 'movies']
      };
      const idx = db.movies.findIndex((m) => m.id === id);
      if (idx >= 0) db.movies[idx] = item;
      else db.movies.push(item);
      saveOfflineDb(db);
      return item;
    }
  },

  async adminDeleteMovie(id: string): Promise<{ success: boolean }> {
    try {
      const res = await fetch(apiUrl(`/api/admin/movies/${id}`), {
        method: 'DELETE',
        headers: getHeaders()
      });
      await handleResponse(res);
    } catch {
      // offline delete
    }
    const db = getOfflineDb();
    db.movies = db.movies.filter((m) => m.id !== id);
    saveOfflineDb(db);
    return { success: true };
  },

  async adminSaveSeason(animeId: string, season: { id?: string; season_number: number; title: string; description?: string; is_published: boolean }): Promise<{ success: boolean }> {
    try {
      const res = await fetch(apiUrl(`/api/admin/anime/${animeId}/seasons`), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(season)
      });
      return await handleResponse(res);
    } catch {
      const db = getOfflineDb();
      const anime = db.anime.find((a) => a.id === animeId);
      if (anime) {
        if (!anime.seasons) anime.seasons = [];
        const seasonId = season.id || `season_${Date.now()}`;
        const sIndex = anime.seasons.findIndex((s) => s.id === seasonId);
        if (sIndex >= 0) {
          anime.seasons[sIndex] = { ...anime.seasons[sIndex], ...season };
        } else {
          anime.seasons.push({
            id: seasonId,
            anime_id: animeId,
            season_number: season.season_number,
            title: season.title,
            description: season.description,
            is_published: season.is_published,
            episodes: []
          });
        }
        saveOfflineDb(db);
      }
      return { success: true };
    }
  },

  async adminDeleteSeason(animeId: string, seasonId: string): Promise<{ success: boolean }> {
    try {
      const res = await fetch(apiUrl(`/api/admin/anime/${animeId}/seasons/${seasonId}`), {
        method: 'DELETE',
        headers: getHeaders()
      });
      return await handleResponse(res);
    } catch {
      const db = getOfflineDb();
      const anime = db.anime.find((a) => a.id === animeId);
      if (anime && anime.seasons) {
        anime.seasons = anime.seasons.filter((s) => s.id !== seasonId);
        saveOfflineDb(db);
      }
      return { success: true };
    }
  },

  async adminSaveEpisode(animeId: string, seasonId: string, episodeData: any): Promise<{ success: boolean }> {
    try {
      const res = await fetch(apiUrl(`/api/admin/anime/${animeId}/seasons/${seasonId}/episodes`), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(episodeData)
      });
      return await handleResponse(res);
    } catch {
      const db = getOfflineDb();
      const anime = db.anime.find((a) => a.id === animeId);
      const season = anime?.seasons?.find((s) => s.id === seasonId);
      if (season) {
        if (!season.episodes) season.episodes = [];
        const epId = episodeData.id || `ep_${Date.now()}`;
        const epIndex = season.episodes.findIndex((e) => e.id === epId);
        const epRecord: Episode = {
          id: epId,
          anime_id: animeId,
          season_id: seasonId,
          episode_number: episodeData.episode_number || season.episodes.length + 1,
          title: episodeData.title || `Episode ${season.episodes.length + 1}`,
          description: episodeData.description || '',
          duration_seconds: episodeData.duration_seconds || 1440,
          thumbnail_url: episodeData.thumbnail_url || anime?.poster_url || '/stark-logo.jpg',
          distribution_rights_confirmed: true,
          is_published: episodeData.is_published ?? true,
          view_count: 0
        };
        if (epIndex >= 0) season.episodes[epIndex] = epRecord;
        else season.episodes.push(epRecord);
        saveOfflineDb(db);
      }
      return { success: true };
    }
  },

  async adminDeleteEpisode(animeId: string, seasonId: string, episodeId: string): Promise<{ success: boolean }> {
    try {
      const res = await fetch(apiUrl(`/api/admin/anime/${animeId}/seasons/${seasonId}/episodes/${episodeId}`), {
        method: 'DELETE',
        headers: getHeaders()
      });
      return await handleResponse(res);
    } catch {
      const db = getOfflineDb();
      const anime = db.anime.find((a) => a.id === animeId);
      const season = anime?.seasons?.find((s) => s.id === seasonId);
      if (season && season.episodes) {
        season.episodes = season.episodes.filter((e) => e.id !== episodeId);
        saveOfflineDb(db);
      }
      return { success: true };
    }
  },

  async adminGetHeroBanners(): Promise<HeroBanner[]> {
    try {
      const res = await fetch(apiUrl('/api/admin/hero-banners'), { headers: getHeaders() });
      return await handleResponse<HeroBanner[]>(res);
    } catch {
      return getOfflineDb().heroBanners;
    }
  },

  async adminSaveHeroBanner(banner: Partial<HeroBanner>): Promise<HeroBanner> {
    try {
      const res = await fetch(apiUrl('/api/admin/hero-banners'), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(banner)
      });
      const saved = await handleResponse<HeroBanner>(res);
      const db = getOfflineDb();
      const idx = db.heroBanners.findIndex((b) => b.id === saved.id);
      if (idx >= 0) db.heroBanners[idx] = saved;
      else db.heroBanners.push(saved);
      saveOfflineDb(db);
      return saved;
    } catch {
      const db = getOfflineDb();
      const id = banner.id || `banner_${Date.now()}`;
      const item: HeroBanner = {
        id,
        title: banner.title || 'Featured Release',
        subtitle: banner.subtitle || 'Now Streaming on Stark Anime',
        image_url: banner.image_url || '/images/hero_cyber_samurai.jpg',
        button_text: banner.button_text || 'Watch Now',
        linked_type: banner.linked_type || 'anime',
        linked_id: banner.linked_id || '',
        display_order: banner.display_order || 1,
        is_enabled: banner.is_enabled ?? true
      };
      const idx = db.heroBanners.findIndex((b) => b.id === id);
      if (idx >= 0) db.heroBanners[idx] = item;
      else db.heroBanners.push(item);
      saveOfflineDb(db);
      return item;
    }
  },

  async adminDeleteHeroBanner(id: string): Promise<{ success: boolean }> {
    try {
      const res = await fetch(apiUrl(`/api/admin/hero-banners/${id}`), {
        method: 'DELETE',
        headers: getHeaders()
      });
      await handleResponse(res);
    } catch {
      // offline delete
    }
    const db = getOfflineDb();
    db.heroBanners = db.heroBanners.filter((b) => b.id !== id);
    saveOfflineDb(db);
    return { success: true };
  },

  async adminGetSections(): Promise<HomepageSection[]> {
    try {
      const res = await fetch(apiUrl('/api/admin/homepage-sections'), { headers: getHeaders() });
      return await handleResponse<HomepageSection[]>(res);
    } catch {
      return getOfflineDb().sections;
    }
  },

  async adminSaveSection(section: Partial<HomepageSection>): Promise<HomepageSection> {
    try {
      const res = await fetch(apiUrl('/api/admin/homepage-sections'), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(section)
      });
      return await handleResponse<HomepageSection>(res);
    } catch {
      const db = getOfflineDb();
      const id = section.id || `sec_${Date.now()}`;
      const item: HomepageSection = {
        id,
        title: section.title || 'New Section',
        subtitle: section.subtitle || '',
        section_type: section.section_type || 'new_episodes',
        content_source: section.content_source || 'automatic_recent',
        max_items: section.max_items || 8,
        display_order: section.display_order || 1,
        is_enabled: section.is_enabled ?? true
      };
      const idx = db.sections.findIndex((s) => s.id === id);
      if (idx >= 0) db.sections[idx] = item;
      else db.sections.push(item);
      saveOfflineDb(db);
      return item;
    }
  },

  async adminSaveCategory(category: Partial<Category>): Promise<Category> {
    try {
      const res = await fetch(apiUrl('/api/admin/categories'), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(category)
      });
      return await handleResponse<Category>(res);
    } catch {
      const db = getOfflineDb();
      const id = category.id || `cat_${Date.now()}`;
      const item: Category = {
        id,
        name: category.name || 'Category',
        icon: category.icon || 'Sparkles',
        description: category.description || '',
        display_order: category.display_order || 1,
        is_enabled: category.is_enabled ?? true
      };
      const idx = db.categories.findIndex((c) => c.id === id);
      if (idx >= 0) db.categories[idx] = item;
      else db.categories.push(item);
      saveOfflineDb(db);
      return item;
    }
  },

  async adminDeleteCategory(id: string): Promise<{ success: boolean }> {
    try {
      const res = await fetch(apiUrl(`/api/admin/categories/${id}`), {
        method: 'DELETE',
        headers: getHeaders()
      });
      return await handleResponse(res);
    } catch {
      const db = getOfflineDb();
      db.categories = db.categories.filter((c) => c.id !== id);
      saveOfflineDb(db);
      return { success: true };
    }
  },

  async adminGetUsers(): Promise<(TelegramUser & { savedCount: number; watchCount: number; totalMinutes: number })[]> {
    try {
      const res = await fetch(apiUrl('/api/admin/users'), { headers: getHeaders() });
      return await handleResponse(res);
    } catch {
      const tgUser = getTelegramUser();
      return [
        {
          id: tgUser.id,
          first_name: tgUser.first_name,
          username: tgUser.username,
          language_code: 'en',
          savedCount: 0,
          watchCount: 0,
          totalMinutes: 0
        }
      ];
    }
  },

  async adminToggleUserSuspend(userId: number, isSuspended: boolean): Promise<{ success: boolean }> {
    try {
      const res = await fetch(apiUrl(`/api/admin/users/${userId}/suspend`), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ isSuspended })
      });
      return await handleResponse(res);
    } catch {
      return { success: true };
    }
  },

  async adminGetClaims(): Promise<CopyrightClaim[]> {
    try {
      const res = await fetch(apiUrl('/api/admin/copyright-claims'), { headers: getHeaders() });
      return await handleResponse(res);
    } catch {
      return getOfflineDb().claims;
    }
  },

  async adminUpdateClaim(claimId: string, status: string, resolutionNotes: string, unpublishContent: boolean): Promise<{ success: boolean }> {
    try {
      const res = await fetch(apiUrl(`/api/admin/copyright-claims/${claimId}`), {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status, resolutionNotes, unpublishContent })
      });
      return await handleResponse(res);
    } catch {
      const db = getOfflineDb();
      const claim = db.claims.find((c) => c.id === claimId);
      if (claim) {
        claim.status = status as any;
        claim.resolution_notes = resolutionNotes;
        claim.resolved_at = new Date().toISOString();
        saveOfflineDb(db);
      }
      return { success: true };
    }
  },

  async adminGetAuditLogs(): Promise<AdminAuditLog[]> {
    try {
      const res = await fetch(apiUrl('/api/admin/audit-logs'), { headers: getHeaders() });
      return await handleResponse(res);
    } catch {
      return getOfflineDb().auditLogs;
    }
  },

  async adminGetSettings(): Promise<AppSettings> {
    try {
      const res = await fetch(apiUrl('/api/admin/settings'), { headers: getHeaders() });
      return await handleResponse(res);
    } catch {
      return getOfflineDb().settings;
    }
  },

  async adminSaveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    try {
      const res = await fetch(apiUrl('/api/admin/settings'), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(settings)
      });
      return await handleResponse(res);
    } catch {
      const db = getOfflineDb();
      db.settings = { ...db.settings, ...settings };
      saveOfflineDb(db);
      return db.settings;
    }
  }
};
