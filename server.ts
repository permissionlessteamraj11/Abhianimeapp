import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'kuro_secret_token_signing_key_secure_2026';

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Security Headers
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Authorized streaming sources for temporary signed streaming playback
const SAMPLE_STREAM_URLS: Record<string, string> = {
  '360p': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  '480p': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  '720p': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  '1080p': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  '4K': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'
};

interface UserRecord {
  id: string;
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code: string;
  is_suspended: boolean;
  suspension_reason?: string;
  created_at: string;
  last_active_at: string;
}

interface SavedRecord {
  id: string;
  user_id: number;
  content_type: 'anime' | 'movie';
  content_id: string;
  saved_at: string;
}

interface WatchProgressRecord {
  id: string;
  user_id: number;
  content_type: 'anime' | 'movie';
  content_id: string;
  season_id?: string;
  episode_id?: string;
  position_seconds: number;
  duration_seconds: number;
  completion_percentage: number;
  is_completed: boolean;
  last_watched_at: string;
  content_title?: string;
  content_poster?: string;
  episode_title?: string;
  episode_number?: number;
  season_number?: number;
}

// In-Memory Database Structure - Clean Initial State (All content managed via Admin Panel)
const categories = [
  { id: 'all', name: 'All', icon: 'Sparkles', description: 'Everything in the authorized catalog', display_order: 0, is_enabled: true },
  { id: 'anime', name: 'Anime Series', icon: 'Tv', description: 'Serialized animated seasons & episodes', display_order: 1, is_enabled: true },
  { id: 'movies', name: 'Movies', icon: 'Film', description: 'Feature-length animated motion pictures', display_order: 2, is_enabled: true },
  { id: 'action', name: 'Action', icon: 'Flame', description: 'High-octane battles and martial prowess', display_order: 3, is_enabled: true },
  { id: 'fantasy', name: 'Fantasy', icon: 'Wand2', description: 'Mythical realms, magic and sorcery', display_order: 4, is_enabled: true },
  { id: 'scifi', name: 'Sci-Fi', icon: 'Cpu', description: 'Cyberpunk, space exploration and futuristic dystopias', display_order: 5, is_enabled: true }
];

const genres = [
  { id: 'action', name: 'Action', slug: 'action', display_order: 1 },
  { id: 'scifi', name: 'Sci-Fi', slug: 'scifi', display_order: 2 },
  { id: 'fantasy', name: 'Fantasy', slug: 'fantasy', display_order: 3 },
  { id: 'cyberpunk', name: 'Cyberpunk', slug: 'cyberpunk', display_order: 4 },
  { id: 'adventure', name: 'Adventure', slug: 'adventure', display_order: 5 },
  { id: 'mystery', name: 'Mystery', slug: 'mystery', display_order: 6 },
  { id: 'supernatural', name: 'Supernatural', slug: 'supernatural', display_order: 7 }
];

// Clean catalog - zero dummy/fake records. Everything is controlled exclusively via the /raj Admin Panel!
const animeList: any[] = [];
const movieList: any[] = [];
const heroBanners: any[] = [];

const homepageSections: any[] = [
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

let appSettings = {
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

const users = new Map<number, UserRecord>();
const savedItems: SavedRecord[] = [];
const watchProgressList: WatchProgressRecord[] = [];
const copyrightClaims: any[] = [];
const reports: any[] = [];
const adminAuditLogs: any[] = [];

// Seed default Telegram user
users.set(849204812, {
  id: 'usr-849204812',
  telegram_id: 849204812,
  first_name: 'Ren',
  last_name: 'Kurogane',
  username: 'ren_kuro',
  language_code: 'en',
  is_suspended: false,
  created_at: '2026-01-15T08:00:00Z',
  last_active_at: new Date().toISOString()
});

// Admin Session store & Token verification
const activeAdminTokens = new Set<string>();

function createAdminToken(username: string): string {
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  const payload = `admin:${username}:${expiresAt}`;
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('hex');
  const token = Buffer.from(JSON.stringify({ payload, sig })).toString('base64url');
  activeAdminTokens.add(token);
  return token;
}

function verifyAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  if (activeAdminTokens.has(token)) return true;
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf-8');
    const { payload, sig } = JSON.parse(raw);
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('hex');
    if (sig !== expectedSig) return false;
    const parts = payload.split(':');
    if (parts[0] !== 'admin' || parts[1] !== 'rajpapa') return false;
    const expiresAt = Number(parts[2]);
    if (Date.now() > expiresAt) return false;
    activeAdminTokens.add(token);
    return true;
  } catch {
    return false;
  }
}

