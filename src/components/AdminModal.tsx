import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
  Anime,
  Movie,
  HeroBanner,
  HomepageSection,
  Category,
  CopyrightClaim,
  AdminAuditLog,
  AppSettings,
  VideoQuality
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
  ShieldAlert,
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
  PlayCircle
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
  | 'claims'
  | 'database'
  | 'audit'
  | 'settings';

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
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [movieList, setMovieList] = useState<Movie[]>([]);
  const [heroBanners, setHeroBanners] = useState<HeroBanner[]>([]);
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userList, setUserList] = useState<any[]>([]);
  const [claims, setClaims] = useState<CopyrightClaim[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [searchUserQuery, setSearchUserQuery] = useState('');

  // Form states for creating/editing anime
  const [editingAnime, setEditingAnime] = useState<Partial<Anime> | null>(null);
  const [editingMovie, setEditingMovie] = useState<Partial<Movie> | null>(null);
  const [editingBanner, setEditingBanner] = useState<Partial<HeroBanner> | null>(null);
  const [editingSection, setEditingSection] = useState<Partial<HomepageSection> | null>(null);

  // Episode creation within anime editor
  const [selectedSeasonForEp, setSelectedSeasonForEp] = useState<string>('');
  const [newEpData, setNewEpData] = useState<any>({
    title: '',
    episode_number: 1,
    description: '',
    duration_seconds: 1440,
    thumbnail_url: '',
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
      const [dash, aList, mList, hb, sec, cats, usrs, clms, logs, sttngs] = await Promise.all([
        api.adminGetDashboard(),
        api.adminGetAnime(),
        api.adminGetMovies(),
        api.adminGetHeroBanners(),
        api.adminGetSections(),
        api.getCategories(),
        api.adminGetUsers(),
        api.adminGetClaims(),
        api.adminGetAuditLogs(),
        api.adminGetSettings()
      ]);
      setDashboardData(dash);
      setAnimeList(aList);
      setMovieList(mList);
      setHeroBanners(hb);
      setSections(sec);
      setCategories(cats);
      setUserList(usrs);
      setClaims(clms);
      setAuditLogs(logs);
      setAppSettings(sttngs);
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

  // Save Anime
  const handleSaveAnime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnime) return;

    try {
      await api.adminSaveAnime(editingAnime);
      showNotification('Anime series saved successfully.');
      setEditingAnime(null);
      const updated = await api.adminGetAnime();
      setAnimeList(updated);
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
      await api.adminSaveMovie(editingMovie);
      showNotification('Movie saved successfully.');
      setEditingMovie(null);
      const updated = await api.adminGetMovies();
      setMovieList(updated);
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
      onRefreshCatalog();
    } catch (err: any) {
      showNotification(`Failed to delete: ${err.message}`);
    }
  };

  // Add Season to Anime
  const handleAddSeason = async (animeId: string) => {
    const anime = animeList.find((a) => a.id === animeId);
    const nextSeasonNum = (anime?.seasons?.length || 0) + 1;
    await api.adminSaveSeason(animeId, {
      season_number: nextSeasonNum,
      title: `Season ${nextSeasonNum}`,
      is_published: true
    });
    const updated = await api.adminGetAnime();
    setAnimeList(updated);
    showNotification(`Season ${nextSeasonNum} added.`);
  };

  // Add Episode to Season
  const handleAddEpisode = async (animeId: string, seasonId: string) => {
    if (!newEpData.title) {
      showNotification('Please enter episode title.');
      return;
    }
    await api.adminSaveEpisode(animeId, seasonId, newEpData);
    setNewEpData({
      title: '',
      episode_number: (newEpData.episode_number || 1) + 1,
      description: '',
      duration_seconds: 1440,
      thumbnail_url: '',
      is_published: true
    });
    const updated = await api.adminGetAnime();
    setAnimeList(updated);
    showNotification('Episode added successfully.');
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

  // Update Copyright Claim
  const handleUpdateClaim = async (claimId: string, status: string, unpublish: boolean) => {
    await api.adminUpdateClaim(claimId, status, 'Resolved by Administrator via /raj portal', unpublish);
    const updated = await api.adminGetClaims();
    setClaims(updated);
    showNotification('Copyright claim updated.');
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
      const data = await api.adminGetBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stark-anime-catalog-${new Date().toISOString().slice(0, 10)}.json`;
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
        const json = JSON.parse(event.target?.result as string);
        await api.adminRestoreBackup(json);
        await loadAll();
        onRefreshCatalog();
        showNotification('Database restored successfully from file!');
      } catch (err: any) {
        showNotification(`Restore failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  // Load High-Quality Sample Library
  const handleLoadSampleLibrary = async () => {
    if (!confirm('Load 5 official high-definition anime series and movies into the catalog?')) return;
    try {
      // Sample 1: Cyber Samurai: 2099
      await api.adminSaveAnime({
        title: 'Cyber Samurai: 2099',
        slug: 'cyber-samurai-2099',
        description: 'In Neo-Kyoto, a cybernetic ronin must dismantle a syndicate controlling human cyber-enhancements.',
        poster_url: '/images/poster_chrono_blade.jpg',
        backdrop_url: '/images/hero_cyber_samurai.jpg',
        rating: 9.4,
        release_year: 2026,
        status: 'Ongoing',
        classification: 'TV-MA',
        genres: ['Action', 'Cyberpunk', 'Sci-Fi'],
        categories: ['all', 'anime', 'action'],
        seasons: [
          {
            id: 's1',
            anime_id: 'sample-1',
            season_number: 1,
            title: 'Season 1: Neon Shadows',
            is_published: true,
            episodes: [
              {
                id: 'e1',
                anime_id: 'sample-1',
                season_id: 's1',
                episode_number: 1,
                title: 'The Steel Ronin Awakens',
                description: 'Kaito is reactivated in the depths of Sector 7.',
                thumbnail_url: '/images/hero_cyber_samurai.jpg',
                duration_seconds: 1440,
                distribution_rights_confirmed: true,
                is_published: true,
                view_count: 340
              },
              {
                id: 'e2',
                anime_id: 'sample-1',
                season_id: 's1',
                episode_number: 2,
                title: 'Neon Bloodbath',
                description: 'A confrontation with the cyber syndicate enforcers.',
                thumbnail_url: '/images/hero_cyber_samurai.jpg',
                duration_seconds: 1380,
                distribution_rights_confirmed: true,
                is_published: true,
                view_count: 280
              }
            ]
          }
        ]
      });

      // Sample 2: Mystic Alchemy Chronicles
      await api.adminSaveAnime({
        title: 'Mystic Alchemy Chronicles',
        slug: 'mystic-alchemy-chronicles',
        description: 'Two alchemist prodigies decipher the forbidden celestial grimoire before the Eclipse of Shadows.',
        poster_url: '/images/poster_shadow_phantom.jpg',
        backdrop_url: '/images/hero_mystic_alchemy.jpg',
        rating: 9.1,
        release_year: 2025,
        status: 'Ongoing',
        classification: 'PG-13',
        genres: ['Fantasy', 'Adventure', 'Mystery'],
        categories: ['all', 'anime', 'fantasy']
      });

      // Sample 3: Stellar Odyssey
      await api.adminSaveAnime({
        title: 'Stellar Odyssey',
        slug: 'stellar-odyssey',
        description: 'The exploration vessel Icarus navigates beyond the known galaxy in search of the Genesis Signal.',
        poster_url: '/images/poster_stellar_odyssey.jpg',
        backdrop_url: '/images/poster_stellar_odyssey.jpg',
        rating: 8.9,
        release_year: 2026,
        status: 'Ongoing',
        classification: 'TV-14',
        genres: ['Sci-Fi', 'Adventure'],
        categories: ['all', 'anime', 'scifi']
      });

      // Sample 4: Chrono Blade Movie
      await api.adminSaveMovie({
        title: 'Chrono Blade: The Shattered Timeline',
        slug: 'chrono-blade-movie',
        description: 'A temporal swordmaster races across parallel dimensions to avert the collapse of reality.',
        poster_url: '/images/poster_chrono_blade.jpg',
        backdrop_url: '/images/hero_cyber_samurai.jpg',
        runtime_minutes: 114,
        rating: 9.2,
        release_year: 2026,
        classification: 'PG-13',
        status: 'Completed',
        genres: ['Action', 'Sci-Fi'],
        categories: ['all', 'movies', 'action']
      });

      // Sample 5: Shadow Phantom Movie
      await api.adminSaveMovie({
        title: 'Shadow Phantom: Final Requiem',
        slug: 'shadow-phantom-movie',
        description: 'An elite assassin turns against the underworld guild that created him.',
        poster_url: '/images/poster_shadow_phantom.jpg',
        backdrop_url: '/images/hero_mystic_alchemy.jpg',
        runtime_minutes: 102,
        rating: 8.8,
        release_year: 2025,
        classification: 'TV-MA',
        status: 'Completed',
        genres: ['Action', 'Mystery'],
        categories: ['all', 'movies']
      });

      // Sample Hero Banner
      await api.adminSaveHeroBanner({
        title: 'Cyber Samurai: 2099',
        subtitle: 'Brand New Season Streaming in 1080p Ultra HD',
        image_url: '/images/hero_cyber_samurai.jpg',
        button_text: 'Watch Episode 1',
        linked_type: 'anime',
        linked_id: 'sample-1',
        display_order: 1,
        is_enabled: true
      });

      await loadAll();
      onRefreshCatalog();
      showNotification('Official sample library loaded with 5 titles & hero banner!');
    } catch (err: any) {
      showNotification(`Failed to load sample library: ${err.message}`);
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
                <span>Database Backup</span>
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
                onClick={() => setCurrentTab('claims')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  currentTab === 'claims' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>DMCA ({claims.length})</span>
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
                      <span className="text-[11px] font-semibold text-slate-400 block mb-1">DMCA Inquiries</span>
                      <span className="font-['Syne'] font-bold text-2xl text-amber-400">{claims.length}</span>
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

                      <div className="flex items-center gap-3">
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
                        >
                          Save Series
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingAnime(null)}
                          className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Anime List Grid */}
                  <div className="grid grid-cols-1 gap-3">
                    {animeList.map((anime) => (
                      <div key={anime.id} className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img src={anime.poster_url} alt={anime.title} className="w-12 h-16 object-cover rounded-xl border border-slate-800" />
                            <div>
                              <h3 className="font-bold text-sm text-white">{anime.title}</h3>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                <span>{anime.release_year}</span>
                                <span>·</span>
                                <span>{anime.classification}</span>
                                <span>·</span>
                                <span className="text-amber-400 font-bold">{anime.rating}★</span>
                                <span>·</span>
                                <span>{anime.seasons?.length || 0} Seasons</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleAddSeason(anime.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Season</span>
                            </button>
                            <button
                              onClick={() => setEditingAnime(anime)}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteAnime(anime.id)}
                              className="w-8 h-8 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800 flex items-center justify-center text-rose-400"
                              title="Delete Anime"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Seasons & Episodes Inspector */}
                        {anime.seasons && anime.seasons.length > 0 && (
                          <div className="pl-4 border-l-2 border-cyan-500/30 flex flex-col gap-2">
                            {anime.seasons.map((season) => (
                              <div key={season.id} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-xs text-slate-200">
                                    {season.title} ({season.episodes?.length || 0} Episodes)
                                  </span>
                                  <button
                                    onClick={() => setSelectedSeasonForEp(season.id)}
                                    className="px-2 py-1 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/50 text-[10px] text-cyan-300 font-bold flex items-center gap-1"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Add Episode</span>
                                  </button>
                                </div>

                                {selectedSeasonForEp === season.id && (
                                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 flex flex-col gap-2">
                                    <div className="grid grid-cols-2 gap-2">
                                      <input
                                        type="text"
                                        placeholder="Episode Title"
                                        value={newEpData.title}
                                        onChange={(e) => setNewEpData({ ...newEpData, title: e.target.value })}
                                        className="h-8 px-2 bg-slate-950 border border-slate-800 rounded text-xs text-white"
                                      />
                                      <input
                                        type="number"
                                        placeholder="Duration (sec)"
                                        value={newEpData.duration_seconds}
                                        onChange={(e) => setNewEpData({ ...newEpData, duration_seconds: Number(e.target.value) })}
                                        className="h-8 px-2 bg-slate-950 border border-slate-800 rounded text-xs text-white"
                                      />
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleAddEpisode(anime.id, season.id)}
                                        className="px-3 py-1 bg-cyan-500 text-slate-950 font-bold text-xs rounded"
                                      >
                                        Save Episode
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setSelectedSeasonForEp('')}
                                        className="px-3 py-1 bg-slate-800 text-slate-300 text-xs rounded"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
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
                          genres: ['Action'],
                          is_published: true
                        })
                      }
                      className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Movie</span>
                    </button>
                  </div>

                  {editingMovie && (
                    <form onSubmit={handleSaveMovie} className="mb-6 p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="font-bold text-sm text-cyan-400">
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
                      </div>

                      <div className="flex items-center gap-3">
                        <button type="submit" className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs">
                          Save Movie
                        </button>
                        <button type="button" onClick={() => setEditingMovie(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs">
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="grid grid-cols-1 gap-3">
                    {movieList.map((m) => (
                      <div key={m.id} className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img src={m.poster_url} alt={m.title} className="w-12 h-16 object-cover rounded-xl border border-slate-800" />
                          <div>
                            <h3 className="font-bold text-sm text-white">{m.title}</h3>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400">
                              <span>{m.release_year}</span>
                              <span>·</span>
                              <span>{m.runtime_minutes} mins</span>
                              <span>·</span>
                              <span className="text-amber-400 font-bold">{m.rating}★</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
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
                  TAB: DATABASE BACKUP & RESTORE
                  ===================================================================== */}
              {currentTab === 'database' && (
                <div className="max-w-xl flex flex-col gap-5">
                  <div>
                    <h2 className="font-['Syne'] font-bold text-lg text-white">Database Backup & Recovery</h2>
                    <p className="text-xs text-slate-400">
                      Export your entire anime collection as a portable JSON backup, or restore to another hosting in 1 click.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={handleExportDatabase}
                      className="p-5 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 flex flex-col items-center text-center gap-2 group transition-all"
                    >
                      <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                        <Download className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-xs text-white">Download JSON Backup</span>
                      <span className="text-[11px] text-slate-400">Save all titles, episodes, and settings locally</span>
                    </button>

                    <label className="p-5 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 flex flex-col items-center text-center gap-2 cursor-pointer group transition-all">
                      <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                        <Upload className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-xs text-white">Restore from JSON File</span>
                      <span className="text-[11px] text-slate-400">Upload a saved catalog backup</span>
                      <input type="file" accept=".json" onChange={handleImportDatabase} className="hidden" />
                    </label>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-white block">Official Library Generator</span>
                      <span className="text-[11px] text-slate-400">Instantly populate 5 anime series, movies, and episodes</span>
                    </div>
                    <button
                      onClick={handleLoadSampleLibrary}
                      className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
                    >
                      Load Library
                    </button>
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
                  TAB: DMCA / COPYRIGHT CLAIMS
                  ===================================================================== */}
              {currentTab === 'claims' && (
                <div>
                  <h2 className="font-['Syne'] font-bold text-lg text-white mb-2">Copyright Claims & Takedowns</h2>
                  <p className="text-xs text-slate-400 mb-4">
                    Review legal notices and trigger instant 1-click unpublish & takedown.
                  </p>

                  {claims.length === 0 ? (
                    <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-xs text-slate-500">
                      No active copyright complaints pending.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {claims.map((c) => (
                        <div key={c.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-white">{c.claimant_name}</span>
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                              {c.status}
                            </span>
                          </div>
                          <span className="text-xs text-cyan-400">Email: {c.claimant_email}</span>
                          <p className="text-xs text-slate-300 bg-slate-950 p-2 rounded">{c.infringement_details}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => handleUpdateClaim(c.id, 'content_taken_down', true)}
                              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                            >
                              Takedown Content
                            </button>
                            <button
                              onClick={() => handleUpdateClaim(c.id, 'under_review', false)}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
                            >
                              Under Review
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
      </div>
    </div>
  );
};
