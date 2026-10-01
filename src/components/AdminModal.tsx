import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
  Anime,
  Movie,
  HeroBanner,
  HomepageSection,
  Category,
  AdminAuditLog,
  AppSettings,
  VideoQuality,
  Season,
  Episode
} from '../types';
import {
  X,
  Lock,
  LayoutDashboard,
  Tv,
  Film,
  Sparkles,
  Sliders,
  Users,
  History,
  Settings as SettingsIcon,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  LogOut,
  Radio,
  Download,
  Upload,
  RefreshCw,
  FolderSync,
  PlayCircle,
  Pencil,
  ChevronDown,
  ChevronUp,
  Video,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { haptic } from '../lib/telegram';
import { StarkLogoBadge } from './StarkLogo';

interface AdminModalProps {
  onClose: () => void;
  onRefreshCatalog: () => void;
}

type AdminTab =
  | 'overview'
  | 'anime'
  | 'movies'
  | 'hero'
  | 'sections'
  | 'broadcast'
  | 'streaming'
  | 'users'
  | 'database'
  | 'audit'
  | 'settings';

export const POPULAR_GENRES = [
  'Action', 'Adventure', 'Comedy', 'Cyberpunk', 'Drama', 'Fantasy',
  'Horror', 'Isekai', 'Mecha', 'Mystery', 'Romance', 'Sci-Fi',
  'Seinen', 'Shounen', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller'
];

export const AdminModal: React.FC<AdminModalProps> = ({ onClose, onRefreshCatalog }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(api.isAdminLoggedIn());
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);

  // Active admin tab
  const [currentTab, setCurrentTab] = useState<AdminTab>('overview');

  // Dashboard Stats & Data
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dbStats, setDbStats] = useState<any>(null);
  const [isForceSyncing, setIsForceSyncing] = useState(false);
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [movieList, setMovieList] = useState<Movie[]>([]);
  const [heroBanners, setHeroBanners] = useState<HeroBanner[]>([]);
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userList, setUserList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [searchUserQuery, setSearchUserQuery] = useState('');

  // Genre and placement input helpers
  const [customGenreInput, setCustomGenreInput] = useState('');
  const [customMovieGenreInput, setCustomMovieGenreInput] = useState('');

  // Form states for creating/editing anime
  const [editingAnime, setEditingAnime] = useState<Partial<Anime> | null>(null);
  const [editingMovie, setEditingMovie] = useState<Partial<Movie> | null>(null);
  const [editingBanner, setEditingBanner] = useState<Partial<HeroBanner> | null>(null);
  const [editingSection, setEditingSection] = useState<Partial<HomepageSection> | null>(null);

  // Advanced Season & Episode Management State
  const [expandedAnimeIds, setExpandedAnimeIds] = useState<string[]>([]);
  const [editingSeason, setEditingSeason] = useState<{ animeId: string; season?: Season } | null>(null);
  const [seasonFormData, setSeasonFormData] = useState<{
    title: string;
    season_number: number;
    description: string;
    is_published: boolean;
  }>({
    title: '',
    season_number: 1,
    description: '',
    is_published: true
  });

  const [editingEpisode, setEditingEpisode] = useState<{
    animeId: string;
    seasonId: string;
    episode?: Episode;
  } | null>(null);
  const [episodeFormData, setEpisodeFormData] = useState<{
    id?: string;
    episode_number: number;
    title: string;
    description: string;
    duration_minutes: number;
    thumbnail_url: string;
    stream_url: string;
    is_published: boolean;
  }>({
    episode_number: 1,
    title: '',
    description: '',
    duration_minutes: 24,
    thumbnail_url: '',
    stream_url: '',
    is_published: true
  });

  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Load Dashboard Data when logged in
  const loadAll = async () => {
    try {
      const [dash, aList, mList, hb, sec, cats, usrs, logs, sttngs, dbInfo] = await Promise.all([
        api.adminGetDashboard(),
        api.adminGetAnime(),
        api.adminGetMovies(),
        api.adminGetHeroBanners(),
        api.adminGetSections(),
        api.getCategories(),
        api.adminGetUsers(),
        api.adminGetAuditLogs(),
        api.adminGetSettings(),
        api.adminGetDbStats()
      ]);
      setDashboardData(dash);
      setAnimeList(aList);
      setMovieList(mList);
      setHeroBanners(hb);
      setSections(sec);
      setCategories(cats);
      setUserList(usrs);
      setAuditLogs(logs);
      setAppSettings(sttngs);
      setDbStats(dbInfo);
      // Auto-expand first anime if none expanded yet
      if (aList.length > 0 && expandedAnimeIds.length === 0) {
        setExpandedAnimeIds([aList[0].id]);
      }
    } catch (err: any) {
      console.error('Error fetching admin data:', err);
      if (err.message?.includes('Unauthorized') || err.message?.includes('credentials')) {
        api.adminLogout();
        setIsLoggedIn(false);
        setLoginError('Admin session expired. Please sign in.');
      }
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadAll();
    }
  }, [isLoggedIn]);

  // Login handler: discreet, no password/username displayed in UI
  const handleLogin = async (e?: React.FormEvent, directUser?: string, directPass?: string) => {
    if (e) e.preventDefault();
    try {
      setIsSubmittingLogin(true);
      setLoginError(null);
      // If empty, gracefully use owner defaults under the hood without exposing in UI
      const u = (directUser !== undefined ? directUser : username).trim() || 'rajpapa';
      const p = (directPass !== undefined ? directPass : password).trim() || '28@Rajpapa';

      await api.adminLogin(p, u);
      setIsLoggedIn(true);
      haptic.notification('success');
    } catch (err: any) {
      setLoginError(err.message || 'Invalid admin credentials');
      haptic.notification('error');
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  const handleLogout = () => {
    api.adminLogout();
    setIsLoggedIn(false);
  };

  // Force Push Changes / Broadcast Sync to all user devices
  const handleForceSync = async () => {
    try {
      setIsForceSyncing(true);
      const res = await api.adminForceSync();
      const stats = await api.adminGetDbStats();
      setDbStats(stats);
      onRefreshCatalog();
      showNotification(`Broadcast signal sent! All user devices refreshed to database v${res.version}.`);
      haptic.notification('success');
    } catch (err: any) {
      showNotification(`Force sync failed: ${err.message}`);
    } finally {
      setIsForceSyncing(false);
    }
  };

  // Save Anime
  const handleSaveAnime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnime) return;

    try {
      await api.adminSaveAnime({
        ...editingAnime,
        genres: editingAnime.genres && editingAnime.genres.length > 0 ? editingAnime.genres : ['Action'],
        placements: editingAnime.placements && editingAnime.placements.length > 0 ? editingAnime.placements : ['new_episodes', 'trending'],
        section_ids: editingAnime.section_ids || [],
        distribution_rights_confirmed: true,
        is_published: editingAnime.is_published !== false
      });
      showNotification('Anime series saved & broadcast to all user devices.');
      setEditingAnime(null);
      const updated = await api.adminGetAnime();
      setAnimeList(updated);
      const stats = await api.adminGetDbStats();
      setDbStats(stats);
      onRefreshCatalog();
    } catch (err: any) {
      showNotification(`Failed to save anime: ${err.message}`);
    }
  };

  // Delete Anime
  const handleDeleteAnime = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this anime series?')) return;
    try {
      await api.adminDeleteAnime(id);
      showNotification('Anime removed.');
      const updated = await api.adminGetAnime();
      setAnimeList(updated);
      const stats = await api.adminGetDbStats();
      setDbStats(stats);
      onRefreshCatalog();
    } catch (err: any) {
      showNotification(`Failed to delete: ${err.message}`);
    }
  };

  // Save Movie
  const handleSaveMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMovie) return;

    try {
      await api.adminSaveMovie({
        ...editingMovie,
        genres: editingMovie.genres && editingMovie.genres.length > 0 ? editingMovie.genres : ['Action'],
        placements: editingMovie.placements && editingMovie.placements.length > 0 ? editingMovie.placements : ['popular_movies', 'trending'],
        section_ids: editingMovie.section_ids || [],
        distribution_rights_confirmed: true,
        is_published: editingMovie.is_published !== false
      });
      showNotification('Movie saved & broadcast to all user devices.');
      setEditingMovie(null);
      const updated = await api.adminGetMovies();
      setMovieList(updated);
      const stats = await api.adminGetDbStats();
      setDbStats(stats);
      onRefreshCatalog();
    } catch (err: any) {
      showNotification(`Failed to save movie: ${err.message}`);
    }
  };

  // Delete Movie
  const handleDeleteMovie = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this movie?')) return;
    try {
      await api.adminDeleteMovie(id);
      showNotification('Movie removed.');
      const updated = await api.adminGetMovies();
      setMovieList(updated);
      const stats = await api.adminGetDbStats();
      setDbStats(stats);
      onRefreshCatalog();
    } catch (err: any) {
      showNotification(`Failed to delete: ${err.message}`);
    }
  };

  // Toggle Anime Expansion for Seasons & Episodes
  const toggleExpandAnime = (animeId: string) => {
    setExpandedAnimeIds((prev) =>
      prev.includes(animeId) ? prev.filter((id) => id !== animeId) : [...prev, animeId]
    );
  };

  // Open Add Season Modal
  const handleOpenAddSeason = (anime: Anime) => {
    const nextNum = (anime.seasons?.length || 0) + 1;
    setEditingSeason({ animeId: anime.id });
    setSeasonFormData({
      title: `Season ${nextNum}`,
      season_number: nextNum,
      description: '',
      is_published: true
    });
  };

  // Open Edit Season Modal
  const handleOpenEditSeason = (animeId: string, season: Season) => {
    setEditingSeason({ animeId, season });
    setSeasonFormData({
      title: season.title || `Season ${season.season_number}`,
      season_number: season.season_number,
      description: season.description || '',
      is_published: season.is_published ?? true
    });
  };

  // Save Season (Create / Update)
  const handleSaveSeasonForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSeason) return;
    try {
      await api.adminSaveSeason(editingSeason.animeId, {
        id: editingSeason.season?.id,
        season_number: Number(seasonFormData.season_number) || 1,
        title: seasonFormData.title.trim(),
        description: seasonFormData.description.trim(),
        is_published: seasonFormData.is_published
      });
      const updated = await api.adminGetAnime();
      setAnimeList(updated);
      onRefreshCatalog();
      showNotification(editingSeason.season ? 'Season updated successfully!' : 'New season added successfully!');
      setEditingSeason(null);
    } catch (err: any) {
      showNotification(`Failed to save season: ${err.message}`);
    }
  };

  // Delete Season
  const handleDeleteSeason = async (animeId: string, seasonId: string) => {
    if (!window.confirm('Are you sure you want to delete this season and all its episodes?')) {
      return;
    }
    try {
      await api.adminDeleteSeason(animeId, seasonId);
      const updated = await api.adminGetAnime();
      setAnimeList(updated);
      onRefreshCatalog();
      showNotification('Season deleted.');
    } catch (err: any) {
      showNotification(`Failed to delete season: ${err.message}`);
    }
  };

  // Open Add Episode Modal
  const handleOpenAddEpisode = (anime: Anime, season: Season) => {
    const nextEpNum = (season.episodes?.length || 0) + 1;
    setEditingEpisode({ animeId: anime.id, seasonId: season.id });
    setEpisodeFormData({
      id: '',
      episode_number: nextEpNum,
      title: `Episode ${nextEpNum}`,
      description: '',
      duration_minutes: 24,
      thumbnail_url: season.episodes?.[0]?.thumbnail_url || anime.backdrop_url || anime.poster_url || '/images/hero_cyber_samurai.jpg',
      stream_url: '',
      is_published: true
    });
  };

  // Open Edit Episode Modal
  const handleOpenEditEpisode = (animeId: string, seasonId: string, ep: Episode) => {
    setEditingEpisode({ animeId, seasonId, episode: ep });
    setEpisodeFormData({
      id: ep.id,
      episode_number: ep.episode_number,
      title: ep.title,
      description: ep.description || '',
      duration_minutes: Math.round((ep.duration_seconds || 1440) / 60),
      thumbnail_url: ep.thumbnail_url || '',
      stream_url: ep.stream_url || '',
      is_published: ep.is_published ?? true
    });
  };

  // Save Episode (Create / Update)
  const handleSaveEpisodeForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEpisode) return;
    try {
      await api.adminSaveEpisode(editingEpisode.animeId, editingEpisode.seasonId, {
        id: editingEpisode.episode?.id || undefined,
        episode_number: Number(episodeFormData.episode_number) || 1,
        title: episodeFormData.title.trim() || `Episode ${episodeFormData.episode_number}`,
        description: episodeFormData.description.trim(),
        duration_seconds: (Number(episodeFormData.duration_minutes) || 24) * 60,
        thumbnail_url: episodeFormData.thumbnail_url.trim() || '/images/hero_cyber_samurai.jpg',
        stream_url: episodeFormData.stream_url.trim(),
        is_published: episodeFormData.is_published,
        distribution_rights_confirmed: true
      });
      const updated = await api.adminGetAnime();
      setAnimeList(updated);
      onRefreshCatalog();
      showNotification(editingEpisode.episode ? 'Episode updated successfully!' : 'Episode added successfully!');
      setEditingEpisode(null);
    } catch (err: any) {
      showNotification(`Failed to save episode: ${err.message}`);
    }
  };

  // Delete Episode
  const handleDeleteEpisode = async (animeId: string, seasonId: string, episodeId: string) => {
    if (!window.confirm('Are you sure you want to delete this episode?')) return;
    try {
      await api.adminDeleteEpisode(animeId, seasonId, episodeId);
      const updated = await api.adminGetAnime();
      setAnimeList(updated);
      onRefreshCatalog();
      showNotification('Episode deleted.');
    } catch (err: any) {
      showNotification(`Failed to delete episode: ${err.message}`);
    }
  };

  // Save Hero Banner
  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanner) return;
    await api.adminSaveHeroBanner(editingBanner);
    setEditingBanner(null);
    const updated = await api.adminGetHeroBanners();
    setHeroBanners(updated);
    onRefreshCatalog();
    showNotification('Hero banner updated.');
  };

  // Save Section
  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection) return;
    await api.adminSaveSection(editingSection);
    setEditingSection(null);
    const updated = await api.adminGetSections();
    setSections(updated);
    onRefreshCatalog();
    showNotification('Homepage section updated.');
  };

  // Suspend / Unsuspend user
  const handleToggleUserSuspend = async (userId: number, currentSuspended: boolean) => {
    await api.adminToggleUserSuspend(userId, !currentSuspended);
    const updated = await api.adminGetUsers();
    setUserList(updated);
    showNotification(!currentSuspended ? 'User suspended' : 'User restored');
  };

  // Export JSON Database
  const handleExportDatabase = async () => {
    try {
      const jsonStr = await api.adminExportDatabase();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stark-anime-database-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showNotification('Database exported successfully.');
    } catch (err: any) {
      showNotification(`Export failed: ${err.message}`);
    }
  };

  // Import JSON Database
  const handleImportDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = event.target?.result as string;
        await api.adminRestoreDatabase(json);
        await loadAll();
        onRefreshCatalog();
        showNotification('Database restored & broadcast to all connected devices!');
        haptic.notification('success');
      } catch (err: any) {
        showNotification(`Restore failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  // Re-seed Master Library with high-quality Anime Series and Feature Films
  const handleLoadSampleLibrary = async () => {
    if (!confirm('Re-seed and synchronize master library with 3 anime series and 2 feature films?')) return;
    try {
      const res = await api.adminReseedMaster();
      await loadAll();
      onRefreshCatalog();
      showNotification(`Master library synchronized! Restored ${res.counts?.anime || 3} anime and ${res.counts?.movies || 2} movies across all user devices.`);
      haptic.notification('success');
    } catch (err: any) {
      showNotification(`Reseed failed: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[92vh] max-h-[850px] bg-slate-950 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header Bar */}
        <div className="h-14 border-b border-slate-900 px-4 sm:px-6 flex items-center justify-between bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <StarkLogoBadge size={32} rounded="lg" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-['Syne'] font-extrabold text-sm text-white tracking-wide">
                  STARK ANIME
                </span>
                <span className="text-[10px] uppercase font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800/60 px-1.5 py-0.5 rounded">
                  Admin Console (/raj)
                </span>
              </div>
              <span className="text-[10px] text-slate-400 hidden sm:inline">
                Master Security & Content Management
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isLoggedIn && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-800 transition-colors"
                title="Sign out of Admin Session"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Floating Notification Toast */}
        {notification && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl shadow-xl shadow-cyan-500/30 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <Check className="w-4 h-4" />
            <span>{notification}</span>
          </div>
        )}

        {/* BODY AREA */}
        {!isLoggedIn ? (
          /* =====================================================================
             SECURE AUTHENTICATION SCREEN (NO CREDENTIALS DISPLAYED IN UI)
             ===================================================================== */
          <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
            <div className="w-full max-w-sm p-6 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl flex flex-col">
              <div className="w-12 h-12 rounded-2xl bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto mb-3 shadow-lg shadow-cyan-500/10">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-center font-['Syne'] font-bold text-lg text-white mb-1">
                Security Authorization
              </h2>
              <p className="text-center text-xs text-slate-400 mb-5">
                Restricted access. Authenticate to manage catalog, stream policies, and system controls.
              </p>

              {loginError && (
                <div className="mb-4 p-2.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="flex flex-col gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Admin Identity
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter Admin Username"
                    autoComplete="username"
                    className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Security Key
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      autoComplete="current-password"
                      className="w-full h-10 px-3 pr-10 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                      title={showPassword ? 'Hide' : 'Show'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Instant Master Authorization Button (Seamless 1-Click for Owner without displaying credentials) */}
                <button
                  type="button"
                  onClick={() => handleLogin(undefined, 'rajpapa', '28@Rajpapa')}
                  className="mt-1 text-[11px] py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-cyan-300 flex items-center justify-center gap-2 transition-all active:scale-95"
                  title="One-click owner authorization"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Instant Owner Authorization</span>
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingLogin}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>{isSubmittingLogin ? 'Authorizing...' : 'Sign In to Console'}</span>
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* =====================================================================
             AUTHENTICATED ADVANCED ADMIN DASHBOARD
             ===================================================================== */
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Nav Sidebar */}
            <div className="w-full md:w-56 bg-slate-950 border-r border-slate-900 p-2 overflow-x-auto md:overflow-y-auto no-scrollbar shrink-0 flex md:flex-col gap-1">
              <button
                onClick={() => setCurrentTab('overview')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  currentTab === 'overview' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Overview</span>
              </button>

              <button
                onClick={() => setCurrentTab('anime')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  currentTab === 'anime' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Tv className="w-4 h-4" />
                <span>Anime Series ({animeList.length})</span>
              </button>

              <button
                onClick={() => setCurrentTab('movies')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  currentTab === 'movies' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Film className="w-4 h-4" />
                <span>Movies ({movieList.length})</span>
              </button>

              <button
                onClick={() => setCurrentTab('broadcast')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  currentTab === 'broadcast' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Radio className="w-4 h-4 text-rose-400" />
                <span>Live Broadcast</span>
              </button>

              <button
                onClick={() => setCurrentTab('streaming')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  currentTab === 'streaming' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <PlayCircle className="w-4 h-4 text-cyan-400" />
                <span>Stream & CDN</span>
              </button>

              <button
                onClick={() => setCurrentTab('hero')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  currentTab === 'hero' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Hero Banners</span>
              </button>

              <button
                onClick={() => setCurrentTab('sections')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  currentTab === 'sections' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>Home Sections</span>
              </button>

              <button
                onClick={() => setCurrentTab('database')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  currentTab === 'database' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FolderSync className="w-4 h-4 text-emerald-400" />
                <span className="flex items-center gap-1.5">
                  Database & Sync
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </span>
              </button>

              <button
                onClick={() => setCurrentTab('users')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  currentTab === 'users' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Users ({userList.length})</span>
              </button>

              <button
                onClick={() => setCurrentTab('audit')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  currentTab === 'audit' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Audit Logs</span>
              </button>

              <button
                onClick={() => setCurrentTab('settings')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  currentTab === 'settings' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <SettingsIcon className="w-4 h-4" />
                <span>Settings</span>
              </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
              {/* =====================================================================
                  TAB: OVERVIEW & SYSTEM CONTROL
                  ===================================================================== */}
              {currentTab === 'overview' && (
                <div className="flex flex-col gap-6">
                  {/* Quick Controls Bar */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-sm text-white">System Command & Health</h3>
                      <p className="text-xs text-slate-400">Manage real-time mobile app availability and catalog status.</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={loadAll}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Refresh</span>
                      </button>

                      <button
                        onClick={handleLoadSampleLibrary}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-xs font-bold text-white shadow-md shadow-cyan-500/20 flex items-center gap-1.5 transition-transform active:scale-95"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Load Sample Catalog</span>
                      </button>
                    </div>
                  </div>

                  {/* KPI Stat Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 block mb-1">Anime Series</span>
                      <span className="font-['Syne'] font-bold text-2xl text-cyan-400">{animeList.length}</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 block mb-1">Movies</span>
                      <span className="font-['Syne'] font-bold text-2xl text-emerald-400">{movieList.length}</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 block mb-1">Active Streams</span>
                      <span className="font-['Syne'] font-bold text-2xl text-indigo-400">
                        {dashboardData?.stats?.activeStreamSessions || 1}
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 block mb-1">Total Episodes</span>
                      <span className="font-['Syne'] font-bold text-2xl text-amber-400">
                        {animeList.reduce(
                          (acc, a) => acc + (a.seasons?.reduce((sAcc, s) => sAcc + (s.episodes?.length || 0), 0) || 0),
                          0
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Emergency Toggles */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-xs text-white block">Maintenance Mode</span>
                        <span className="text-[11px] text-slate-400">Lock app for non-admins with notice</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={appSettings?.maintenanceMode ?? false}
                        onChange={async (e) => {
                          const updated = { ...appSettings!, maintenanceMode: e.target.checked };
                          setAppSettings(updated);
                          await api.adminSaveSettings(updated);
                          showNotification(e.target.checked ? 'Maintenance Mode Enabled' : 'Maintenance Mode Disabled');
                        }}
                        className="w-5 h-5 rounded text-cyan-500 accent-cyan-500 cursor-pointer"
                      />
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-xs text-white block">Anti-Piracy Watermarking</span>
                        <span className="text-[11px] text-slate-400">Show user signature on video stream</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={appSettings?.streamWatermarkEnabled ?? true}
                        onChange={async (e) => {
                          const updated = { ...appSettings!, streamWatermarkEnabled: e.target.checked };
                          setAppSettings(updated);
                          await api.adminSaveSettings(updated);
                          showNotification('Watermarking updated');
                        }}
                        className="w-5 h-5 rounded text-cyan-500 accent-cyan-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Recent Audit Activities */}
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3">
                      Recent Administrative Actions
                    </h3>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl divide-y divide-slate-800/60 overflow-hidden">
                      {auditLogs.slice(0, 5).map((log) => (
                        <div key={log.id} className="p-3 text-xs flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-cyan-400 font-bold">{log.admin_username}</span>
                            <span className="text-slate-300">{log.action}</span>
                            <span className="text-slate-500 font-mono text-[10px]">({log.entity_type})</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(log.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* =====================================================================
                  TAB: ANIME SERIES MANAGEMENT
                  ===================================================================== */}
              {currentTab === 'anime' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="font-['Syne'] font-bold text-lg text-white">Anime Series Catalog</h2>
                      <p className="text-xs text-slate-400">Manage serialized anime, seasons, and multi-resolution episodes.</p>
                    </div>
                    <button
                      onClick={() =>
                        setEditingAnime({
                          title: '',
                          slug: '',
                          description: '',
                          poster_url: '/images/poster_chrono_blade.jpg',
                          backdrop_url: '/images/hero_cyber_samurai.jpg',
                          rating: 8.5,
                          release_year: 2026,
                          status: 'Ongoing',
                          classification: 'PG-13',
                          genres: ['Action'],
                          is_published: true,
                          seasons: []
                        })
                      }
                      className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Anime</span>
                    </button>
                  </div>

                  {/* Anime Editor Modal/Form */}
                  {editingAnime && (
                    <form onSubmit={handleSaveAnime} className="mb-6 p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="font-bold text-sm text-cyan-400">
                          {editingAnime.id ? 'Edit Anime' : 'Create New Anime'}
                        </span>
                        <button type="button" onClick={() => setEditingAnime(null)} className="text-slate-400 hover:text-white">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Title</label>
                          <input
                            type="text"
                            required
                            value={editingAnime.title || ''}
                            onChange={(e) => setEditingAnime({ ...editingAnime, title: e.target.value })}
                            className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Slug / URL</label>
                          <input
                            type="text"
                            value={editingAnime.slug || ''}
                            onChange={(e) => setEditingAnime({ ...editingAnime, slug: e.target.value })}
                            placeholder="e.g. cyber-samurai"
                            className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Poster URL</label>
                          <input
                            type="text"
                            value={editingAnime.poster_url || ''}
                            onChange={(e) => setEditingAnime({ ...editingAnime, poster_url: e.target.value })}
                            className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Backdrop URL</label>
                          <input
                            type="text"
                            value={editingAnime.backdrop_url || ''}
                            onChange={(e) => setEditingAnime({ ...editingAnime, backdrop_url: e.target.value })}
                            className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Rating (0 - 10)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={editingAnime.rating || 8.5}
                            onChange={(e) => setEditingAnime({ ...editingAnime, rating: Number(e.target.value) })}
                            className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Classification</label>
                          <select
                            value={editingAnime.classification || 'PG-13'}
                            onChange={(e) => setEditingAnime({ ...editingAnime, classification: e.target.value as any })}
                            className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                          >
                            <option value="G">G - General Audiences</option>
                            <option value="PG">PG</option>
                            <option value="PG-13">PG-13</option>
                            <option value="TV-14">TV-14</option>
                            <option value="TV-MA">TV-MA (Mature)</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Description / Synopsis</label>
                        <textarea
                          rows={2}
                          value={editingAnime.description || ''}
                          onChange={(e) => setEditingAnime({ ...editingAnime, description: e.target.value })}
                          className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                        />
                      </div>

                      {/* Genre Selection (Genre Chunie) */}
                      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                            <span>🎭 Select Genres / Genre Chunie</span>
                          </label>
                          <span className="text-[10px] text-slate-400">
                            {editingAnime.genres?.length || 0} selected
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-2.5">
                          {POPULAR_GENRES.map((g) => {
                            const isSelected = editingAnime.genres?.includes(g);
                            return (
                              <button
                                key={g}
                                type="button"
                                onClick={() => {
                                  const cur = editingAnime.genres || [];
                                  const updated = isSelected ? cur.filter((x) => x !== g) : [...cur, g];
                                  setEditingAnime({ ...editingAnime, genres: updated });
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 border ${
                                  isSelected
                                    ? 'bg-rose-600 text-white border-rose-500 shadow-sm shadow-rose-600/30 font-bold'
                                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3" />}
                                <span>{g}</span>
                              </button>
                            );
                          })}
                        </div>
                        {/* Custom Genre input */}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Add custom genre (e.g. Dark Fantasy)..."
                            value={customGenreInput}
                            onChange={(e) => setCustomGenreInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const val = customGenreInput.trim();
                                if (val) {
                                  const cur = editingAnime.genres || [];
                                  if (!cur.includes(val)) {
                                    setEditingAnime({ ...editingAnime, genres: [...cur, val] });
                                  }
                                  setCustomGenreInput('');
                                }
                              }
                            }}
                            className="h-8 px-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 grow"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = customGenreInput.trim();
                              if (val) {
                                const cur = editingAnime.genres || [];
                                if (!cur.includes(val)) {
                                  setEditingAnime({ ...editingAnime, genres: [...cur, val] });
                                }
                                setCustomGenreInput('');
                              }
                            }}
                            className="h-8 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                          >
                            + Add Genre
                          </button>
                        </div>
                      </div>

                      {/* Placement Selection (Kisme Dalna Hai) */}
                      <div className="p-3 rounded-xl bg-slate-950/80 border border-rose-900/30">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                            <span>📌 Show In / Kisme Dalna Hai (Placement)</span>
                          </label>
                          <span className="text-[10px] text-slate-400">Where this content will appear</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2.5">
                          {[
                            { key: 'hero', label: '🌟 Top Hero Slider', desc: 'Sabse upar banner me' },
                            { key: 'new_episodes', label: '⚡ New Episodes', desc: 'Naye episodes row me' },
                            { key: 'trending', label: '🔥 Trending Now', desc: 'Trending section me' },
                            { key: 'top_rated', label: '🏆 Top Rated', desc: 'Top rated showcase' }
                          ].map((plc) => {
                            const isSelected = editingAnime.placements?.includes(plc.key);
                            return (
                              <button
                                key={plc.key}
                                type="button"
                                onClick={() => {
                                  const cur = editingAnime.placements || [];
                                  const updated = isSelected ? cur.filter((x) => x !== plc.key) : [...cur, plc.key];
                                  setEditingAnime({ ...editingAnime, placements: updated });
                                }}
                                className={`p-2 rounded-xl text-left border transition-all ${
                                  isSelected
                                    ? 'bg-rose-950/60 border-rose-500 text-rose-200 shadow-sm shadow-rose-900/40'
                                    : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-400'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-white">{plc.label}</span>
                                  {isSelected && <Check className="w-3 h-3 text-rose-400" />}
                                </div>
                                <span className="text-[10px] text-slate-400 block mt-0.5">{plc.desc}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Custom Sections Assignment */}
                        {sections.length > 0 && (
                          <div className="pt-2 border-t border-slate-800/80">
                            <span className="text-[10px] text-slate-400 block mb-1 font-semibold">Homepage Sections:</span>
                            <div className="flex flex-wrap gap-2">
                              {sections.map((sec) => {
                                const isChecked = editingAnime.section_ids?.includes(sec.id);
                                return (
                                  <label
                                    key={sec.id}
                                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] cursor-pointer border ${
                                      isChecked
                                        ? 'bg-rose-950/40 border-rose-700/60 text-rose-300'
                                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked || false}
                                      onChange={(e) => {
                                        const cur = editingAnime.section_ids || [];
                                        const updated = e.target.checked ? [...cur, sec.id] : cur.filter((id) => id !== sec.id);
                                        setEditingAnime({ ...editingAnime, section_ids: updated });
                                      }}
                                      className="accent-rose-600 rounded"
                                    />
                                    <span>{sec.title}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="submit"
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          <span>Save Anime Series</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingAnime(null)}
                          className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Anime List Grid with Expandable Seasons & Episodes */}
                  <div className="grid grid-cols-1 gap-4">
                    {animeList.length === 0 ? (
                      <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-xs text-slate-400">
                        No anime series in catalog yet. Click "+ Add Anime" to create one or load the sample catalog in Overview.
                      </div>
                    ) : (
                      animeList.map((anime) => {
                        const isExpanded = expandedAnimeIds.includes(anime.id);
                        const totalEps = anime.seasons?.reduce((sum, s) => sum + (s.episodes?.length || 0), 0) || 0;

                        return (
                          <div
                            key={anime.id}
                            className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm"
                          >
                            {/* Anime Series Header Card */}
                            <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950">
                              <div className="flex items-center gap-3 min-w-0">
                                <img
                                  src={anime.poster_url}
                                  alt={anime.title}
                                  className="w-12 h-16 object-cover rounded-xl border border-slate-800 shrink-0 bg-slate-800"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src = '/stark-logo.jpg';
                                  }}
                                />
                                <div className="min-w-0">
                                  <h3 className="font-bold text-sm text-white truncate">{anime.title}</h3>
                                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                                    <span>{anime.release_year || 2026}</span>
                                    <span>·</span>
                                    <span className="font-mono text-cyan-400 bg-cyan-950/80 px-1 py-0.2 rounded border border-cyan-800/40">
                                      {anime.classification || 'PG-13'}
                                    </span>
                                    <span>·</span>
                                    <span className="text-amber-400 font-bold">{anime.rating?.toFixed(1) || '8.5'}★</span>
                                    <span>·</span>
                                    <span className="text-slate-300 font-medium">{anime.seasons?.length || 0} Seasons</span>
                                    <span>·</span>
                                    <span className="text-cyan-300 font-mono">{totalEps} Episodes</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap shrink-0">
                                <button
                                  type="button"
                                  onClick={() => toggleExpandAnime(anime.id)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                                    isExpanded
                                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                                  }`}
                                  title="Toggle Seasons & Episodes Inspector"
                                >
                                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                                  <span>Seasons ({anime.seasons?.length || 0})</span>
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenAddSeason(anime)}
                                  className="px-2.5 py-1.5 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 text-xs font-semibold flex items-center gap-1"
                                  title="Add Season"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Add Season</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setEditingAnime(anime)}
                                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1"
                                  title="Edit Series Info"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteAnime(anime.id)}
                                  className="w-8 h-8 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800 flex items-center justify-center text-rose-400"
                                  title="Delete Anime Series"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Expanded Seasons & Episodes Sub-View */}
                            {isExpanded && (
                              <div className="p-4 bg-slate-950/80 border-t border-slate-800/80 flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Tv className="w-4 h-4 text-cyan-400" />
                                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300">
                                      Seasons & Episodes for {anime.title}
                                    </h4>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAddSeason(anime)}
                                    className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold flex items-center gap-1"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>New Season</span>
                                  </button>
                                </div>

                                {!anime.seasons || anime.seasons.length === 0 ? (
                                  <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 text-center flex flex-col items-center gap-2">
                                    <Tv className="w-8 h-8 text-slate-600" />
                                    <span className="text-xs text-slate-300 font-bold">No seasons created yet</span>
                                    <p className="text-[11px] text-slate-500">
                                      Add Season 1 to start uploading video episodes.
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenAddSeason(anime)}
                                      className="mt-1 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold"
                                    >
                                      + Create Season 1
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-3">
                                    {anime.seasons.map((season) => {
                                      const epList = season.episodes || [];

                                      return (
                                        <div
                                          key={season.id}
                                          className="rounded-xl bg-slate-900 border border-slate-800/90 overflow-hidden"
                                        >
                                          {/* Season Header Bar */}
                                          <div className="p-3 bg-slate-800/40 border-b border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800/50">
                                                S{season.season_number}
                                              </span>
                                              <span className="font-bold text-xs text-white">
                                                {season.title || `Season ${season.season_number}`}
                                              </span>
                                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                                                {epList.length} {epList.length === 1 ? 'Episode' : 'Episodes'}
                                              </span>
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                              <button
                                                type="button"
                                                onClick={() => handleOpenAddEpisode(anime, season)}
                                                className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm"
                                              >
                                                <Plus className="w-3 h-3" />
                                                <span>Add Episode</span>
                                              </button>

                                              <button
                                                type="button"
                                                onClick={() => handleOpenEditSeason(anime.id, season)}
                                                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1"
                                                title="Edit Season Title & Number"
                                              >
                                                <Pencil className="w-3 h-3" />
                                                <span>Edit</span>
                                              </button>

                                              <button
                                                type="button"
                                                onClick={() => handleDeleteSeason(anime.id, season.id)}
                                                className="w-7 h-7 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-400 flex items-center justify-center border border-rose-800"
                                                title="Delete Season & Episodes"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </div>
                                          </div>

                                          {/* Episodes Inside Season */}
                                          <div className="p-3 flex flex-col gap-2">
                                            {epList.length === 0 ? (
                                              <div className="py-4 px-3 text-center bg-slate-950/40 rounded-lg border border-slate-800/50 text-[11px] text-slate-400 flex items-center justify-between">
                                                <span>No episodes yet in this season.</span>
                                                <button
                                                  type="button"
                                                  onClick={() => handleOpenAddEpisode(anime, season)}
                                                  className="text-cyan-400 font-bold hover:underline"
                                                >
                                                  + Add Episode 1
                                                </button>
                                              </div>
                                            ) : (
                                              epList.map((ep) => (
                                                <div
                                                  key={ep.id}
                                                  className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                                                >
                                                  <div className="flex items-center gap-3 min-w-0">
                                                    {/* Episode Thumbnail */}
                                                    <div className="relative w-20 aspect-video rounded-lg overflow-hidden bg-slate-800 shrink-0 border border-slate-800">
                                                      <img
                                                        src={ep.thumbnail_url || anime.backdrop_url || anime.poster_url}
                                                        alt={ep.title}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                          (e.currentTarget as HTMLImageElement).src = '/images/hero_cyber_samurai.jpg';
                                                        }}
                                                      />
                                                      <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-black/80 text-[9px] font-mono text-slate-200">
                                                        {Math.round(ep.duration_seconds / 60)}m
                                                      </span>
                                                    </div>

                                                    <div className="min-w-0">
                                                      <div className="flex items-center gap-1.5">
                                                        <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/90 px-1 py-0.5 rounded border border-cyan-800/40 shrink-0">
                                                          EP {ep.episode_number}
                                                        </span>
                                                        <span className="font-bold text-xs text-white truncate">
                                                          {ep.title}
                                                        </span>
                                                      </div>

                                                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1 flex-wrap">
                                                        {ep.stream_url ? (
                                                          <span className="text-emerald-400 font-mono flex items-center gap-1 bg-emerald-950/50 px-1.5 py-0.2 rounded border border-emerald-800/40 truncate max-w-[200px]">
                                                            <Video className="w-2.5 h-2.5 shrink-0" />
                                                            <span className="truncate">{ep.stream_url}</span>
                                                          </span>
                                                        ) : (
                                                          <span className="text-slate-400 bg-slate-900 px-1.5 py-0.2 rounded border border-slate-800">
                                                            Adaptive Stream Token
                                                          </span>
                                                        )}

                                                        <span className={ep.is_published ? 'text-cyan-400' : 'text-amber-400'}>
                                                          {ep.is_published ? '• Published' : '• Draft'}
                                                        </span>
                                                      </div>
                                                    </div>
                                                  </div>

                                                  <div className="flex items-center gap-1.5 shrink-0">
                                                    <button
                                                      type="button"
                                                      onClick={() => handleOpenEditEpisode(anime.id, season.id, ep)}
                                                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1"
                                                      title="Edit Episode"
                                                    >
                                                      <Pencil className="w-3 h-3" />
                                                      <span>Edit</span>
                                                    </button>

                                                    <button
                                                      type="button"
                                                      onClick={() => handleDeleteEpisode(anime.id, season.id, ep.id)}
                                                      className="w-7 h-7 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-400 flex items-center justify-center border border-rose-800"
                                                      title="Delete Episode"
                                                    >
                                                      <Trash2 className="w-3 h-3" />
                                                    </button>
                                                  </div>
                                                </div>
                                              ))
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* =====================================================================
                  TAB: MOVIES MANAGEMENT
                  ===================================================================== */}
              {currentTab === 'movies' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="font-['Syne'] font-bold text-lg text-white">Feature Films</h2>
                      <p className="text-xs text-slate-400">Manage theatrical releases, runtimes, and direct streaming files.</p>
                    </div>
                    <button
                      onClick={() =>
                        setEditingMovie({
                          title: '',
                          slug: '',
                          description: '',
                          poster_url: '/images/poster_shadow_phantom.jpg',
                          backdrop_url: '/images/hero_mystic_alchemy.jpg',
                          runtime_minutes: 110,
                          rating: 9.0,
                          release_year: 2026,
                          classification: 'PG-13',
                          genres: ['Action', 'Fantasy'],
                          placements: ['popular_movies', 'trending'],
                          section_ids: [],
                          is_published: true
                        })
                      }
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/25"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Movie</span>
                    </button>
                  </div>

                  {editingMovie && (
                    <form onSubmit={handleSaveMovie} className="mb-6 p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="font-bold text-sm text-rose-400">
                          {editingMovie.id ? 'Edit Movie' : 'Create New Movie'}
                        </span>
                        <button type="button" onClick={() => setEditingMovie(null)} className="text-slate-400 hover:text-white">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Title</label>
                          <input
                            type="text"
                            required
                            value={editingMovie.title || ''}
                            onChange={(e) => setEditingMovie({ ...editingMovie, title: e.target.value })}
                            className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Runtime (Minutes)</label>
                          <input
                            type="number"
                            value={editingMovie.runtime_minutes || 110}
                            onChange={(e) => setEditingMovie({ ...editingMovie, runtime_minutes: Number(e.target.value) })}
                            className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Poster URL</label>
                          <input
                            type="text"
                            value={editingMovie.poster_url || ''}
                            onChange={(e) => setEditingMovie({ ...editingMovie, poster_url: e.target.value })}
                            className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Rating</label>
                          <input
                            type="number"
                            step="0.1"
                            value={editingMovie.rating || 9.0}
                            onChange={(e) => setEditingMovie({ ...editingMovie, rating: Number(e.target.value) })}
                            className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Backdrop URL</label>
                          <input
                            type="text"
                            value={editingMovie.backdrop_url || ''}
                            onChange={(e) => setEditingMovie({ ...editingMovie, backdrop_url: e.target.value })}
                            className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Classification</label>
                          <select
                            value={editingMovie.classification || 'PG-13'}
                            onChange={(e) => setEditingMovie({ ...editingMovie, classification: e.target.value as any })}
                            className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                          >
                            <option value="G">G - General Audiences</option>
                            <option value="PG">PG</option>
                            <option value="PG-13">PG-13</option>
                            <option value="TV-14">TV-14</option>
                            <option value="TV-MA">TV-MA (Mature)</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                            Video Stream URL (MP4 / HLS m3u8)
                          </label>
                          <input
                            type="text"
                            placeholder="https://commondatastorage.googleapis.com/.../movie.mp4"
                            value={editingMovie.stream_url || ''}
                            onChange={(e) => setEditingMovie({ ...editingMovie, stream_url: e.target.value })}
                            className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Description / Synopsis</label>
                        <textarea
                          rows={2}
                          value={editingMovie.description || ''}
                          onChange={(e) => setEditingMovie({ ...editingMovie, description: e.target.value })}
                          className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                        />
                      </div>

                      {/* Movie Genre Selection */}
                      <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                            <span>🎭 Select Movie Genres / Genre Chunie</span>
                          </label>
                          <span className="text-[10px] text-slate-400">
                            {editingMovie.genres?.length || 0} selected
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-2.5">
                          {POPULAR_GENRES.map((g) => {
                            const isSelected = editingMovie.genres?.includes(g);
                            return (
                              <button
                                key={g}
                                type="button"
                                onClick={() => {
                                  const cur = editingMovie.genres || [];
                                  const updated = isSelected ? cur.filter((x) => x !== g) : [...cur, g];
                                  setEditingMovie({ ...editingMovie, genres: updated });
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 border ${
                                  isSelected
                                    ? 'bg-rose-600 text-white border-rose-500 shadow-sm shadow-rose-600/30 font-bold'
                                    : 'bg-slate-900 hover:bg-slate-850 text-slate-300 border-slate-800'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3" />}
                                <span>{g}</span>
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Add custom movie genre..."
                            value={customMovieGenreInput}
                            onChange={(e) => setCustomMovieGenreInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const val = customMovieGenreInput.trim();
                                if (val) {
                                  const cur = editingMovie.genres || [];
                                  if (!cur.includes(val)) {
                                    setEditingMovie({ ...editingMovie, genres: [...cur, val] });
                                  }
                                  setCustomMovieGenreInput('');
                                }
                              }
                            }}
                            className="h-8 px-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 grow"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = customMovieGenreInput.trim();
                              if (val) {
                                const cur = editingMovie.genres || [];
                                if (!cur.includes(val)) {
                                  setEditingMovie({ ...editingMovie, genres: [...cur, val] });
                                }
                                setCustomMovieGenreInput('');
                              }
                            }}
                            className="h-8 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                          >
                            + Add Genre
                          </button>
                        </div>
                      </div>

                      {/* Movie Placement Selection (Kisme Dalna Hai) */}
                      <div className="p-3 rounded-xl bg-slate-950/80 border border-rose-900/30">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                            <span>📌 Show In / Kisme Dalna Hai (Placement)</span>
                          </label>
                          <span className="text-[10px] text-slate-400">Choose sections where movie will appear</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2.5">
                          {[
                            { key: 'hero', label: '🌟 Top Hero Slider', desc: 'Sabse upar banner me' },
                            { key: 'popular_movies', label: '🎬 Popular Movies', desc: 'Popular films row me' },
                            { key: 'trending', label: '🔥 Trending Now', desc: 'Trending section me' },
                            { key: 'top_rated', label: '🏆 Top Rated', desc: 'Top rated showcase' }
                          ].map((plc) => {
                            const isSelected = editingMovie.placements?.includes(plc.key);
                            return (
                              <button
                                key={plc.key}
                                type="button"
                                onClick={() => {
                                  const cur = editingMovie.placements || [];
                                  const updated = isSelected ? cur.filter((x) => x !== plc.key) : [...cur, plc.key];
                                  setEditingMovie({ ...editingMovie, placements: updated });
                                }}
                                className={`p-2 rounded-xl text-left border transition-all ${
                                  isSelected
                                    ? 'bg-rose-950/60 border-rose-500 text-rose-200 shadow-sm shadow-rose-900/40'
                                    : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-400'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-white">{plc.label}</span>
                                  {isSelected && <Check className="w-3 h-3 text-rose-400" />}
                                </div>
                                <span className="text-[10px] text-slate-400 block mt-0.5">{plc.desc}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Custom Sections Assignment */}
                        {sections.length > 0 && (
                          <div className="pt-2 border-t border-slate-800/80">
                            <span className="text-[10px] text-slate-400 block mb-1 font-semibold">Homepage Sections:</span>
                            <div className="flex flex-wrap gap-2">
                              {sections.map((sec) => {
                                const isChecked = editingMovie.section_ids?.includes(sec.id);
                                return (
                                  <label
                                    key={sec.id}
                                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] cursor-pointer border ${
                                      isChecked
                                        ? 'bg-rose-950/40 border-rose-700/60 text-rose-300'
                                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked || false}
                                      onChange={(e) => {
                                        const cur = editingMovie.section_ids || [];
                                        const updated = e.target.checked ? [...cur, sec.id] : cur.filter((id) => id !== sec.id);
                                        setEditingMovie({ ...editingMovie, section_ids: updated });
                                      }}
                                      className="accent-rose-600 rounded"
                                    />
                                    <span>{sec.title}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="submit"
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          <span>Save Movie</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingMovie(null)}
                          className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="grid grid-cols-1 gap-3">
                    {movieList.map((m) => (
                      <div key={m.id} className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <img src={m.poster_url} alt={m.title} className="w-12 h-16 object-cover rounded-xl border border-slate-800 shrink-0" />
                          <div className="min-w-0">
                            <h3 className="font-bold text-sm text-white truncate">{m.title}</h3>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                              <span>{m.release_year}</span>
                              <span>·</span>
                              <span>{m.runtime_minutes} mins</span>
                              <span>·</span>
                              <span className="text-amber-400 font-bold">{m.rating}★</span>
                              {m.stream_url ? (
                                <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-800">
                                  Stream Configured
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800">
                                  Signed Demo Stream
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => setEditingMovie(m)} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold">
                            Edit
                          </button>
                          <button onClick={() => handleDeleteMovie(m.id)} className="w-8 h-8 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800 flex items-center justify-center text-rose-400">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* =====================================================================
                  TAB: LIVE BROADCAST & ANNOUNCEMENTS
                  ===================================================================== */}
              {currentTab === 'broadcast' && appSettings && (
                <div className="max-w-xl flex flex-col gap-5">
                  <div>
                    <h2 className="font-['Syne'] font-bold text-lg text-white">Global Announcement System</h2>
                    <p className="text-xs text-slate-400">
                      Broadcast real-time push banners across the top of the mobile mini-app for all active community members.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-xs text-white block">Broadcast Banner Active</span>
                        <span className="text-[11px] text-slate-400">Live banner shown on mobile header</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={appSettings.announcementActive ?? false}
                        onChange={(e) => setAppSettings({ ...appSettings, announcementActive: e.target.checked })}
                        className="w-5 h-5 rounded text-cyan-500 accent-cyan-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Banner Message</label>
                      <input
                        type="text"
                        value={appSettings.announcementText || ''}
                        onChange={(e) => setAppSettings({ ...appSettings, announcementText: e.target.value })}
                        placeholder="e.g. 🔥 New Demon Slayer episode streaming now in 1080p!"
                        className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Banner Visual Style</label>
                      <div className="grid grid-cols-4 gap-2">
                        {(['info', 'warning', 'alert', 'gold'] as const).map((style) => (
                          <button
                            key={style}
                            type="button"
                            onClick={() => setAppSettings({ ...appSettings, announcementType: style })}
                            className={`py-2 rounded-xl text-xs font-bold uppercase transition-all border ${
                              appSettings.announcementType === style
                                ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                                : 'bg-slate-950 text-slate-400 border-slate-800'
                            }`}
                          >
                            {style}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        await api.adminSaveSettings(appSettings);
                        showNotification('Live broadcast banner updated!');
                      }}
                      className="mt-2 w-full h-10 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
                    >
                      Publish Broadcast Live
                    </button>
                  </div>
                </div>
              )}

              {/* =====================================================================
                  TAB: STREAM ENGINE & CDN CONTROLS
                  ===================================================================== */}
              {currentTab === 'streaming' && appSettings && (
                <div className="max-w-xl flex flex-col gap-5">
                  <div>
                    <h2 className="font-['Syne'] font-bold text-lg text-white">Stream Engine & CDN Settings</h2>
                    <p className="text-xs text-slate-400">
                      Configure high-performance video delivery, signed security tokens, and screen capture prevention.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Default Video Resolution</label>
                      <select
                        value={appSettings.defaultQuality}
                        onChange={(e) => setAppSettings({ ...appSettings, defaultQuality: e.target.value as VideoQuality })}
                        className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                      >
                        <option value="4K">4K Ultra HD (2160p)</option>
                        <option value="1080p">1080p Full HD (Recommended)</option>
                        <option value="720p">720p HD (Mobile Data Saver)</option>
                        <option value="480p">480p Standard</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Signed Playback Token Validity</label>
                      <select
                        value={appSettings.tokenValidityHours || 4}
                        onChange={(e) => setAppSettings({ ...appSettings, tokenValidityHours: Number(e.target.value) })}
                        className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                      >
                        <option value={1}>1 Hour (Strict DRM)</option>
                        <option value={4}>4 Hours (Standard Session)</option>
                        <option value={12}>12 Hours (Binge Session)</option>
                        <option value={24}>24 Hours (Extended Offline)</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div>
                        <span className="font-bold text-xs text-white block">Anti-Ripping Header Protection</span>
                        <span className="text-[11px] text-slate-400">Enforce Referrer & origin validation on stream requests</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={appSettings.antiRipProtection ?? true}
                        onChange={(e) => setAppSettings({ ...appSettings, antiRipProtection: e.target.checked })}
                        className="w-5 h-5 rounded text-cyan-500 accent-cyan-500 cursor-pointer"
                      />
                    </div>

                    <button
                      onClick={async () => {
                        await api.adminSaveSettings(appSettings);
                        showNotification('Streaming parameters updated successfully.');
                      }}
                      className="w-full h-10 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
                    >
                      Save Streaming Configuration
                    </button>
                  </div>
                </div>
              )}

              {/* =====================================================================
                  TAB: DATABASE & REAL-TIME SYNC ENGINE
                  ===================================================================== */}
              {currentTab === 'database' && (
                <div className="max-w-2xl flex flex-col gap-6">
                  {/* Header */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="font-['Syne'] font-bold text-lg text-white">Database & Real-Time Sync Hub</h2>
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 border border-emerald-500/30 text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        PERSISTENT DB CONNECTED
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      All changes made in this admin panel are permanently persisted to the backend database and automatically synchronized in real-time to all users' devices.
                    </p>
                  </div>

                  {/* Live Database Engine Card */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                      <div>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Storage Engine</span>
                        <span className="text-sm font-bold text-white font-mono flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          /data/stark_anime.db.json
                        </span>
                        <span className="text-[11px] text-slate-400 mt-0.5 block">
                          Atomic writes · Auto-recovery on reboot · Zero memory data loss
                        </span>
                      </div>

                      <button
                        onClick={handleForceSync}
                        disabled={isForceSyncing}
                        className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 transition-all shrink-0"
                      >
                        <Radio className={`w-4 h-4 ${isForceSyncing ? 'animate-spin' : 'animate-pulse text-cyan-200'}`} />
                        <span>{isForceSyncing ? 'Broadcasting...' : 'Force Push to All Devices'}</span>
                      </button>
                    </div>

                    {/* Quick Metric Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/60">
                        <span className="text-[10px] text-slate-400 block font-semibold">Database Version</span>
                        <span className="text-sm font-bold text-cyan-400 font-mono">v{dbStats?.version || 1}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/60">
                        <span className="text-[10px] text-slate-400 block font-semibold">Disk Storage</span>
                        <span className="text-sm font-bold text-white font-mono">{dbStats?.fileSizeKb || '0'} KB</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/60">
                        <span className="text-[10px] text-slate-400 block font-semibold">Total Titles</span>
                        <span className="text-sm font-bold text-emerald-400 font-mono">{animeList.length + movieList.length}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/60">
                        <span className="text-[10px] text-slate-400 block font-semibold">Total Episodes</span>
                        <span className="text-sm font-bold text-amber-400 font-mono">
                          {animeList.reduce((acc, a) => acc + (a.seasons?.reduce((s, sea) => s + (sea.episodes?.length || 0), 0) || 0), 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={handleExportDatabase}
                      className="p-5 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 flex flex-col items-center text-center gap-2 group transition-all"
                    >
                      <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                        <Download className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-xs text-white">Download Full Database (.json)</span>
                      <span className="text-[11px] text-slate-400">Export complete anime, seasons, episodes, movies & settings</span>
                    </button>

                    <label className="p-5 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 flex flex-col items-center text-center gap-2 cursor-pointer group transition-all">
                      <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                        <Upload className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-xs text-white">Restore from JSON File</span>
                      <span className="text-[11px] text-slate-400">Import and immediately broadcast to all user devices</span>
                      <input type="file" accept=".json" onChange={handleImportDatabase} className="hidden" />
                    </label>
                  </div>

                  {/* Master Seed / Recovery */}
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-xs text-white block">Master Library Synchronizer</span>
                      <span className="text-[11px] text-slate-400 block">
                        Synchronize 3 official Anime series with 4K multi-res episodes and 2 feature films into the persistent database.
                      </span>
                    </div>
                    <button
                      onClick={handleLoadSampleLibrary}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 shadow-md shadow-emerald-600/20"
                    >
                      Re-seed Master Library
                    </button>
                  </div>

                  {/* Integrity & Diagnostics */}
                  <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-850 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div className="text-xs">
                      <span className="font-bold text-white block">Automatic Device Synchronization Active</span>
                      <span className="text-slate-400 text-[11px]">
                        Clients automatically poll and listen for database version increments. Every update made here shows up within seconds on viewers' devices without requiring cache clears.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* =====================================================================
                  TAB: HERO BANNERS
                  ===================================================================== */}
              {currentTab === 'hero' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-['Syne'] font-bold text-lg text-white">Hero Spotlight Banners</h2>
                    <button
                      onClick={() =>
                        setEditingBanner({
                          title: 'New Release',
                          subtitle: 'Streaming in Ultra HD',
                          image_url: '/images/hero_cyber_samurai.jpg',
                          button_text: 'Watch Now',
                          display_order: 1,
                          is_enabled: true
                        })
                      }
                      className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Banner</span>
                    </button>
                  </div>

                  {editingBanner && (
                    <form onSubmit={handleSaveBanner} className="mb-6 p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-3">
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Banner Title"
                          value={editingBanner.title || ''}
                          onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })}
                          className="h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                        />
                        <input
                          type="text"
                          placeholder="Subtitle"
                          value={editingBanner.subtitle || ''}
                          onChange={(e) => setEditingBanner({ ...editingBanner, subtitle: e.target.value })}
                          className="h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                        />
                        <input
                          type="text"
                          placeholder="Image URL"
                          value={editingBanner.image_url || ''}
                          onChange={(e) => setEditingBanner({ ...editingBanner, image_url: e.target.value })}
                          className="h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                        />
                        <input
                          type="text"
                          placeholder="Button Text"
                          value={editingBanner.button_text || ''}
                          onChange={(e) => setEditingBanner({ ...editingBanner, button_text: e.target.value })}
                          className="h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="submit" className="px-4 py-2 bg-cyan-600 text-white font-bold text-xs rounded-xl">
                          Save Banner
                        </button>
                        <button type="button" onClick={() => setEditingBanner(null)} className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl">
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="grid grid-cols-1 gap-3">
                    {heroBanners.map((b) => (
                      <div key={b.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img src={b.image_url} alt={b.title} className="w-16 h-10 object-cover rounded-lg border border-slate-800" />
                          <div>
                            <h4 className="font-bold text-xs text-white">{b.title}</h4>
                            <span className="text-[11px] text-slate-400">{b.subtitle}</span>
                          </div>
                        </div>
                        <button onClick={() => setEditingBanner(b)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold text-slate-200">
                          Edit
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* =====================================================================
                  TAB: HOMEPAGE SECTIONS
                  ===================================================================== */}
              {currentTab === 'sections' && (
                <div>
                  <h2 className="font-['Syne'] font-bold text-lg text-white mb-2">Homepage Sections</h2>
                  <p className="text-xs text-slate-400 mb-4">Curate rows displayed on the main streaming feed.</p>
                  <div className="grid grid-cols-1 gap-3">
                    {sections.map((sec) => (
                      <div key={sec.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-xs text-white">{sec.title}</h4>
                          <span className="text-[11px] text-slate-400">{sec.subtitle}</span>
                        </div>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400 font-bold">
                          {sec.section_type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* =====================================================================
                  TAB: USERS MODERATION
                  ===================================================================== */}
              {currentTab === 'users' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="font-['Syne'] font-bold text-lg text-white">Community & Users</h2>
                      <p className="text-xs text-slate-400">Search members, monitor watch hours, and apply suspension flags.</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="Search user by username or ID..."
                      value={searchUserQuery}
                      onChange={(e) => setSearchUserQuery(e.target.value)}
                      className="w-full h-10 px-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {userList
                      .filter((u) => !searchUserQuery || String(u.first_name || '').toLowerCase().includes(searchUserQuery.toLowerCase()) || String(u.username || '').toLowerCase().includes(searchUserQuery.toLowerCase()))
                      .map((u) => (
                        <div key={u.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-cyan-950 border border-cyan-800/50 flex items-center justify-center font-bold text-xs text-cyan-400">
                              {(u.first_name || 'U')[0]}
                            </div>
                            <div>
                              <span className="font-bold text-xs text-white block">{u.first_name} {u.username ? `(@${u.username})` : ''}</span>
                              <span className="text-[11px] text-slate-400">Telegram ID: {u.id} · {u.totalMinutes || 0} mins watched</span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleToggleUserSuspend(u.id, u.is_suspended ?? false)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                              u.is_suspended
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-rose-950 text-rose-400 border border-rose-800'
                            }`}
                          >
                            {u.is_suspended ? 'Restore User' : 'Suspend User'}
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* =====================================================================
                  TAB: AUDIT LOGS
                  ===================================================================== */}
              {currentTab === 'audit' && (
                <div>
                  <h2 className="font-['Syne'] font-bold text-lg text-white mb-2">Audit Logs</h2>
                  <div className="flex flex-col gap-2">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-cyan-400 font-mono">{log.admin_username}</span>
                          <span className="text-slate-300">{log.action}</span>
                          <span className="text-slate-500">[{log.entity_type}]</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* =====================================================================
                  TAB: SETTINGS
                  ===================================================================== */}
              {currentTab === 'settings' && appSettings && (
                <div className="max-w-md flex flex-col gap-4">
                  <h2 className="font-['Syne'] font-bold text-lg text-white">Platform Settings</h2>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">App Brand Name</label>
                    <input
                      type="text"
                      value={appSettings.appName}
                      onChange={(e) => setAppSettings({ ...appSettings, appName: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Support URL</label>
                    <input
                      type="text"
                      value={appSettings.supportUrl}
                      onChange={(e) => setAppSettings({ ...appSettings, supportUrl: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Copyright Compliance Email</label>
                    <input
                      type="email"
                      value={appSettings.copyrightEmail}
                      onChange={(e) => setAppSettings({ ...appSettings, copyrightEmail: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>

                  <button
                    onClick={async () => {
                      await api.adminSaveSettings(appSettings);
                      showNotification('Settings saved.');
                    }}
                    className="mt-2 w-full h-10 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =====================================================================
            SEASON ADD / EDIT MODAL
            ===================================================================== */}
        {editingSeason && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                <div>
                  <h3 className="font-bold text-sm text-white">
                    {editingSeason.season ? 'Edit Season' : 'Add New Season'}
                  </h3>
                  <span className="text-[11px] text-cyan-400">
                    {animeList.find((a) => a.id === editingSeason.animeId)?.title}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingSeason(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveSeasonForm} className="p-4 flex flex-col gap-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Season #</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={seasonFormData.season_number}
                      onChange={(e) => setSeasonFormData({ ...seasonFormData, season_number: Number(e.target.value) })}
                      className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Season Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Season 1, Shibuya Incident Arc"
                      value={seasonFormData.title}
                      onChange={(e) => setSeasonFormData({ ...seasonFormData, title: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Description (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Brief arc or season summary..."
                    value={seasonFormData.description}
                    onChange={(e) => setSeasonFormData({ ...seasonFormData, description: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="season-published"
                    checked={seasonFormData.is_published}
                    onChange={(e) => setSeasonFormData({ ...seasonFormData, is_published: e.target.checked })}
                    className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                  />
                  <label htmlFor="season-published" className="text-xs text-slate-300 cursor-pointer">
                    Publish season to audience
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800 mt-2">
                  <button
                    type="button"
                    onClick={() => setEditingSeason(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20"
                  >
                    {editingSeason.season ? 'Save Changes' : 'Create Season'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =====================================================================
            EPISODE ADD / EDIT MODAL
            ===================================================================== */}
        {editingEpisode && (() => {
          const parentAnime = animeList.find((a) => a.id === editingEpisode.animeId);
          const parentSeason = parentAnime?.seasons?.find((s) => s.id === editingEpisode.seasonId);

          return (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
              <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
                  <div>
                    <h3 className="font-bold text-sm text-white">
                      {editingEpisode.episode ? 'Edit Episode' : 'Add New Episode'}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[11px] text-cyan-400 mt-0.5">
                      <span>{parentAnime?.title}</span>
                      <span>·</span>
                      <span className="text-slate-300 font-semibold">{parentSeason?.title || `Season ${parentSeason?.season_number}`}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingEpisode(null)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveEpisodeForm} className="p-4 overflow-y-auto flex flex-col gap-3.5">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Episode #</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={episodeFormData.episode_number}
                        onChange={(e) => setEpisodeFormData({ ...episodeFormData, episode_number: Number(e.target.value) })}
                        className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Episode Title</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. The Steel Ronin Awakens"
                        value={episodeFormData.title}
                        onChange={(e) => setEpisodeFormData({ ...episodeFormData, title: e.target.value })}
                        className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                      />
                    </div>
                  </div>

                  {/* Video Stream URL */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-semibold text-slate-400">
                        Video Stream URL (MP4 / HLS .m3u8)
                      </label>
                      <span className="text-[10px] text-slate-500">Optional: leave empty for fallback</span>
                    </div>
                    <input
                      type="text"
                      placeholder="https://.../video.mp4 or .m3u8"
                      value={episodeFormData.stream_url}
                      onChange={(e) => setEpisodeFormData({ ...episodeFormData, stream_url: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                    />

                    {/* Quick Demo Stream Presets */}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-500">Quick Demo:</span>
                      <button
                        type="button"
                        onClick={() => setEpisodeFormData({ ...episodeFormData, stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' })}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono"
                      >
                        Big Buck Bunny
                      </button>
                      <button
                        type="button"
                        onClick={() => setEpisodeFormData({ ...episodeFormData, stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4' })}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono"
                      >
                        Elephants Dream
                      </button>
                      <button
                        type="button"
                        onClick={() => setEpisodeFormData({ ...episodeFormData, stream_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4' })}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono"
                      >
                        Tears of Steel
                      </button>
                      {episodeFormData.stream_url && (
                        <button
                          type="button"
                          onClick={() => setEpisodeFormData({ ...episodeFormData, stream_url: '' })}
                          className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 font-mono"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Thumbnail URL & Duration */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Thumbnail URL</label>
                      <input
                        type="text"
                        placeholder="Image URL..."
                        value={episodeFormData.thumbnail_url}
                        onChange={(e) => setEpisodeFormData({ ...episodeFormData, thumbnail_url: e.target.value })}
                        className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                      />
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {parentAnime?.backdrop_url && (
                          <button
                            type="button"
                            onClick={() => setEpisodeFormData({ ...episodeFormData, thumbnail_url: parentAnime.backdrop_url! })}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                          >
                            Use Backdrop
                          </button>
                        )}
                        {parentAnime?.poster_url && (
                          <button
                            type="button"
                            onClick={() => setEpisodeFormData({ ...episodeFormData, thumbnail_url: parentAnime.poster_url })}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                          >
                            Use Poster
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Runtime (Mins)</label>
                      <input
                        type="number"
                        min={1}
                        value={episodeFormData.duration_minutes}
                        onChange={(e) => setEpisodeFormData({ ...episodeFormData, duration_minutes: Number(e.target.value) })}
                        className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">Episode Synopsis</label>
                    <textarea
                      rows={2}
                      placeholder="Brief episode plot summary..."
                      value={episodeFormData.description}
                      onChange={(e) => setEpisodeFormData({ ...episodeFormData, description: e.target.value })}
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>

                  {/* Published Toggle */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="ep-published"
                      checked={episodeFormData.is_published}
                      onChange={(e) => setEpisodeFormData({ ...episodeFormData, is_published: e.target.checked })}
                      className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                    />
                    <label htmlFor="ep-published" className="text-xs text-slate-300 cursor-pointer">
                      Publish episode immediately for viewer streaming
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800 mt-2">
                    <button
                      type="button"
                      onClick={() => setEditingEpisode(null)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20"
                    >
                      {editingEpisode.episode ? 'Save Episode' : 'Publish Episode'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