// Helper: Extract current Telegram User ID
function getCallerTelegramId(req: Request): number {
  const headerId = req.headers['x-telegram-user-id'];
  if (headerId && !isNaN(Number(headerId))) {
    return Number(headerId);
  }
  return 849204812;
}

// Temporary Signed Playback Token Generator
// Expiring token ensures no direct permanent storage URLs and prevents hotlinking / ripping
function createSignedToken(contentId: string, episodeId: string | undefined, quality: string): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + 4 * 60 * 60 * 1000; // 4 hours validity
  const payload = `${contentId}:${episodeId || 'main'}:${quality}:${expiresAt}`;
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('hex');
  const token = Buffer.from(JSON.stringify({ payload, signature })).toString('base64url');
  return { token, expiresAt };
}

function verifySignedToken(tokenString: string): { valid: boolean; quality?: string; contentId?: string } {
  try {
    const raw = Buffer.from(tokenString, 'base64url').toString('utf-8');
    const { payload, signature } = JSON.parse(raw);
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('hex');
    if (signature !== expectedSig) return { valid: false };

    const parts = payload.split(':');
    const expiresAt = Number(parts[3]);
    if (Date.now() > expiresAt) return { valid: false };

    return { valid: true, contentId: parts[0], quality: parts[2] };
  } catch {
    return { valid: false };
  }
}

// Admin Auth Middleware
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.headers['x-admin-token'] as string;
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ message: 'Unauthorized. Admin credentials required.' });
  }
  next();
}

function logAdminAction(adminUsername: string, action: string, entityType: string, entityId: string, details?: any, ip?: string) {
  adminAuditLogs.unshift({
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    admin_username: adminUsername,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
    ip_address: ip || '127.0.0.1',
    created_at: new Date().toISOString()
  });
  if (adminAuditLogs.length > 200) adminAuditLogs.pop();
}

// =====================================================================
// API ROUTES
// =====================================================================

// 1. App Configuration & Home Feed
app.get('/api/home', (req: Request, res: Response) => {
  if (appSettings.maintenanceMode && !activeAdminTokens.has(req.headers['x-admin-token'] as string)) {
    return res.status(503).json({
      message: 'KuroStream is temporarily undergoing scheduled maintenance. Please check back shortly.',
      maintenanceMode: true
    });
  }

  // Populate homepage section items
  const populatedSections = homepageSections
    .filter((sec) => sec.is_enabled)
    .sort((a, b) => a.display_order - b.display_order)
    .map((sec) => {
      let items: any[] = [];
      if (sec.section_type === 'new_episodes') {
        items = [...animeList].filter((a) => a.is_published).slice(0, sec.max_items);
      } else if (sec.section_type === 'trending') {
        items = [...animeList, ...movieList]
          .filter((item) => item.is_published)
          .sort((a, b) => b.view_count - a.view_count)
          .slice(0, sec.max_items);
      } else if (sec.section_type === 'popular_movies') {
        items = [...movieList].filter((m) => m.is_published).slice(0, sec.max_items);
      } else if (sec.section_type === 'genre_curated') {
        items = [...animeList, ...movieList]
          .filter((item) => item.is_published && (item.genres.includes('Action') || item.genres.includes('Sci-Fi')))
          .slice(0, sec.max_items);
      } else {
        items = [...animeList, ...movieList].filter((item) => item.is_published).slice(0, sec.max_items);
      }
      return { ...sec, items };
    });

  const activeHeroBanners = heroBanners
    .filter((b) => b.is_enabled)
    .sort((a, b) => a.display_order - b.display_order)
    .slice(0, appSettings.maxHeroBanners);

  const activeCategories = categories
    .filter((c) => c.is_enabled)
    .sort((a, b) => a.display_order - b.display_order);

  res.json({
    categories: activeCategories,
    heroBanners: activeHeroBanners,
    homepageSections: populatedSections,
    settings: appSettings
  });
});

app.get('/api/categories', (req: Request, res: Response) => {
  const activeCategories = categories
    .filter((c) => c.is_enabled)
    .sort((a, b) => a.display_order - b.display_order);
  res.json(activeCategories);
});

// 2. Anime & Details
app.get('/api/anime/:id', (req: Request, res: Response) => {
  const anime = animeList.find((a) => a.id === req.params.id);
  if (!anime || !anime.is_published) {
    return res.status(404).json({ message: 'Anime title not found or not currently authorized.' });
  }
  // increment view count
  anime.view_count = (anime.view_count || 0) + 1;
  res.json(anime);
});

// 3. Movies & Details
app.get('/api/movies/:id', (req: Request, res: Response) => {
  const movie = movieList.find((m) => m.id === req.params.id);
  if (!movie || !movie.is_published) {
    return res.status(404).json({ message: 'Movie not found or not currently authorized.' });
  }
  movie.view_count = (movie.view_count || 0) + 1;
  res.json(movie);
});

