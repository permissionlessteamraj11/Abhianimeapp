import {
  Anime,
  Movie,
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
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.message || `API error: ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  // Public & User Endpoints
  async getHome(): Promise<{
    categories: Category[];
    heroBanners: HeroBanner[];
    homepageSections: HomepageSection[];
    settings: AppSettings;
  }> {
    const res = await fetch('/api/home', { headers: getHeaders() });
    return handleResponse(res);
  },

  async getCategories(): Promise<Category[]> {
    const res = await fetch('/api/categories', { headers: getHeaders() });
    return handleResponse(res);
  },

  async getAnime(id: string): Promise<Anime> {
    const res = await fetch(`/api/anime/${id}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getMovie(id: string): Promise<Movie> {
    const res = await fetch(`/api/movies/${id}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async search(query: string, category: string = 'all'): Promise<{
    exactMatches: (Anime | Movie)[];
    results: (Anime | Movie)[];
    total: number;
  }> {
    const params = new URLSearchParams({ q: query, cat: category });
    const res = await fetch(`/api/search?${params.toString()}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getRecommendations(limit: number = 9): Promise<(Anime | Movie)[]> {
    const res = await fetch(`/api/recommendations?limit=${limit}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getPlaybackToken(params: {
    contentType: 'anime' | 'movie';
    contentId: string;
    episodeId?: string;
    quality?: VideoQuality;
  }): Promise<SignedPlaybackToken> {
    const res = await fetch('/api/stream/playback-token', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params)
    });
    return handleResponse(res);
  },

  // Saved Items
  async getSaved(): Promise<SavedItem[]> {
    const res = await fetch('/api/saved', { headers: getHeaders() });
    return handleResponse(res);
  },

  async addSaved(contentType: 'anime' | 'movie', contentId: string): Promise<SavedItem> {
    const res = await fetch('/api/saved', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ contentType, contentId })
    });
    return handleResponse(res);
  },

  async removeSaved(contentType: 'anime' | 'movie', contentId: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/saved/${contentType}/${contentId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // History & Progress
  async getWatchHistory(): Promise<WatchProgress[]> {
    const res = await fetch('/api/history', { headers: getHeaders() });
    return handleResponse(res);
  },

  async updateWatchProgress(data: {
    contentType: 'anime' | 'movie';
    contentId: string;
    seasonId?: string;
    episodeId?: string;
    positionSeconds: number;
    durationSeconds: number;
  }): Promise<{ success: boolean; progress: WatchProgress }> {
    const res = await fetch('/api/history/progress', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async clearWatchHistory(): Promise<{ success: boolean }> {
    const res = await fetch('/api/history', {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Profile & Data Management
  async getProfile(): Promise<{
    user: TelegramUser;
    savedCount: number;
    historyCount: number;
    totalWatchSeconds: number;
    continueWatching: WatchProgress[];
  }> {
    const res = await fetch('/api/profile', { headers: getHeaders() });
    return handleResponse(res);
  },

  async deleteUserData(): Promise<{ success: boolean }> {
    const res = await fetch('/api/profile/data', {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Compliance & Copyright
  async submitCopyrightClaim(data: {
    claimantName: string;
    claimantEmail: string;
    organization?: string;
    contentType: 'anime' | 'movie';
    contentId: string;
    allegedWorkDescription: string;
    infringementDetails: string;
  }): Promise<{ success: boolean; claimId: string; message: string }> {
    const res = await fetch('/api/compliance/copyright-claim', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async submitReport(data: {
    contentType: 'anime' | 'movie';
    contentId: string;
    reason: string;
    details?: string;
  }): Promise<{ success: boolean }> {
    const res = await fetch('/api/compliance/report', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  // ADMIN API
  async adminLogin(password: string, username: string = 'admin'): Promise<{ token: string; user: { username: string; role: string } }> {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const result = await handleResponse<{ token: string; user: { username: string; role: string } }>(res);
    localStorage.setItem(ADMIN_TOKEN_KEY, result.token);
    return result;
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
    const res = await fetch('/api/admin/dashboard', { headers: getHeaders() });
    return handleResponse(res);
  },

  async adminGetAnime(): Promise<Anime[]> {
    const res = await fetch('/api/admin/anime', { headers: getHeaders() });
    return handleResponse(res);
  },

  async adminSaveAnime(anime: Partial<Anime>): Promise<Anime> {
    const res = await fetch('/api/admin/anime', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(anime)
    });
    return handleResponse(res);
  },

  async adminDeleteAnime(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/admin/anime/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async adminGetMovies(): Promise<Movie[]> {
    const res = await fetch('/api/admin/movies', { headers: getHeaders() });
    return handleResponse(res);
  },

  async adminSaveMovie(movie: Partial<Movie>): Promise<Movie> {
    const res = await fetch('/api/admin/movies', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(movie)
    });
    return handleResponse(res);
  },

  async adminDeleteMovie(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/admin/movies/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async adminSaveSeason(animeId: string, season: { id?: string; season_number: number; title: string; description?: string; is_published: boolean }): Promise<{ success: boolean }> {
    const res = await fetch(`/api/admin/anime/${animeId}/seasons`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(season)
    });
    return handleResponse(res);
  },

  async adminDeleteSeason(animeId: string, seasonId: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/admin/anime/${animeId}/seasons/${seasonId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async adminSaveEpisode(animeId: string, seasonId: string, episodeData: unknown): Promise<{ success: boolean }> {
    const res = await fetch(`/api/admin/anime/${animeId}/seasons/${seasonId}/episodes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(episodeData)
    });
    return handleResponse(res);
  },

  async adminDeleteEpisode(animeId: string, seasonId: string, episodeId: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/admin/anime/${animeId}/seasons/${seasonId}/episodes/${episodeId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async adminGetHeroBanners(): Promise<HeroBanner[]> {
    const res = await fetch('/api/admin/hero-banners', { headers: getHeaders() });
    return handleResponse(res);
  },

  async adminSaveHeroBanner(banner: Partial<HeroBanner>): Promise<HeroBanner> {
    const res = await fetch('/api/admin/hero-banners', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(banner)
    });
    return handleResponse(res);
  },

  async adminDeleteHeroBanner(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/admin/hero-banners/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async adminGetSections(): Promise<HomepageSection[]> {
    const res = await fetch('/api/admin/homepage-sections', { headers: getHeaders() });
    return handleResponse(res);
  },

  async adminSaveSection(section: Partial<HomepageSection>): Promise<HomepageSection> {
    const res = await fetch('/api/admin/homepage-sections', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(section)
    });
    return handleResponse(res);
  },

  async adminSaveCategory(category: Partial<Category>): Promise<Category> {
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(category)
    });
    return handleResponse(res);
  },

  async adminDeleteCategory(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async adminGetUsers(): Promise<(TelegramUser & { savedCount: number; watchCount: number; totalMinutes: number })[]> {
    const res = await fetch('/api/admin/users', { headers: getHeaders() });
    return handleResponse(res);
  },

  async adminToggleUserSuspend(userId: number, isSuspended: boolean): Promise<{ success: boolean }> {
    const res = await fetch(`/api/admin/users/${userId}/suspend`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ isSuspended })
    });
    return handleResponse(res);
  },

  async adminGetClaims(): Promise<CopyrightClaim[]> {
    const res = await fetch('/api/admin/copyright-claims', { headers: getHeaders() });
    return handleResponse(res);
  },

  async adminUpdateClaim(claimId: string, status: string, resolutionNotes: string, unpublishContent: boolean): Promise<{ success: boolean }> {
    const res = await fetch(`/api/admin/copyright-claims/${claimId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status, resolutionNotes, unpublishContent })
    });
    return handleResponse(res);
  },

  async adminGetAuditLogs(): Promise<AdminAuditLog[]> {
    const res = await fetch('/api/admin/audit-logs', { headers: getHeaders() });
    return handleResponse(res);
  },

  async adminGetSettings(): Promise<AppSettings> {
    const res = await fetch('/api/admin/settings', { headers: getHeaders() });
    return handleResponse(res);
  },

  async adminSaveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(settings)
    });
    return handleResponse(res);
  }
};
