/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Anime,
  Movie,
  Category,
  HeroBanner,
  HomepageSection,
  SavedItem,
  WatchProgress,
  TelegramUser,
  AppSettings,
  Season,
  Episode
} from './types';
import { api } from './lib/api';
import { initTelegramWebApp, getTelegramUser, haptic } from './lib/telegram';
import { Header } from './components/Header';
import { CategoryTabs } from './components/CategoryTabs';
import { HeroCarousel } from './components/HeroCarousel';
import { ContentRow } from './components/ContentRow';
import { RecommendationGrid } from './components/RecommendationGrid';
import { BottomNavigation, NavTab } from './components/BottomNavigation';
import { SavedView } from './components/SavedView';
import { ProfileView } from './components/ProfileView';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { AnimeDetailsModal } from './components/AnimeDetailsModal';
import { MovieDetailsModal } from './components/MovieDetailsModal';
import { SearchModal } from './components/SearchModal';
import { AdminModal } from './components/AdminModal';
import {
  ContentPolicyModal,
  PrivacyPolicyModal,
  TermsModal,
  CopyrightClaimModal
} from './components/LegalModals';
import { ToastContainer, ToastMessage } from './components/Toast';
import { StarkLogoBadge } from './components/StarkLogo';

export default function App() {
  // Navigation
  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');

  // Core Data
  const [categories, setCategories] = useState<Category[]>([]);
  const [heroBanners, setHeroBanners] = useState<HeroBanner[]>([]);
  const [homepageSections, setHomepageSections] = useState<HomepageSection[]>([]);
  const [recommendations, setRecommendations] = useState<(Anime | Movie)[]>([]);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [watchHistory, setWatchHistory] = useState<WatchProgress[]>([]);
  const [continueWatching, setContinueWatching] = useState<WatchProgress[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [currentUser, setCurrentUser] = useState<TelegramUser>(getTelegramUser());

  // Loading & Error States
  const [isLoadingHome, setIsLoadingHome] = useState(true);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Modals
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  // Active Video Player Modal
  const [activePlayerContent, setActivePlayerContent] = useState<Anime | Movie | null>(null);
  const [activePlayerSeason, setActivePlayerSeason] = useState<Season | undefined>(undefined);
  const [activePlayerEpisode, setActivePlayerEpisode] = useState<Episode | undefined>(undefined);
  const [activePlayerInitialPos, setActivePlayerInitialPos] = useState<number>(0);

  // Legal Modals
  const [showContentPolicyModal, setShowContentPolicyModal] = useState(false);
  const [showPrivacyPolicyModal, setShowPrivacyPolicyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showCopyrightClaimModal, setShowCopyrightClaimModal] = useState(false);

  // Toast Helper
  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // 1. Initial Telegram and App Loading + Secret /raj Route Detection
  useEffect(() => {
    const checkAdminRoute = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();
      if (
        path === '/raj' ||
        path.startsWith('/raj') ||
        path.includes('raj') ||
        hash.includes('raj') ||
        search.includes('raj')
      ) {
        setShowAdminModal(true);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && e.key.toLowerCase() === 'a') || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a')) {
        setShowAdminModal(true);
      }
    };

    checkAdminRoute();
    window.addEventListener('popstate', checkAdminRoute);
    window.addEventListener('hashchange', checkAdminRoute);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', checkAdminRoute);
      window.removeEventListener('hashchange', checkAdminRoute);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleCloseAdmin = () => {
    setShowAdminModal(false);
    if (window.location.pathname.toLowerCase().includes('/raj') || window.location.hash.toLowerCase().includes('raj')) {
      window.history.replaceState({}, '', '/');
    }
  };

  const loadHomeData = useCallback(async () => {
    try {
      setIsLoadingHome(true);
      const homeData = await api.getHome();
      setCategories(homeData.categories || []);
      setHeroBanners(homeData.heroBanners || []);
      setHomepageSections(homeData.homepageSections || []);
      setAppSettings(homeData.settings);

      // Load initial recommendations
      const recs = await api.getRecommendations(9);
      setRecommendations(recs);

      // Load user saved & profile
      const [saved, profile] = await Promise.all([api.getSaved(), api.getProfile()]);
      setSavedItems(saved);
      setCurrentUser(profile.user);
      setContinueWatching(profile.continueWatching || []);
    } catch (err: any) {
      console.error('Error loading initial app data:', err);
      showToast('error', err.message || 'Failed to connect to streaming gateway.');
    } finally {
      setIsLoadingHome(false);
    }
  }, []);

  useEffect(() => {
    initTelegramWebApp();
    loadHomeData();
  }, [loadHomeData]);

  // Refresh dynamic recommendations
  const refreshRecommendations = async () => {
    try {
      setIsLoadingRecommendations(true);
      const recs = await api.getRecommendations(9);
      setRecommendations(recs);
      showToast('info', 'Recommendations refreshed.');
    } catch (err: any) {
      console.error('Failed to vary recommendations:', err);
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  // Saved items set for fast lookup
  const savedItemIds = new Set(savedItems.map((s) => s.content_id));

  // Toggle Save Item
  const handleToggleSave = async (item: Anime | Movie) => {
    const isCurrentlySaved = savedItemIds.has(item.id);
    const contentType = 'runtime_minutes' in item ? 'movie' : 'anime';

    try {
      if (isCurrentlySaved) {
        await api.removeSaved(contentType, item.id);
        setSavedItems((prev) => prev.filter((s) => s.content_id !== item.id));
        showToast('info', `Removed "${item.title}" from library.`);
      } else {
        const added = await api.addSaved(contentType, item.id);
        setSavedItems((prev) => [...prev, { ...added, content: item }]);
        showToast('success', `Saved "${item.title}" to library.`);
      }
    } catch (err: any) {
      showToast('error', err.message || 'Could not update saved status.');
    }
  };

  // Open Details Modal
  const handleSelectContent = async (item: Anime | Movie) => {
    haptic.impact('light');
    if ('runtime_minutes' in item) {
      // Movie
      try {
        const fullMovie = await api.getMovie(item.id);
        setSelectedMovie(fullMovie);
      } catch {
        setSelectedMovie(item as Movie);
      }
    } else {
      // Anime
      try {
        const fullAnime = await api.getAnime(item.id);
        setSelectedAnime(fullAnime);
      } catch {
        setSelectedAnime(item as Anime);
      }
    }
  };

  // Launch Video Player
  const handlePlayAnimeEpisode = (anime: Anime, season: Season, episode: Episode) => {
    setSelectedAnime(null);
    setActivePlayerContent(anime);
    setActivePlayerSeason(season);
    setActivePlayerEpisode(episode);
    setActivePlayerInitialPos(0);
  };

  const handlePlayMovie = (movie: Movie) => {
    setSelectedMovie(null);
    setActivePlayerContent(movie);
    setActivePlayerSeason(undefined);
    setActivePlayerEpisode(undefined);
    setActivePlayerInitialPos(0);
  };

  // Resume playback from Continue Watching card
  const handleResumeProgress = async (progress: WatchProgress) => {
    try {
      if (progress.content_type === 'movie') {
        const movie = await api.getMovie(progress.content_id);
        setActivePlayerContent(movie);
        setActivePlayerSeason(undefined);
        setActivePlayerEpisode(undefined);
        setActivePlayerInitialPos(progress.position_seconds || 0);
      } else {
        const anime = await api.getAnime(progress.content_id);
        const season = anime.seasons?.find((s) => s.id === progress.season_id) || anime.seasons?.[0];
        const episode = season?.episodes?.find((e) => e.id === progress.episode_id) || season?.episodes?.[0];
        setActivePlayerContent(anime);
        setActivePlayerSeason(season);
        setActivePlayerEpisode(episode);
        setActivePlayerInitialPos(progress.position_seconds || 0);
      }
    } catch (err: any) {
      showToast('error', 'Unable to resume playback session.');
    }
  };

  // Hero Banner Watch handler
  const handleHeroWatch = async (linkedType: 'anime' | 'movie' | 'category', linkedId: string) => {
    try {
      if (linkedType === 'movie') {
        const movie = await api.getMovie(linkedId);
        handlePlayMovie(movie);
      } else if (linkedType === 'anime') {
        const anime = await api.getAnime(linkedId);
        const season = anime.seasons?.[0];
        const ep = season?.episodes?.[0];
        if (season && ep) {
          handlePlayAnimeEpisode(anime, season, ep);
        } else {
          setSelectedAnime(anime);
        }
      } else {
        setActiveCategoryId(linkedId);
      }
    } catch (err) {
      console.error('Hero watch error:', err);
    }
  };

  // Hero Banner Details handler
  const handleHeroDetails = async (linkedType: 'anime' | 'movie' | 'category', linkedId: string) => {
    try {
      if (linkedType === 'movie') {
        const movie = await api.getMovie(linkedId);
        setSelectedMovie(movie);
      } else if (linkedType === 'anime') {
        const anime = await api.getAnime(linkedId);
        setSelectedAnime(anime);
      } else {
        setActiveCategoryId(linkedId);
      }
    } catch (err) {
      console.error('Hero details error:', err);
    }
  };

  // Clear user history
  const handleClearHistory = async () => {
    try {
      await api.clearWatchHistory();
      setContinueWatching([]);
      showToast('info', 'Watch history cleared.');
    } catch (err: any) {
      showToast('error', 'Failed to clear watch history.');
    }
  };

  // Delete User Data
  const handleDeleteMyData = async () => {
    try {
      await api.deleteUserData();
      setSavedItems([]);
      setContinueWatching([]);
      showToast('success', 'All user data wiped permanently.');
      setCurrentTab('home');
    } catch (err: any) {
      showToast('error', 'Failed to delete user data.');
    }
  };

  // Filter sections by category if active
  const filteredSections = homepageSections.filter((sec) => {
    if (activeCategoryId === 'all') return true;
    if (activeCategoryId === 'anime') return sec.section_type !== 'popular_movies';
    if (activeCategoryId === 'movies') return sec.section_type === 'popular_movies';
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex justify-center selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Toast Overlay */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Mobile-First Frame Container */}
      <div className="w-full max-w-md min-h-screen bg-slate-950 flex flex-col relative shadow-2xl border-x border-slate-900/60 pb-16">
        {/* Sticky Header */}
        <Header
          onOpenSearch={() => setShowSearchModal(true)}
          onOpenAdmin={() => setShowAdminModal(true)}
          maintenanceMode={appSettings?.maintenanceMode}
        />

        {/* TAB 1: HOME */}
        {currentTab === 'home' && (
          <main className="flex-1 flex flex-col pb-6">
            {/* Dynamic Category Tabs */}
            <CategoryTabs
              categories={categories}
              activeCategoryId={activeCategoryId}
              onSelectCategory={setActiveCategoryId}
            />

            {/* Large Hero Banner Carousel or Clean Brand Showcase */}
            {heroBanners.length > 0 ? (
              <HeroCarousel
                banners={heroBanners}
                autoplay={appSettings?.heroAutoplay ?? true}
                durationMs={appSettings?.heroDurationMs ?? 5000}
                onWatch={handleHeroWatch}
                onDetails={handleHeroDetails}
              />
            ) : (
              <div className="relative mx-4 my-3 p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800/80 shadow-2xl overflow-hidden">
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold bg-cyan-950/80 border border-cyan-500/30 px-2 py-0.5 rounded">
                    Official Streaming Hub
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">100% Authorized</span>
                </div>
                
                <div className="flex items-center gap-3.5 my-2">
                  <StarkLogoBadge size={54} rounded="xl" />
                  <div className="flex flex-col">
                    <span className="font-['Syne'] font-black text-2xl tracking-widest text-white leading-tight drop-shadow">
                      STARK
                    </span>
                    <span className="font-sans font-extrabold italic text-sm tracking-[0.3em] text-cyan-400 leading-tight">
                      ANIME
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Stream authorized anime series and feature films in 4K HDR with multi-language audio, crisp subtitles, and zero-piracy streaming protection.
                </p>
                <div className="flex items-center gap-2 mt-4 text-[11px] font-mono text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Stark Streaming Network Online</span>
                </div>
              </div>
            )}

            {/* Dynamic Content Rows or Empty Catalog State */}
            {isLoadingHome ? (
              <div className="p-6 flex flex-col gap-4">
                <div className="h-4 w-32 bg-slate-900 rounded animate-pulse" />
                <div className="flex gap-3">
                  <div className="w-28 aspect-[3/4] bg-slate-900 rounded-xl animate-pulse" />
                  <div className="w-28 aspect-[3/4] bg-slate-900 rounded-xl animate-pulse" />
                  <div className="w-28 aspect-[3/4] bg-slate-900 rounded-xl animate-pulse" />
                </div>
              </div>
            ) : filteredSections.some((s) => s.items && s.items.length > 0) ? (
              filteredSections.map((section) => (
                <ContentRow
                  key={section.id}
                  section={section}
                  savedItemIds={savedItemIds}
                  onSelectContent={handleSelectContent}
                  onToggleSave={handleToggleSave}
                />
              ))
            ) : (
              <div className="mx-4 my-6 p-8 rounded-2xl bg-slate-900/40 border border-slate-900 text-center flex flex-col items-center">
                <div className="mb-3">
                  <StarkLogoBadge size={56} rounded="2xl" />
                </div>
                <h3 className="font-bold text-sm text-white mb-1">Catalog Ready for Content</h3>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                  Titles published by the administrator will automatically populate these dynamic rows and recommendations.
                </p>
              </div>
            )}

            {/* 3-Column Recommendations Grid */}
            {recommendations.length > 0 && (
              <RecommendationGrid
                items={recommendations}
                savedItemIds={savedItemIds}
                onSelectContent={handleSelectContent}
                onToggleSave={handleToggleSave}
                onRefreshRecommendations={refreshRecommendations}
                isLoading={isLoadingRecommendations}
              />
            )}
          </main>
        )}

        {/* TAB 2: SAVED */}
        {currentTab === 'saved' && (
          <main className="flex-1">
            <SavedView
              savedItems={savedItems}
              onSelectContent={handleSelectContent}
              onRemoveSaved={(type, id) => {
                const item = savedItems.find((s) => s.content_id === id)?.content;
                if (item) handleToggleSave(item);
              }}
              onExploreHome={() => setCurrentTab('home')}
            />
          </main>
        )}

        {/* TAB 3: PROFILE */}
        {currentTab === 'profile' && (
          <main className="flex-1">
            <ProfileView
              user={currentUser}
              savedCount={savedItems.length}
              historyCount={continueWatching.length}
              totalWatchSeconds={continueWatching.reduce((acc, curr) => acc + (curr.position_seconds || 0), 0)}
              continueWatching={continueWatching}
              onResumeProgress={handleResumeProgress}
              onClearHistory={handleClearHistory}
              onOpenPrivacyPolicy={() => setShowPrivacyPolicyModal(true)}
              onOpenTerms={() => setShowTermsModal(true)}
              onOpenContentPolicy={() => setShowContentPolicyModal(true)}
              onOpenCopyrightClaim={() => setShowCopyrightClaimModal(true)}
              onDeleteMyData={handleDeleteMyData}
              onOpenAdmin={() => setShowAdminModal(true)}
            />
          </main>
        )}

        {/* Fixed Bottom Navigation: EXACTLY 3 items (Home, Saved, Profile) */}
        <BottomNavigation
          currentTab={currentTab}
          onChangeTab={setCurrentTab}
          savedBadgeCount={savedItems.length}
        />
      </div>

      {/* ===================================================================== */}
      {/* MODALS */}
      {/* ===================================================================== */}

      {/* Global Search Modal */}
      {showSearchModal && (
        <SearchModal
          categories={categories}
          savedItemIds={savedItemIds}
          onClose={() => setShowSearchModal(false)}
          onSelectContent={handleSelectContent}
          onToggleSave={handleToggleSave}
        />
      )}

      {/* Anime Details Modal */}
      {selectedAnime && (
        <AnimeDetailsModal
          anime={selectedAnime}
          isSaved={savedItemIds.has(selectedAnime.id)}
          onClose={() => setSelectedAnime(null)}
          onToggleSave={handleToggleSave}
          onPlayEpisode={handlePlayAnimeEpisode}
        />
      )}

      {/* Movie Details Modal */}
      {selectedMovie && (
        <MovieDetailsModal
          movie={selectedMovie}
          isSaved={savedItemIds.has(selectedMovie.id)}
          moreLikeThis={recommendations.filter((r) => r.id !== selectedMovie.id)}
          savedItemIds={savedItemIds}
          onClose={() => setSelectedMovie(null)}
          onToggleSave={handleToggleSave}
          onPlayMovie={handlePlayMovie}
          onSelectRelated={handleSelectContent}
        />
      )}

      {/* Video Player Modal */}
      {activePlayerContent && (
        <VideoPlayerModal
          content={activePlayerContent}
          initialSeason={activePlayerSeason}
          initialEpisode={activePlayerEpisode}
          initialPositionSeconds={activePlayerInitialPos}
          onClose={() => {
            setActivePlayerContent(null);
            loadHomeData(); // Refresh progress in profile/continue watching
          }}
          onEpisodeChange={(season, ep) => {
            setActivePlayerSeason(season);
            setActivePlayerEpisode(ep);
          }}
        />
      )}

      {/* Admin Panel Modal (Activated only by /raj secret URL) */}
      {showAdminModal && (
        <AdminModal
          onClose={handleCloseAdmin}
          onRefreshCatalog={loadHomeData}
        />
      )}

      {/* Content & Anti-Piracy Policy */}
      {showContentPolicyModal && (
        <ContentPolicyModal onClose={() => setShowContentPolicyModal(false)} />
      )}

      {/* Privacy Policy */}
      {showPrivacyPolicyModal && (
        <PrivacyPolicyModal onClose={() => setShowPrivacyPolicyModal(false)} />
      )}

      {/* Terms of Service */}
      {showTermsModal && (
        <TermsModal onClose={() => setShowTermsModal(false)} />
      )}

      {/* DMCA / Copyright Claim Form */}
      {showCopyrightClaimModal && (
        <CopyrightClaimModal onClose={() => setShowCopyrightClaimModal(false)} />
      )}
    </div>
  );
}