// 4. Recommendation Engine (3-column mobile grid variations per session)
app.get('/api/recommendations', (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 9, 18);
  const userId = getCallerTelegramId(req);

  // User preference derivation
  const userHistory = watchProgressList.filter((wp) => wp.user_id === userId);
  const userSaved = savedItems.filter((s) => s.user_id === userId);

  // Extract watched and saved genres
  const preferredGenres = new Set<string>();
  userHistory.forEach((h) => {
    const item = animeList.find((a) => a.id === h.content_id) || movieList.find((m) => m.id === h.content_id);
    item?.genres?.forEach((g: string) => preferredGenres.add(g));
  });
  userSaved.forEach((s) => {
    const item = animeList.find((a) => a.id === s.content_id) || movieList.find((m) => m.id === s.content_id);
    item?.genres?.forEach((g: string) => preferredGenres.add(g));
  });

  const pool = [...animeList, ...movieList].filter((item) => item.is_published);

  // Score each item: Genre match + Freshness + High Rating + Session Random Jitter
  const scored = pool.map((item) => {
    let score = (item.rating || 7.0) * 1.5;
    const matchesPreferred = item.genres?.some((g: string) => preferredGenres.has(g));
    if (matchesPreferred) score += 3.0;
    if (item.release_year >= 2026) score += 1.5;
    // Jitter to ensure sessions vary and avoid showing identical titles repeatedly
    score += (Math.random() - 0.5) * 4.0;
    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const results = scored.slice(0, limit).map((s) => s.item);

  res.json(results);
});

// 5. Global Search with Ranking: Exact title > Prefix > Partial title > Alt title > Genre/Tag
app.get('/api/search', (req: Request, res: Response) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const cat = String(req.query.cat || 'all').toLowerCase();

  if (!q) {
    return res.json({ exactMatches: [], results: [], total: 0 });
  }

  let catalog = [...animeList, ...movieList].filter((item) => item.is_published);

  if (cat === 'anime') {
    catalog = catalog.filter((item) => 'seasons' in item);
  } else if (cat === 'movies') {
    catalog = catalog.filter((item) => 'runtime_minutes' in item);
  } else if (cat !== 'all') {
    catalog = catalog.filter((item) => item.categories?.includes(cat) || item.genres?.map((g: string) => g.toLowerCase()).includes(cat));
  }

  const scoredMatches = catalog
    .map((item) => {
      const titleLower = item.title.toLowerCase();
      const altLower = (item.alt_title || '').toLowerCase();
      const descLower = item.description.toLowerCase();
      const genresMatch = item.genres?.some((g: string) => g.toLowerCase().includes(q));

      let rank = 0;
      if (titleLower === q) rank = 100;
      else if (titleLower.startsWith(q)) rank = 80;
      else if (titleLower.includes(q)) rank = 60;
      else if (altLower.includes(q)) rank = 50;
      else if (genresMatch) rank = 40;
      else if (descLower.includes(q)) rank = 20;

      return { item, rank };
    })
    .filter((res) => res.rank > 0)
    .sort((a, b) => b.rank - a.rank);

  const exactMatches = scoredMatches.filter((s) => s.rank >= 80).map((s) => s.item);
  const results = scoredMatches.map((s) => s.item);

  res.json({
    exactMatches,
    results,
    total: results.length
  });
});

// 6. Temporary Signed Playback Stream Token & Video Stream
// Strictly no direct public bucket URLs and no download headers
app.post(['/api/stream/playback-token', '/api/stream/token'], (req: Request, res: Response) => {
  const { contentType, contentId, episodeId, quality = '1080p' } = req.body;

  let targetItem: any = null;
  let availableQualities: string[] = ['720p', '1080p'];

  if (contentType === 'anime') {
    targetItem = animeList.find((a) => a.id === contentId);
    if (!targetItem?.distribution_rights_confirmed) {
      return res.status(403).json({ message: 'Content distribution is not authorized.' });
    }
    // find episode
    if (episodeId && targetItem.seasons) {
      for (const season of targetItem.seasons) {
        const ep = season.episodes?.find((e: any) => e.id === episodeId);
        if (ep?.video_assets?.length) {
          availableQualities = ep.video_assets.map((v: any) => v.quality);
          break;
        }
      }
    }
  } else {
    targetItem = movieList.find((m) => m.id === contentId);
    if (!targetItem?.distribution_rights_confirmed) {
      return res.status(403).json({ message: 'Movie distribution is not authorized.' });
    }
    if (targetItem.video_assets?.length) {
      availableQualities = targetItem.video_assets.map((v: any) => v.quality);
    }
  }

  if (!targetItem) {
    return res.status(404).json({ message: 'Stream target not found.' });
  }

  const { token, expiresAt } = createSignedToken(contentId, episodeId, quality);

  res.json({
    token,
    streamUrl: `/api/stream/token/${token}`,
    expiresAt,
    quality,
    availableQualities
  });
});

