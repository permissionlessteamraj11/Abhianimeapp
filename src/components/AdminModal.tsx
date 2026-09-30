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
  ShieldCheck
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
  | 'categories'
  | 'users'
  | 'claims'
  | 'audit'
  | 'settings';

export const AdminModal: React.FC<AdminModalProps> = ({ onClose, onRefreshCatalog }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(api.isAdminLoggedIn());
  const [username, setUsername] = useState('rajpapa');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);

  // Active admin tab
  const [currentTab, setCurrentTab] = useState<AdminTab>('overview');

  // Dashboard Stats
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
    distribution_rights_confirmed: false,
    is_published: true
  });

  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Load Dashboard Data when logged in
  useEffect(() => {
    if (!isLoggedIn) return;

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
          setLoginError('Admin session expired. Please sign in with username and password.');
        }
      }
    };
    loadAll();
  }, [isLoggedIn]);

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmittingLogin(true);
      setLoginError(null);
      await api.adminLogin(password.trim(), username.trim());
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

    if (editingAnime.is_published && !editingAnime.distribution_rights_confirmed) {
      alert('Content Distribution Rights confirmation is required before publishing.');
      return;
    }

    try {
      await api.adminSaveAnime(editingAnime);
      showNotification('Anime catalog record saved successfully.');
      setEditingAnime(null);
      const updated = await api.adminGetAnime();
      setAnimeList(updated);
      onRefreshCatalog();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Delete Anime
  const handleDeleteAnime = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this anime series?')) return;
    try {
      await api.adminDeleteAnime(id);
      showNotification('Anime series deleted.');
      setAnimeList((prev) => prev.filter((a) => a.id !== id));
      onRefreshCatalog();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Save Movie
  const handleSaveMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMovie) return;

    if (editingMovie.is_published && !editingMovie.distribution_rights_confirmed) {
      alert('Content Distribution Rights confirmation is required before publishing.');
      return;
    }

    try {
      await api.adminSaveMovie(editingMovie);
      showNotification('Movie record saved successfully.');
      setEditingMovie(null);
      const updated = await api.adminGetMovies();
      setMovieList(updated);
      onRefreshCatalog();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Save Banner
  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanner) return;

    try {
      await api.adminSaveHeroBanner(editingBanner);
      showNotification('Hero banner saved.');
      setEditingBanner(null);
      const updated = await api.adminGetHeroBanners();
      setHeroBanners(updated);
      onRefreshCatalog();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Takedown / Copyright claim action
  const handleUpdateClaim = async (claimId: string, status: string, unpublish: boolean) => {
    try {
      await api.adminUpdateClaim(claimId, status, 'Reviewed and actioned by admin.', unpublish);
      showNotification('Claim updated and takedown policy applied.');
      const updated = await api.adminGetClaims();
      setClaims(updated);
      onRefreshCatalog();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col select-none text-slate-100">
      {/* Top Bar */}
      <div className="h-14 px-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <StarkLogoBadge size={32} rounded="lg" />
          <span className="font-['Syne'] font-extrabold text-base text-white">
            Stark Anime Admin Portal
          </span>
          <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
            /raj
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isLoggedIn && (
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-rose-400 flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="bg-emerald-950 border-b border-emerald-500/40 p-2 text-center text-xs font-semibold text-emerald-200">
          {notification}
        </div>
      )}

      {/* Main Content */}
      {!isLoggedIn ? (
        /* Login Screen */
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-sm p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl">
            <div className="flex justify-center mb-4">
              <StarkLogoBadge size={64} rounded="2xl" />
            </div>
            <h2 className="text-center font-['Syne'] font-bold text-lg text-white mb-1">
              Administrator Authentication
            </h2>
            <p className="text-center text-xs text-slate-400 mb-5">
              Enter authorized administrator credentials to manage catalog, rights, and streaming policies.
            </p>

            {loginError && (
              <div className="mb-4 p-2.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="flex flex-col gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-400">Admin Username</label>
                  <span className="text-[10px] text-cyan-400 font-mono">Owner: rajpapa</span>
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="rajpapa"
                  autoComplete="username"
                  className="w-full h-10 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-400">Password</label>
                  <span className="text-[10px] text-cyan-400 font-mono">Key: 28@Rajpapa</span>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="28@Rajpapa"
                    autoComplete="current-password"
                    className="w-full h-10 px-3 pr-10 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Quick Fill Button */}
              <button
                type="button"
                onClick={() => {
                  setUsername('rajpapa');
                  setPassword('28@Rajpapa');
                  haptic.selection();
                }}
                className="text-[11px] py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-cyan-300 flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>⚡</span>
                <span>Auto-Fill Credentials (rajpapa / 28@Rajpapa)</span>
              </button>

              <button
                type="submit"
                disabled={isSubmittingLogin}
                className="mt-1 w-full h-11 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>{isSubmittingLogin ? 'Verifying...' : 'Sign In to Dashboard'}</span>
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Authenticated Admin Dashboard */
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Subnav Tabs */}
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
              <span>Sections</span>
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
              <span>DMCA Claims ({claims.length})</span>
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

          {/* Active Tab View */}
          <div className="flex-1 p-4 md:p-6 overflow-y-auto no-scrollbar">
            {/* OVERVIEW TAB */}
            {currentTab === 'overview' && dashboardData && (
              <div className="flex flex-col gap-5">
                <h2 className="font-['Syne'] font-bold text-lg text-white">Platform Analytics</h2>

                {/* Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                    <span className="text-[11px] text-slate-400 font-medium">Total Users</span>
                    <h3 className="text-xl font-bold font-mono text-white mt-1">
                      {dashboardData.stats.totalUsers}
                    </h3>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                    <span className="text-[11px] text-slate-400 font-medium">Catalog Views</span>
                    <h3 className="text-xl font-bold font-mono text-cyan-400 mt-1">
                      {dashboardData.stats.totalViews.toLocaleString()}
                    </h3>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                    <span className="text-[11px] text-slate-400 font-medium">Watch Hours</span>
                    <h3 className="text-xl font-bold font-mono text-amber-400 mt-1">
                      {dashboardData.stats.totalWatchHours} hrs
                    </h3>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                    <span className="text-[11px] text-slate-400 font-medium">Active Streams</span>
                    <h3 className="text-xl font-bold font-mono text-emerald-400 mt-1">
                      {dashboardData.stats.activeStreamSessions}
                    </h3>
                  </div>
                </div>

                {/* Storage & Compliance Notice */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Authorized Digital Distribution Standard</h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      All media streams are delivered via authenticated temporary signed URLs with 4-hour expiry. Downloads, scraping, and unauthorized redistribution are strictly locked down.
                    </p>
                  </div>
                </div>

                {/* Recent Audit Logs */}
                <div>
                  <h3 className="font-['Syne'] font-bold text-sm text-white mb-2">Recent Administrator Actions</h3>
                  <div className="flex flex-col gap-2">
                    {dashboardData.recentAuditLogs?.slice(0, 5).map((log: any) => (
                      <div
                        key={log.id}
                        className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-cyan-400 font-bold">{log.action}</span>
                          <span className="text-slate-400 font-mono text-[11px]">{log.entity_type}</span>
                        </div>
                        <span className="text-slate-500 text-[10px] font-mono">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ANIME MANAGEMENT TAB */}
            {currentTab === 'anime' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-['Syne'] font-bold text-lg text-white">Anime Series</h2>
                  <button
                    onClick={() =>
                      setEditingAnime({
                        title: '',
                        slug: '',
                        description: '',
                        poster_url: '',
                        backdrop_url: '',
                        release_year: 2026,
                        rating: 9.0,
                        classification: 'TV-14',
                        status: 'Ongoing',
                        language: 'Japanese',
                        available_audio: ['Japanese', 'English'],
                        available_subtitles: ['English'],
                        distribution_rights_confirmed: true,
                        distribution_license_notes: 'Confirmed license under studio distribution deed.',
                        is_published: true,
                        genres: ['Action', 'Sci-Fi'],
                        categories: ['anime', 'action'],
                        seasons: []
                      })
                    }
                    className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Anime</span>
                  </button>
                </div>

                {/* Edit / Create Form */}
                {editingAnime && (
                  <form onSubmit={handleSaveAnime} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 mb-6 flex flex-col gap-3">
                    <h3 className="font-bold text-sm text-cyan-400">
                      {editingAnime.id ? 'Edit Anime Series' : 'Create New Authorized Anime Series'}
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Title *</label>
                        <input
                          type="text"
                          required
                          value={editingAnime.title || ''}
                          onChange={(e) => setEditingAnime({ ...editingAnime, title: e.target.value })}
                          className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Alternative Title (Japanese)</label>
                        <input
                          type="text"
                          value={editingAnime.alt_title || ''}
                          onChange={(e) => setEditingAnime({ ...editingAnime, alt_title: e.target.value })}
                          className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Release Year</label>
                        <input
                          type="number"
                          value={editingAnime.release_year || 2026}
                          onChange={(e) => setEditingAnime({ ...editingAnime, release_year: Number(e.target.value) })}
                          className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Rating (0-10)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={editingAnime.rating || 9.0}
                          onChange={(e) => setEditingAnime({ ...editingAnime, rating: Number(e.target.value) })}
                          className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Classification</label>
                        <select
                          value={editingAnime.classification || 'TV-14'}
                          onChange={(e) => setEditingAnime({ ...editingAnime, classification: e.target.value as any })}
                          className="w-full h-9 px-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                        >
                          <option value="G">G - General</option>
                          <option value="PG">PG - Parental Guidance</option>
                          <option value="PG-13">PG-13</option>
                          <option value="TV-14">TV-14</option>
                          <option value="TV-MA">TV-MA</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
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
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Description</label>
                      <textarea
                        rows={2}
                        value={editingAnime.description || ''}
                        onChange={(e) => setEditingAnime({ ...editingAnime, description: e.target.value })}
                        className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                      />
                    </div>

                    {/* Rights Confirmation */}
                    <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/40">
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingAnime.distribution_rights_confirmed || false}
                          onChange={(e) =>
                            setEditingAnime({ ...editingAnime, distribution_rights_confirmed: e.target.checked })
                          }
                          className="mt-1 w-4 h-4 rounded text-cyan-500"
                        />
                        <div className="text-xs">
                          <span className="font-bold text-white block">
                            "I confirm that I own or have authorization to distribute this content." *
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Required under Stark Anime platform terms and DMCA distribution safe harbors.
                          </span>
                        </div>
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={editingAnime.is_published || false}
                          onChange={(e) => setEditingAnime({ ...editingAnime, is_published: e.target.checked })}
                          className="w-4 h-4 rounded text-cyan-500"
                        />
                        <span>Published to Catalog</span>
                      </label>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold"
                      >
                        Save Anime
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingAnime(null)}
                        className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {/* List Table */}
                <div className="flex flex-col gap-2">
                  {animeList.map((a) => (
                    <div
                      key={a.id}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <img src={a.poster_url} alt={a.title} className="w-10 h-14 object-cover rounded-lg" />
                        <div>
                          <h4 className="font-bold text-xs text-white">{a.title}</h4>
                          <span className="text-[11px] text-slate-400">
                            {a.release_year} · {a.rating} ★ · {a.seasons?.length || 0} seasons
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {a.is_published ? (
                              <span className="text-[9px] text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded">
                                Published
                              </span>
                            ) : (
                              <span className="text-[9px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                                Draft
                              </span>
                            )}
                            {a.distribution_rights_confirmed && (
                              <span className="text-[9px] text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded">
                                Rights Confirmed
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setEditingAnime(a)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteAnime(a.id)}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/40"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MOVIES TAB */}
            {currentTab === 'movies' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-['Syne'] font-bold text-lg text-white">Authorized Movies</h2>
                  <button
                    onClick={() =>
                      setEditingMovie({
                        title: '',
                        slug: '',
                        description: '',
                        poster_url: '',
                        backdrop_url: '',
                        release_year: 2026,
                        runtime_minutes: 110,
                        rating: 9.2,
                        classification: 'PG-13',
                        status: 'Completed',
                        language: 'Japanese',
                        available_audio: ['Japanese', 'English'],
                        available_subtitles: ['English'],
                        distribution_rights_confirmed: true,
                        distribution_license_notes: 'Theatrical VOD licensing verified.',
                        is_published: true,
                        genres: ['Action', 'Sci-Fi'],
                        categories: ['movies', 'action']
                      })
                    }
                    className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Movie</span>
                  </button>
                </div>

                {/* Edit Movie Form */}
                {editingMovie && (
                  <form onSubmit={handleSaveMovie} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 mb-6 flex flex-col gap-3">
                    <h3 className="font-bold text-sm text-cyan-400">Movie Configuration</h3>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Title *</label>
                      <input
                        type="text"
                        required
                        value={editingMovie.title || ''}
                        onChange={(e) => setEditingMovie({ ...editingMovie, title: e.target.value })}
                        className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
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
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">Release Year</label>
                        <input
                          type="number"
                          value={editingMovie.release_year || 2026}
                          onChange={(e) => setEditingMovie({ ...editingMovie, release_year: Number(e.target.value) })}
                          className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/40">
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingMovie.distribution_rights_confirmed || false}
                          onChange={(e) =>
                            setEditingMovie({ ...editingMovie, distribution_rights_confirmed: e.target.checked })
                          }
                          className="mt-1 w-4 h-4 rounded text-cyan-500"
                        />
                        <div className="text-xs">
                          <span className="font-bold text-white block">
                            "I confirm that I own or have authorization to distribute this content."
                          </span>
                        </div>
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <button type="submit" className="px-4 py-2 bg-cyan-600 text-white rounded-xl text-xs font-semibold">
                        Save Movie
                      </button>
                      <button type="button" onClick={() => setEditingMovie(null)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs">
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                <div className="flex flex-col gap-2">
                  {movieList.map((m) => (
                    <div key={m.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={m.poster_url} alt={m.title} className="w-10 h-14 object-cover rounded-lg" />
                        <div>
                          <h4 className="font-bold text-xs text-white">{m.title}</h4>
                          <span className="text-[11px] text-slate-400">
                            {m.runtime_minutes}m · {m.rating} ★ · {m.release_year}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setEditingMovie(m)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold text-slate-200"
                      >
                        Edit
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* HERO BANNERS TAB */}
            {currentTab === 'hero' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-['Syne'] font-bold text-lg text-white">Hero Banners (Max 5)</h2>
                    <p className="text-xs text-slate-400">Featured prominent carousel items on home page</p>
                  </div>
                  <button
                    onClick={() =>
                      setEditingBanner({
                        title: 'New Featured Title',
                        subtitle: 'Now Streaming in High Definition',
                        image_url: '',
                        linked_type: 'anime',
                        linked_id: 'anime-01',
                        button_text: 'Watch Now',
                        display_order: heroBanners.length + 1,
                        is_enabled: true
                      })
                    }
                    className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Banner</span>
                  </button>
                </div>

                {editingBanner && (
                  <form onSubmit={handleSaveBanner} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 mb-6 flex flex-col gap-3">
                    <h3 className="font-bold text-sm text-cyan-400">Banner Details</h3>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Title</label>
                      <input
                        type="text"
                        required
                        value={editingBanner.title || ''}
                        onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })}
                        className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Subtitle</label>
                      <input
                        type="text"
                        value={editingBanner.subtitle || ''}
                        onChange={(e) => setEditingBanner({ ...editingBanner, subtitle: e.target.value })}
                        className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Image URL</label>
                      <input
                        type="text"
                        value={editingBanner.image_url || ''}
                        onChange={(e) => setEditingBanner({ ...editingBanner, image_url: e.target.value })}
                        className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="submit" className="px-4 py-2 bg-cyan-600 text-white rounded-xl text-xs font-semibold">
                        Save Banner
                      </button>
                      <button type="button" onClick={() => setEditingBanner(null)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs">
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                <div className="flex flex-col gap-2">
                  {heroBanners.map((b) => (
                    <div key={b.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={b.image_url} alt={b.title} className="w-16 h-10 object-cover rounded-lg" />
                        <div>
                          <h4 className="font-bold text-xs text-white">{b.title}</h4>
                          <span className="text-[11px] text-slate-400">Order: {b.display_order}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setEditingBanner(b)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold text-slate-200"
                      >
                        Edit
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DMCA / COPYRIGHT CLAIMS TAB */}
            {currentTab === 'claims' && (
              <div>
                <h2 className="font-['Syne'] font-bold text-lg text-white mb-2">Copyright Claims & Takedowns</h2>
                <p className="text-xs text-slate-400 mb-4">
                  Review formal DMCA and copyright notices. Execute immediate content takedown if required.
                </p>

                {claims.length === 0 ? (
                  <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-xs text-slate-500">
                    No active copyright claims or infringement complaints pending.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {claims.map((c) => (
                      <div key={c.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-white">{c.claimant_name} ({c.organization || 'Individual'})</span>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                            c.status === 'content_taken_down'
                              ? 'bg-rose-950 text-rose-400 border border-rose-800'
                              : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}>
                            {c.status}
                          </span>
                        </div>
                        <span className="text-xs text-cyan-400">Contact: {c.claimant_email}</span>
                        <div className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-lg">
                          <span className="font-semibold block text-slate-400 mb-0.5">Infringement Allegation:</span>
                          {c.infringement_details}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => handleUpdateClaim(c.id, 'content_taken_down', true)}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                          >
                            Unpublish & Takedown Content
                          </button>
                          <button
                            onClick={() => handleUpdateClaim(c.id, 'under_review', false)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
                          >
                            Mark Under Review
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SETTINGS TAB */}
            {currentTab === 'settings' && appSettings && (
              <div className="max-w-md flex flex-col gap-4">
                <h2 className="font-['Syne'] font-bold text-lg text-white">Platform Configuration</h2>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Application Name</label>
                  <input
                    type="text"
                    value={appSettings.appName}
                    onChange={(e) => setAppSettings({ ...appSettings, appName: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Hero Slide Duration (ms)</label>
                  <input
                    type="number"
                    value={appSettings.heroDurationMs}
                    onChange={(e) => setAppSettings({ ...appSettings, heroDurationMs: Number(e.target.value) })}
                    className="w-full h-9 px-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-white block">Maintenance Mode</span>
                    <span className="text-[11px] text-slate-400">Lock non-admin users with friendly message</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={appSettings.maintenanceMode}
                    onChange={(e) => setAppSettings({ ...appSettings, maintenanceMode: e.target.checked })}
                    className="w-5 h-5 rounded text-cyan-500"
                  />
                </div>

                <button
                  onClick={async () => {
                    await api.adminSaveSettings(appSettings);
                    showNotification('Settings saved successfully.');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs"
                >
                  Save Global Settings
                </button>
              </div>
            )}

            {/* AUDIT LOGS */}
            {currentTab === 'audit' && (
              <div>
                <h2 className="font-['Syne'] font-bold text-lg text-white mb-3">Admin Audit Logs</h2>
                <div className="flex flex-col gap-2">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-cyan-400">{log.action}</span>
                        <span className="text-slate-500 text-[10px]">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                      <span className="text-slate-300 font-mono text-[11px]">
                        Admin: {log.admin_username} · Entity: {log.entity_type} ({log.entity_id || 'N/A'})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