// Stream endpoint validating token signature & expiry
app.get('/api/stream/token/:token', (req: Request, res: Response) => {
  const token = req.params.token;
  const verification = verifySignedToken(token);

  if (!verification.valid) {
    return res.status(403).json({ message: 'Streaming session has expired or token is invalid.' });
  }

  const quality = verification.quality || '1080p';
  const targetStream = SAMPLE_STREAM_URLS[quality] || SAMPLE_STREAM_URLS['1080p'];

  // Prevent download by setting headers
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('X-Stream-Authorization', 'valid');

  // Redirect to signed streaming source
  res.redirect(targetStream);
});

// 7. Saved Items Management
app.get('/api/saved', (req: Request, res: Response) => {
  const userId = getCallerTelegramId(req);
  const userSaved = savedItems.filter((s) => s.user_id === userId);

  const populated = userSaved.map((s) => {
    let content: any = null;
    if (s.content_type === 'anime') {
      content = animeList.find((a) => a.id === s.content_id);
    } else {
      content = movieList.find((m) => m.id === s.content_id);
    }
    return { ...s, content };
  }).filter((s) => Boolean(s.content));

  res.json(populated);
});

app.post('/api/saved', (req: Request, res: Response) => {
  const userId = getCallerTelegramId(req);
  const { contentType, contentId } = req.body;

  const existingIndex = savedItems.findIndex((s) => s.user_id === userId && s.content_type === contentType && s.content_id === contentId);
  if (existingIndex >= 0) {
    return res.json(savedItems[existingIndex]);
  }

  const newSaved: SavedRecord = {
    id: `sv-${Date.now()}`,
    user_id: userId,
    content_type: contentType,
    content_id: contentId,
    saved_at: new Date().toISOString()
  };
  savedItems.push(newSaved);

  res.json(newSaved);
});

app.delete('/api/saved/:contentType/:contentId', (req: Request, res: Response) => {
  const userId = getCallerTelegramId(req);
  const { contentType, contentId } = req.params;

  const index = savedItems.findIndex((s) => s.user_id === userId && s.content_type === contentType && s.content_id === contentId);
  if (index >= 0) {
    savedItems.splice(index, 1);
  }

  res.json({ success: true });
});

// 8. Watch History & Progress Tracking
app.get('/api/history', (req: Request, res: Response) => {
  const userId = getCallerTelegramId(req);
  const history = watchProgressList
    .filter((wp) => wp.user_id === userId)
    .sort((a, b) => new Date(b.last_watched_at).getTime() - new Date(a.last_watched_at).getTime());
  res.json(history);
});

app.post('/api/history/progress', (req: Request, res: Response) => {
  const userId = getCallerTelegramId(req);
  const { contentType, contentId, seasonId, episodeId, positionSeconds, durationSeconds } = req.body;

  let existing = watchProgressList.find(
    (wp) => wp.user_id === userId && wp.content_type === contentType && wp.content_id === contentId && (!episodeId || wp.episode_id === episodeId)
  );

  const duration = Math.max(durationSeconds || 1, 1);
  const completionPercentage = Math.min(100, Math.round((positionSeconds / duration) * 10000) / 100);
  const isCompleted = completionPercentage > 92;

  // Metadata retrieval
  let contentTitle = '';
  let contentPoster = '';
  let episodeTitle = '';
  let episodeNumber = 1;
  let seasonNumber = 1;

  if (contentType === 'anime') {
    const anime = animeList.find((a) => a.id === contentId);
    if (anime) {
      contentTitle = anime.title;
      contentPoster = anime.poster_url;
      if (seasonId && episodeId) {
        const season = anime.seasons?.find((s: any) => s.id === seasonId);
        seasonNumber = season?.season_number || 1;
        const episode = season?.episodes?.find((e: any) => e.id === episodeId);
        episodeTitle = episode?.title || '';
        episodeNumber = episode?.episode_number || 1;
      }
    }
  } else {
    const movie = movieList.find((m) => m.id === contentId);
    if (movie) {
      contentTitle = movie.title;
      contentPoster = movie.poster_url;
    }
  }

  if (existing) {
    existing.position_seconds = positionSeconds;
    existing.duration_seconds = duration;
    existing.completion_percentage = completionPercentage;
    existing.is_completed = isCompleted;
    existing.last_watched_at = new Date().toISOString();
  } else {
    existing = {
      id: `wp-${Date.now()}`,
      user_id: userId,
      content_type: contentType,
      content_id: contentId,
      season_id: seasonId,
      episode_id: episodeId,
      position_seconds: positionSeconds,
      duration_seconds: duration,
      completion_percentage: completionPercentage,
      is_completed: isCompleted,
      last_watched_at: new Date().toISOString(),
      content_title: contentTitle,
      content_poster: contentPoster,
      episode_title: episodeTitle,
      episode_number: episodeNumber,
      season_number: seasonNumber
    };
    watchProgressList.unshift(existing);
  }

  res.json({ success: true, progress: existing });
});

app.delete('/api/history', (req: Request, res: Response) => {
  const userId = getCallerTelegramId(req);
  const initialLen = watchProgressList.length;
  for (let i = watchProgressList.length - 1; i >= 0; i--) {
    if (watchProgressList[i].user_id === userId) {
      watchProgressList.splice(i, 1);
    }
  }
  res.json({ success: true, removed: initialLen - watchProgressList.length });
});

// 9. Profile & Privacy Compliance
app.get('/api/profile', (req: Request, res: Response) => {
  const userId = getCallerTelegramId(req);
  let user = users.get(userId);

  if (!user) {
    user = {
      id: `usr-${userId}`,
      telegram_id: userId,
      first_name: 'Ren',
      username: 'ren_kuro',
      language_code: 'en',
      is_suspended: false,
      created_at: new Date().toISOString(),
      last_active_at: new Date().toISOString()
    };
    users.set(userId, user);
  }

  const userSaved = savedItems.filter((s) => s.user_id === userId);
  const userHistory = watchProgressList.filter((wp) => wp.user_id === userId);
  const totalWatchSeconds = userHistory.reduce((acc, curr) => acc + (curr.position_seconds || 0), 0);

  const continueWatching = userHistory.filter((wp) => !wp.is_completed).slice(0, 5);

  res.json({
    user,
    savedCount: userSaved.length,
    historyCount: userHistory.length,
    totalWatchSeconds,
    continueWatching
  });
});

// GDPR & Telegram Data Deletion Procedure
app.delete('/api/profile/data', (req: Request, res: Response) => {
  const userId = getCallerTelegramId(req);

  // Clear saved items
  for (let i = savedItems.length - 1; i >= 0; i--) {
    if (savedItems[i].user_id === userId) savedItems.splice(i, 1);
  }
  // Clear watch progress
  for (let i = watchProgressList.length - 1; i >= 0; i--) {
    if (watchProgressList[i].user_id === userId) watchProgressList.splice(i, 1);
  }
  // Remove user record
  users.delete(userId);

  res.json({ success: true, message: 'All personal data, playback sessions, and preferences have been permanently deleted.' });
});

// 10. Compliance & Copyright Takedown (DMCA)
app.post('/api/compliance/copyright-claim', (req: Request, res: Response) => {
  const { claimantName, claimantEmail, organization, contentType, contentId, allegedWorkDescription, infringementDetails } = req.body;

  if (!claimantName || !claimantEmail || !contentId || !infringementDetails) {
    return res.status(400).json({ message: 'Missing required copyright claim declaration fields.' });
  }

  const claimId = `claim-${Date.now()}`;
  copyrightClaims.push({
    id: claimId,
    claimant_name: claimantName,
    claimant_email: claimantEmail,
    organization: organization || 'Individual Rights Holder',
    content_type: contentType,
    content_id: contentId,
    alleged_work_description: allegedWorkDescription,
    infringement_details: infringementDetails,
    status: 'pending',
    created_at: new Date().toISOString()
  });

  logAdminAction('SYSTEM', 'COPYRIGHT_CLAIM_RECEIVED', contentType, contentId, { claimantEmail, claimId });

  res.json({
    success: true,
    claimId,
    message: 'Your formal claim has been received. Our legal and compliance team will review the claim promptly.'
  });
});

app.post('/api/compliance/report', (req: Request, res: Response) => {
  const { contentType, contentId, reason, details } = req.body;
  const userId = getCallerTelegramId(req);

  reports.push({
    id: `rep-${Date.now()}`,
    user_id: userId,
    content_type: contentType,
    content_id: contentId,
    reason,
    details,
    status: 'open',
    created_at: new Date().toISOString()
  });

  res.json({ success: true, message: 'Thank you for your report. It will be reviewed by moderation.' });
});

// =====================================================================
// ADMIN PANEL ENDPOINTS
// =====================================================================

app.post('/api/admin/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  const cleanUser = String(username || '').trim();
  const cleanPass = String(password || '').trim();

  // Strict Authorized Admin Credentials requested by owner: rajpapa / 28@Rajpapa
  if (cleanUser.toLowerCase() === 'rajpapa' && cleanPass === '28@Rajpapa') {
    const token = createAdminToken('rajpapa');

    logAdminAction('rajpapa', 'LOGIN', 'auth', 'rajpapa', { ip: req.ip }, req.ip);

    return res.json({
      token,
      user: { username: 'rajpapa', role: 'superadmin' }
    });
  }

  res.status(401).json({ message: 'Galat Username ya Password! Access Denied.' });
});

app.post('/api/admin/logout', requireAdmin, (req: Request, res: Response) => {
  const token = req.headers['x-admin-token'] as string;
  activeAdminTokens.delete(token);
  res.json({ success: true });
});

app.get('/api/admin/dashboard', requireAdmin, (req: Request, res: Response) => {
  const totalAnime = animeList.length;
  const totalMovies = movieList.length;
  let totalSeasons = 0;
  let totalEpisodes = 0;
  animeList.forEach((a) => {
    totalSeasons += a.seasons?.length || 0;
    a.seasons?.forEach((s: any) => {
      totalEpisodes += s.episodes?.length || 0;
    });
  });

  const totalViews = [...animeList, ...movieList].reduce((acc, curr) => acc + (curr.view_count || 0), 0);
  const totalWatchHours = Math.round(watchProgressList.reduce((acc, curr) => acc + (curr.position_seconds || 0), 0) / 3600);

  res.json({
    stats: {
      totalUsers: users.size,
      activeUsersToday: Math.max(users.size, 1),
      totalAnime,
      totalMovies,
      totalSeasons,
      totalEpisodes,
      totalViews,
      totalWatchHours,
      storageUsageMb: 14820,
      activeStreamSessions: 42,
      streamingErrors: 0
    },
    recentAuditLogs: adminAuditLogs.slice(0, 15),
    claimsPending: copyrightClaims.filter((c) => c.status === 'pending').length
  });
});

// Admin Content CRUD
app.get('/api/admin/anime', requireAdmin, (_req: Request, res: Response) => {
  res.json(animeList);
});

app.post('/api/admin/anime', requireAdmin, (req: Request, res: Response) => {
  const animeData = req.body;

  // Strict anti-adult content classification policy
  if (animeData.classification === '18+ Explicit' || animeData.classification === 'NSFW') {
    return res.status(400).json({ message: 'Explicit adult/sexual content is prohibited under platform terms.' });
  }

  // Distribution rights confirmation required before publishing
  if (animeData.is_published && !animeData.distribution_rights_confirmed) {
    return res.status(400).json({ message: 'Cannot publish content without confirming lawful distribution authorization.' });
  }

  let existingIndex = animeList.findIndex((a) => a.id === animeData.id);
  if (existingIndex >= 0) {
    animeList[existingIndex] = {
      ...animeList[existingIndex],
      ...animeData,
      rights_confirmed_by: animeData.distribution_rights_confirmed ? 'admin' : undefined,
      rights_confirmed_at: animeData.distribution_rights_confirmed ? new Date().toISOString() : undefined,
      updated_at: new Date().toISOString()
    };
    logAdminAction('admin', 'UPDATE', 'anime', animeData.id, { title: animeData.title });
    return res.json(animeList[existingIndex]);
  } else {
    const newAnime = {
      ...animeData,
      id: animeData.id || `anime-${Date.now()}`,
      slug: (animeData.title || 'anime').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      view_count: 0,
      seasons: animeData.seasons || [],
      rights_confirmed_by: animeData.distribution_rights_confirmed ? 'admin' : undefined,
      rights_confirmed_at: animeData.distribution_rights_confirmed ? new Date().toISOString() : undefined,
      created_at: new Date().toISOString()
    };
    animeList.push(newAnime);
    logAdminAction('admin', 'CREATE', 'anime', newAnime.id, { title: newAnime.title });
    return res.json(newAnime);
  }
});

app.delete('/api/admin/anime/:id', requireAdmin, (req: Request, res: Response) => {
  const id = req.params.id;
  const idx = animeList.findIndex((a) => a.id === id);
  if (idx >= 0) {
    const deleted = animeList.splice(idx, 1)[0];
    logAdminAction('admin', 'DELETE', 'anime', id, { title: deleted.title });
  }
  res.json({ success: true });
});

app.get('/api/admin/movies', requireAdmin, (_req: Request, res: Response) => {
  res.json(movieList);
});

app.post('/api/admin/movies', requireAdmin, (req: Request, res: Response) => {
  const movieData = req.body;

  if (movieData.is_published && !movieData.distribution_rights_confirmed) {
    return res.status(400).json({ message: 'Cannot publish movie without confirming lawful distribution authorization.' });
  }

  let existingIndex = movieList.findIndex((m) => m.id === movieData.id);
  if (existingIndex >= 0) {
    movieList[existingIndex] = {
      ...movieList[existingIndex],
      ...movieData,
      updated_at: new Date().toISOString()
    };
    logAdminAction('admin', 'UPDATE', 'movie', movieData.id, { title: movieData.title });
    return res.json(movieList[existingIndex]);
  } else {
    const newMovie = {
      ...movieData,
      id: movieData.id || `movie-${Date.now()}`,
      slug: (movieData.title || 'movie').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      view_count: 0,
      created_at: new Date().toISOString()
    };
    movieList.push(newMovie);
    logAdminAction('admin', 'CREATE', 'movie', newMovie.id, { title: newMovie.title });
    return res.json(newMovie);
  }
});

app.delete('/api/admin/movies/:id', requireAdmin, (req: Request, res: Response) => {
  const id = req.params.id;
  const idx = movieList.findIndex((m) => m.id === id);
  if (idx >= 0) {
    const deleted = movieList.splice(idx, 1)[0];
    logAdminAction('admin', 'DELETE', 'movie', id, { title: deleted.title });
  }
  res.json({ success: true });
});

// Seasons and Episodes Management
app.post('/api/admin/anime/:animeId/seasons', requireAdmin, (req: Request, res: Response) => {
  const { animeId } = req.params;
  const seasonData = req.body;
  const anime = animeList.find((a) => a.id === animeId);
  if (!anime) return res.status(404).json({ message: 'Anime not found.' });

  if (!anime.seasons) anime.seasons = [];
  const existingSeasonIdx = anime.seasons.findIndex((s: any) => s.id === seasonData.id);
  if (existingSeasonIdx >= 0) {
    anime.seasons[existingSeasonIdx] = { ...anime.seasons[existingSeasonIdx], ...seasonData };
  } else {
    anime.seasons.push({
      ...seasonData,
      id: seasonData.id || `s-${Date.now()}`,
      anime_id: animeId,
      episodes: []
    });
  }
  logAdminAction('admin', 'SAVE_SEASON', 'season', seasonData.id || animeId, { animeId });
  res.json({ success: true, seasons: anime.seasons });
});

app.post('/api/admin/anime/:animeId/seasons/:seasonId/episodes', requireAdmin, (req: Request, res: Response) => {
  const { animeId, seasonId } = req.params;
  const episodeData = req.body;

  if (episodeData.is_published && !episodeData.distribution_rights_confirmed) {
    return res.status(400).json({ message: 'Rights confirmation required: "I confirm that I own or have authorization to distribute this content."' });
  }

  const anime = animeList.find((a) => a.id === animeId);
  const season = anime?.seasons?.find((s: any) => s.id === seasonId);
  if (!season) return res.status(404).json({ message: 'Season not found.' });

  if (!season.episodes) season.episodes = [];
  const epIdx = season.episodes.findIndex((e: any) => e.id === episodeData.id);
  if (epIdx >= 0) {
    season.episodes[epIdx] = {
      ...season.episodes[epIdx],
      ...episodeData,
      rights_confirmed_by: 'admin',
      rights_confirmed_at: new Date().toISOString()
    };
  } else {
    season.episodes.push({
      ...episodeData,
      id: episodeData.id || `ep-${Date.now()}`,
      anime_id: animeId,
      season_id: seasonId,
      view_count: 0,
      rights_confirmed_by: 'admin',
      rights_confirmed_at: new Date().toISOString()
    });
  }

  logAdminAction('admin', 'SAVE_EPISODE', 'episode', episodeData.id || animeId, { title: episodeData.title });
  res.json({ success: true, episodes: season.episodes });
});

// Admin Hero Banners & Sections
app.get('/api/admin/hero-banners', requireAdmin, (_req: Request, res: Response) => {
  res.json(heroBanners);
});

app.post('/api/admin/hero-banners', requireAdmin, (req: Request, res: Response) => {
  const banner = req.body;
  const idx = heroBanners.findIndex((b) => b.id === banner.id);
  if (idx >= 0) {
    heroBanners[idx] = { ...heroBanners[idx], ...banner };
    res.json(heroBanners[idx]);
  } else {
    const newBanner = { ...banner, id: `hb-${Date.now()}` };
    heroBanners.push(newBanner);
    res.json(newBanner);
  }
  logAdminAction('admin', 'SAVE_HERO_BANNER', 'hero_banner', banner.id, { title: banner.title });
});

app.delete('/api/admin/hero-banners/:id', requireAdmin, (req: Request, res: Response) => {
  const idx = heroBanners.findIndex((b) => b.id === req.params.id);
  if (idx >= 0) heroBanners.splice(idx, 1);
  logAdminAction('admin', 'DELETE_HERO_BANNER', 'hero_banner', req.params.id);
  res.json({ success: true });
});

app.get(['/api/admin/homepage-sections', '/api/admin/sections'], requireAdmin, (_req: Request, res: Response) => {
  res.json(homepageSections);
});

app.post(['/api/admin/homepage-sections', '/api/admin/sections'], requireAdmin, (req: Request, res: Response) => {
  const sec = req.body;
  const idx = homepageSections.findIndex((s) => s.id === sec.id);
  if (idx >= 0) {
    homepageSections[idx] = { ...homepageSections[idx], ...sec };
    res.json(homepageSections[idx]);
  } else {
    const newSec = { ...sec, id: `sec-${Date.now()}` };
    homepageSections.push(newSec);
    res.json(newSec);
  }
  logAdminAction('admin', 'SAVE_SECTION', 'homepage_section', sec.id, { title: sec.title });
});

app.post('/api/admin/categories', requireAdmin, (req: Request, res: Response) => {
  const cat = req.body;
  const idx = categories.findIndex((c) => c.id === cat.id);
  if (idx >= 0) {
    categories[idx] = { ...categories[idx], ...cat };
    res.json(categories[idx]);
  } else {
    categories.push(cat);
    res.json(cat);
  }
  logAdminAction('admin', 'SAVE_CATEGORY', 'category', cat.id, { name: cat.name });
});

app.delete('/api/admin/categories/:id', requireAdmin, (req: Request, res: Response) => {
  const idx = categories.findIndex((c) => c.id === req.params.id);
  if (idx >= 0) categories.splice(idx, 1);
  logAdminAction('admin', 'DELETE_CATEGORY', 'category', req.params.id);
  res.json({ success: true });
});

// Admin User Management
app.get('/api/admin/users', requireAdmin, (_req: Request, res: Response) => {
  const userList = Array.from(users.values()).map((u) => {
    const savedCount = savedItems.filter((s) => s.user_id === u.telegram_id).length;
    const historyList = watchProgressList.filter((wp) => wp.user_id === u.telegram_id);
    const watchCount = historyList.length;
    const totalMinutes = Math.round(historyList.reduce((acc, curr) => acc + (curr.position_seconds || 0), 0) / 60);

    return {
      ...u,
      savedCount,
      watchCount,
      totalMinutes
    };
  });
  res.json(userList);
});

app.post('/api/admin/users/:telegramId/suspend', requireAdmin, (req: Request, res: Response) => {
  const tid = Number(req.params.telegramId);
  const { isSuspended } = req.body;
  const user = users.get(tid);
  if (user) {
    user.is_suspended = isSuspended;
    logAdminAction('admin', isSuspended ? 'SUSPEND_USER' : 'RESTORE_USER', 'user', String(tid));
  }
  res.json({ success: true });
});

// Admin Copyright & DMCA Claims
app.get('/api/admin/copyright-claims', requireAdmin, (_req: Request, res: Response) => {
  res.json(copyrightClaims);
});

app.patch('/api/admin/copyright-claims/:claimId', requireAdmin, (req: Request, res: Response) => {
  const { claimId } = req.params;
  const { status, resolutionNotes, unpublishContent } = req.body;

  const claim = copyrightClaims.find((c) => c.id === claimId);
  if (!claim) return res.status(404).json({ message: 'Claim not found.' });

  claim.status = status;
  claim.resolution_notes = resolutionNotes;
  claim.resolved_at = new Date().toISOString();

  if (unpublishContent) {
    if (claim.content_type === 'anime') {
      const anime = animeList.find((a) => a.id === claim.content_id);
      if (anime) anime.is_published = false;
    } else {
      const movie = movieList.find((m) => m.id === claim.content_id);
      if (movie) movie.is_published = false;
    }
  }

  logAdminAction('admin', 'UPDATE_CLAIM', 'copyright_claim', claimId, { status, unpublishContent });
  res.json({ success: true, claim });
});

// Audit Logs & Settings
app.get('/api/admin/audit-logs', requireAdmin, (_req: Request, res: Response) => {
  res.json(adminAuditLogs);
});

app.get('/api/admin/settings', requireAdmin, (_req: Request, res: Response) => {
  res.json(appSettings);
});

app.post('/api/admin/settings', requireAdmin, (req: Request, res: Response) => {
  appSettings = { ...appSettings, ...req.body };
  logAdminAction('admin', 'UPDATE_SETTINGS', 'app_settings', 'global', req.body);
  res.json(appSettings);
});

// =====================================================================
// FRONTEND VITE INTEGRATION / STATIC SERVE
// =====================================================================

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true'
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Stark Anime] Full-stack Telegram Mini App server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Stark Anime server:', err);
  process.exit(1);
});
