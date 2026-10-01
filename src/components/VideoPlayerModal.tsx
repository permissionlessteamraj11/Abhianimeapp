import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Anime, Movie, Episode, VideoQuality, Season } from '../types';
import { api } from '../lib/api';
import { haptic } from '../lib/telegram';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Settings,
  SkipBack,
  SkipForward,
  X,
  Check,
  ShieldCheck,
  Subtitles,
  AudioLines,
  AlertCircle,
  Server,
  Layers,
  FastForward,
  Radio,
  Tv
} from 'lucide-react';

interface VideoPlayerModalProps {
  content: Anime | Movie;
  initialSeason?: Season;
  initialEpisode?: Episode;
  initialPositionSeconds?: number;
  onClose: () => void;
  onEpisodeChange?: (season: Season, episode: Episode) => void;
}

export type StreamServer = 'server1' | 'server2' | 'server3';

const SERVER_OPTIONS: { id: StreamServer; name: string; tag: string }[] = [
  { id: 'server1', name: 'Server 1 (Ultra CDN)', tag: 'Fast' },
  { id: 'server2', name: 'Server 2 (Backup HD)', tag: '1080p' },
  { id: 'server3', name: 'Server 3 (Direct Stream)', tag: 'HLS' }
];

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  content,
  initialSeason,
  initialEpisode,
  initialPositionSeconds = 0,
  onClose,
  onEpisodeChange
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressReportTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isMovie = 'runtime_minutes' in content;

  // Active state
  const [currentSeason, setCurrentSeason] = useState<Season | undefined>(initialSeason);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | undefined>(initialEpisode);
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [currentQuality, setCurrentQuality] = useState<VideoQuality>('1080p');
  const [availableQualities, setAvailableQualities] = useState<VideoQuality[]>(['360p', '480p', '720p', '1080p']);
  const [selectedServer, setSelectedServer] = useState<StreamServer>('server1');

  // Player controls
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(initialPositionSeconds);
  const [duration, setDuration] = useState<number>(isMovie ? content.runtime_minutes * 60 : 1440);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isLoadingStream, setIsLoadingStream] = useState<boolean>(true);
  const [streamError, setStreamError] = useState<string | null>(null);

  // Modals & Selectors
  const [showSettingsMenu, setShowSettingsMenu] = useState<boolean>(false);
  const [showEpisodeDrawer, setShowEpisodeDrawer] = useState<boolean>(false);
  const [activeMenuTab, setActiveMenuTab] = useState<'main' | 'quality' | 'speed' | 'subtitles' | 'audio' | 'server'>('main');
  const [activeSubtitle, setActiveSubtitle] = useState<string>('English');
  const [activeAudio, setActiveAudio] = useState<string>('Japanese (Original)');

  // Auto-next state
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(null);
  const [endOfSeriesMessage, setEndOfSeriesMessage] = useState<string | null>(null);
  const autoNextTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Resume toast
  const [hasResumedPosition, setHasResumedPosition] = useState<boolean>(false);

  // 1. Fetch Signed Playback Token & Stream URL
  const loadStreamToken = useCallback(async (quality: VideoQuality = currentQuality, server: StreamServer = selectedServer) => {
    try {
      setIsLoadingStream(true);
      setStreamError(null);

      // Direct custom stream URL configured in admin
      if (server === 'server3') {
        if (currentEpisode?.stream_url) {
          setStreamUrl(currentEpisode.stream_url);
          setIsLoadingStream(false);
          return;
        }
        if (isMovie && (content as Movie).stream_url) {
          setStreamUrl((content as Movie).stream_url!);
          setIsLoadingStream(false);
          return;
        }
      }

      if (currentEpisode?.stream_url && server === 'server1') {
        setStreamUrl(currentEpisode.stream_url);
        setIsLoadingStream(false);
        return;
      }
      if (isMovie && (content as Movie).stream_url && server === 'server1') {
        setStreamUrl((content as Movie).stream_url!);
        setIsLoadingStream(false);
        return;
      }

      const res = await api.getPlaybackToken({
        contentType: isMovie ? 'movie' : 'anime',
        contentId: content.id,
        episodeId: currentEpisode?.id,
        quality
      });

      setStreamUrl(res.streamUrl);
      setCurrentQuality(res.quality);
      if (res.availableQualities && res.availableQualities.length > 0) {
        setAvailableQualities(res.availableQualities);
      }
    } catch (err: any) {
      setStreamError(err.message || 'Authorized streaming access unavailable.');
    } finally {
      setIsLoadingStream(false);
    }
  }, [content, currentEpisode, currentQuality, isMovie, selectedServer]);

  useEffect(() => {
    loadStreamToken();
  }, [loadStreamToken]);

  // Handle Controls Auto-hide
  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showSettingsMenu && !showEpisodeDrawer) {
        setShowControls(false);
      }
    }, 3800);
  };

  const togglePlay = () => {
    haptic.impact('light');
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
    resetControlsTimeout();
  };

  const seekRelative = (deltaSeconds: number) => {
    haptic.selection();
    if (!videoRef.current) return;
    const maxDur = videoRef.current.duration || duration;
    videoRef.current.currentTime = Math.max(0, Math.min(maxDur, videoRef.current.currentTime + deltaSeconds));
    resetControlsTimeout();
  };

  const skipIntro = () => {
    haptic.impact('medium');
    seekRelative(85);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setCurrentTime(val);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
    resetControlsTimeout();
  };

  const toggleMute = () => {
    haptic.selection();
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
    resetControlsTimeout();
  };

  const toggleFullscreen = () => {
    haptic.selection();
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
    resetControlsTimeout();
  };

  // Report watch progress periodically (every 10 seconds)
  const reportProgress = useCallback(async () => {
    if (!videoRef.current) return;
    const pos = Math.round(videoRef.current.currentTime);
    const dur = Math.round(videoRef.current.duration || duration);
    if (pos > 0 && dur > 0) {
      try {
        await api.updateProgress({
          content_type: isMovie ? 'movie' : 'anime',
          content_id: content.id,
          season_id: currentSeason?.id,
          episode_id: currentEpisode?.id,
          position_seconds: pos,
          duration_seconds: dur
        });
      } catch {
        // silent fail
      }
    }
  }, [content.id, currentEpisode?.id, currentSeason?.id, duration, isMovie]);

  useEffect(() => {
    progressReportTimerRef.current = setInterval(() => {
      if (isPlaying) reportProgress();
    }, 10000);

    return () => {
      if (progressReportTimerRef.current) clearInterval(progressReportTimerRef.current);
    };
  }, [isPlaying, reportProgress]);

  // Video Event Handlers
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      if (initialPositionSeconds > 0 && !hasResumedPosition) {
        videoRef.current.currentTime = initialPositionSeconds;
        setHasResumedPosition(true);
      }
    }
  };

  // Find Next Episode
  const getNextEpisode = useCallback((): { season: Season; episode: Episode } | null => {
    if (isMovie || !('seasons' in content) || !content.seasons || !currentEpisode || !currentSeason) {
      return null;
    }

    const seasonEps = currentSeason.episodes || [];
    const currentEpIndex = seasonEps.findIndex((e) => e.id === currentEpisode.id);

    if (currentEpIndex >= 0 && currentEpIndex < seasonEps.length - 1) {
      return { season: currentSeason, episode: seasonEps[currentEpIndex + 1] };
    }

    const currentSeasonIndex = content.seasons.findIndex((s) => s.id === currentSeason.id);
    if (currentSeasonIndex >= 0 && currentSeasonIndex < content.seasons.length - 1) {
      const nextSeason = content.seasons[currentSeasonIndex + 1];
      if (nextSeason.episodes && nextSeason.episodes.length > 0) {
        return { season: nextSeason, episode: nextSeason.episodes[0] };
      }
    }

    return null;
  }, [content, currentEpisode, currentSeason, isMovie]);

  // Find Previous Episode
  const getPrevEpisode = useCallback((): { season: Season; episode: Episode } | null => {
    if (isMovie || !('seasons' in content) || !content.seasons || !currentEpisode || !currentSeason) {
      return null;
    }

    const seasonEps = currentSeason.episodes || [];
    const currentEpIndex = seasonEps.findIndex((e) => e.id === currentEpisode.id);

    if (currentEpIndex > 0) {
      return { season: currentSeason, episode: seasonEps[currentEpIndex - 1] };
    }

    const currentSeasonIndex = content.seasons.findIndex((s) => s.id === currentSeason.id);
    if (currentSeasonIndex > 0) {
      const prevSeason = content.seasons[currentSeasonIndex - 1];
      if (prevSeason.episodes && prevSeason.episodes.length > 0) {
        return { season: prevSeason, episode: prevSeason.episodes[prevSeason.episodes.length - 1] };
      }
    }

    return null;
  }, [content, currentEpisode, currentSeason, isMovie]);

  const handleNextEpisode = useCallback(() => {
    const next = getNextEpisode();
    if (next) {
      haptic.notification('success');
      setCurrentSeason(next.season);
      setCurrentEpisode(next.episode);
      setCurrentTime(0);
      setHasResumedPosition(true);
      setAutoNextCountdown(null);
      if (onEpisodeChange) onEpisodeChange(next.season, next.episode);
    }
  }, [getNextEpisode, onEpisodeChange]);

  const handlePrevEpisode = useCallback(() => {
    const prev = getPrevEpisode();
    if (prev) {
      haptic.selection();
      setCurrentSeason(prev.season);
      setCurrentEpisode(prev.episode);
      setCurrentTime(0);
      setHasResumedPosition(true);
      if (onEpisodeChange) onEpisodeChange(prev.season, prev.episode);
    }
  }, [getPrevEpisode, onEpisodeChange]);

  const handleVideoEnded = () => {
    reportProgress();
    const next = getNextEpisode();
    if (next) {
      setAutoNextCountdown(5);
    } else {
      setEndOfSeriesMessage(isMovie ? 'Feature Presentation Complete' : 'You have completed the latest released episode!');
    }
  };

  // Countdown timer for auto-next
  useEffect(() => {
    if (autoNextCountdown === null) return;
    if (autoNextCountdown <= 0) {
      handleNextEpisode();
      return;
    }

    autoNextTimerRef.current = setTimeout(() => {
      setAutoNextCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => {
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
    };
  }, [autoNextCountdown, handleNextEpisode]);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const nextEpInfo = getNextEpisode();
  const allSeasonEpisodes = currentSeason?.episodes || [];

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none overflow-hidden"
      onMouseMove={resetControlsTimeout}
      onClick={resetControlsTimeout}
      onTouchStart={resetControlsTimeout}
    >
      {/* VIDEO ELEMENT CONTAINER */}
      <div className="relative w-full h-full flex items-center justify-center bg-black">
        {streamUrl ? (
          <video
            ref={videoRef}
            src={streamUrl}
            className="w-full h-full object-contain max-h-screen"
            playsInline
            autoPlay
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleVideoEnded}
            onError={() => setStreamError('Stream authorization expired or media format incompatible.')}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-950">
            <div className="w-12 h-12 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
          </div>
        )}

        {/* LOADING SPINNER */}
        {isLoadingStream && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm z-10 gap-3">
            <div className="w-12 h-12 rounded-full border-2 border-rose-500 border-t-transparent animate-spin drop-shadow-[0_0_12px_rgba(244,63,94,0.6)]" />
            <span className="text-xs font-semibold text-slate-200">Connecting to {selectedServer === 'server1' ? 'Ultra CDN' : selectedServer === 'server2' ? 'HD Server' : 'Direct Server'}...</span>
          </div>
        )}

        {/* ERROR OVERLAY */}
        {streamError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 p-6 text-center z-10 gap-3">
            <AlertCircle className="w-12 h-12 text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
            <h3 className="font-bold text-base text-white">Stream Authorization Error</h3>
            <p className="text-xs text-slate-400 max-w-sm">{streamError}</p>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => loadStreamToken(currentQuality, selectedServer)}
                className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-600/30"
              >
                Retry Connection
              </button>
              <button
                onClick={() => {
                  setSelectedServer(selectedServer === 'server1' ? 'server2' : 'server1');
                  loadStreamToken(currentQuality, selectedServer === 'server1' ? 'server2' : 'server1');
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
              >
                Switch Server
              </button>
            </div>
          </div>
        )}

        {/* AUTO-NEXT OVERLAY */}
        {autoNextCountdown !== null && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 z-20 gap-3 animate-in fade-in">
            <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Up Next in {autoNextCountdown}s</span>
            <h3 className="text-lg font-bold text-white text-center">
              Next Episode Playing Automatically
            </h3>
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={() => setAutoNextCountdown(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleNextEpisode}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                Play Now
              </button>
            </div>
          </div>
        )}

        {/* END OF SERIES NOTICE */}
        {endOfSeriesMessage && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 z-20 gap-3 animate-in fade-in">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white text-center">{endOfSeriesMessage}</h3>
            <p className="text-xs text-slate-400 text-center max-w-xs">
              Thank you for streaming on Stark Anime. All content is distributed with authorization.
            </p>
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => {
                  setEndOfSeriesMessage(null);
                  if (videoRef.current) {
                    videoRef.current.currentTime = 0;
                    videoRef.current.play();
                  }
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Watch Again
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* OVERLAY CONTROLS (Fade in/out) */}
        <div
          className={`absolute inset-0 flex flex-col justify-between p-4 pointer-events-none transition-opacity duration-300 ${
            showControls ? 'opacity-100 bg-gradient-to-b from-black/85 via-black/20 to-black/90' : 'opacity-0'
          }`}
        >
          {/* Top Bar: Back / Content Title / Quick Switches */}
          <div className="flex items-center justify-between pointer-events-auto">
            <button
              onClick={() => {
                haptic.impact('light');
                onClose();
              }}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-black/60 hover:bg-black/90 backdrop-blur-md text-white border border-white/10"
              aria-label="Close Player"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center px-2 max-w-[55%]">
              <h4 className="text-sm font-bold text-white tracking-tight line-clamp-1">{content.title}</h4>
              <span className="text-[11px] text-rose-400 font-semibold flex items-center gap-1">
                {isMovie
                  ? 'Movie Feature • HD'
                  : `S${currentSeason?.season_number || 1} E${currentEpisode?.episode_number || 1}: ${currentEpisode?.title || ''}`}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Episodes Drawer Toggle (if anime has episodes) */}
              {!isMovie && allSeasonEpisodes.length > 0 && (
                <button
                  onClick={() => {
                    haptic.selection();
                    setShowEpisodeDrawer(!showEpisodeDrawer);
                    setShowSettingsMenu(false);
                  }}
                  className={`min-h-[40px] px-2.5 py-1.5 flex items-center gap-1.5 rounded-xl backdrop-blur-md border text-xs font-semibold transition-all ${
                    showEpisodeDrawer
                      ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-600/30'
                      : 'bg-black/60 hover:bg-black/80 text-slate-200 border-white/10'
                  }`}
                  title="View Episode List"
                >
                  <Layers className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden sm:inline">Episodes</span>
                </button>
              )}

              {/* Settings Toggle */}
              <button
                onClick={() => {
                  haptic.selection();
                  setShowSettingsMenu(!showSettingsMenu);
                  setShowEpisodeDrawer(false);
                  setActiveMenuTab('main');
                }}
                className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl backdrop-blur-md border transition-all ${
                  showSettingsMenu ? 'bg-rose-600/30 border-rose-500 text-rose-400' : 'bg-black/60 hover:bg-black/80 text-white border-white/10'
                }`}
                aria-label="Playback Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Center Playback Controls */}
          <div className="flex items-center justify-center gap-6 sm:gap-10 pointer-events-auto">
            {!isMovie && (
              <button
                onClick={handlePrevEpisode}
                disabled={!getPrevEpisode()}
                className={`min-h-[44px] min-w-[44px] flex items-center justify-center transition-all ${
                  getPrevEpisode() ? 'text-slate-200 hover:text-white active:scale-90' : 'text-slate-600 cursor-not-allowed'
                }`}
                title="Previous Episode"
                aria-label="Previous Episode"
              >
                <SkipBack className="w-6 h-6" />
              </button>
            )}

            <button
              onClick={() => seekRelative(-10)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-300 hover:text-white active:scale-90 transition-all"
              title="Rewind 10s"
              aria-label="Rewind 10 seconds"
            >
              <RotateCcw className="w-6 h-6" />
            </button>

            <button
              onClick={togglePlay}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-rose-600 to-red-600 text-white flex items-center justify-center shadow-2xl shadow-rose-600/50 active:scale-95 transition-all border border-rose-400/40"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-8 h-8 fill-white" /> : <Play className="w-8 h-8 fill-white ml-1" />}
            </button>

            <button
              onClick={() => seekRelative(10)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-300 hover:text-white active:scale-90 transition-all"
              title="Forward 10s"
              aria-label="Forward 10 seconds"
            >
              <RotateCw className="w-6 h-6" />
            </button>

            {!isMovie && (
              <button
                onClick={handleNextEpisode}
                disabled={!nextEpInfo}
                className={`min-h-[44px] min-w-[44px] flex items-center justify-center transition-all ${
                  nextEpInfo ? 'text-slate-200 hover:text-white active:scale-90' : 'text-slate-600 cursor-not-allowed'
                }`}
                title="Next Episode"
                aria-label="Next Episode"
              >
                <SkipForward className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Quick Skip Intro pill button if anime */}
          {!isMovie && (
            <div className="flex justify-center pointer-events-auto">
              <button
                onClick={skipIntro}
                className="px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-rose-950/80 border border-rose-500/40 text-rose-300 text-[11px] font-bold backdrop-blur-md flex items-center gap-1.5 shadow-md shadow-black/60 active:scale-95 transition-all"
              >
                <FastForward className="w-3.5 h-3.5 text-rose-400" />
                <span>Skip Intro (+85s)</span>
              </button>
            </div>
          )}

          {/* Bottom Bar: Scrubber & Secondary Controls */}
          <div className="flex flex-col gap-2 pointer-events-auto">
            {/* Scrubber Range */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-slate-300 tabular-nums">
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min={0}
                max={duration || 1}
                value={currentTime}
                onChange={handleSeekChange}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500 hover:h-2 transition-all"
              />
              <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                {formatTime(duration)}
              </span>
            </div>

            {/* Bottom Actions Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-300 hover:text-white"
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                </button>

                {/* Quality pill */}
                <button
                  onClick={() => {
                    setShowSettingsMenu(true);
                    setActiveMenuTab('quality');
                  }}
                  className="flex items-center gap-1 text-[10px] font-mono bg-slate-900/80 border border-rose-500/30 px-2 py-1 rounded-lg text-rose-300 hover:border-rose-400"
                >
                  <ShieldCheck className="w-3 h-3 text-rose-400" />
                  <span>{currentQuality}</span>
                </button>

                {/* Server pill */}
                <button
                  onClick={() => {
                    setShowSettingsMenu(true);
                    setActiveMenuTab('server');
                  }}
                  className="hidden sm:flex items-center gap-1 text-[10px] bg-slate-900/80 border border-slate-800 px-2 py-1 rounded-lg text-slate-300 hover:text-white"
                >
                  <Server className="w-3 h-3 text-rose-400" />
                  <span>{selectedServer === 'server1' ? 'CDN 1' : selectedServer === 'server2' ? 'HD 2' : 'Direct'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Speed button */}
                <button
                  onClick={() => {
                    setShowSettingsMenu(true);
                    setActiveMenuTab('speed');
                  }}
                  className="text-[11px] font-mono font-bold text-slate-300 hover:text-rose-400 px-2 py-1 rounded-lg bg-black/40 border border-white/10"
                >
                  {playbackSpeed}x
                </button>

                {/* Fullscreen toggle */}
                <button
                  onClick={toggleFullscreen}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-300 hover:text-white"
                  aria-label="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* EPISODE QUICK DRAWER (Slide-up bottom sheet) */}
        {showEpisodeDrawer && !isMovie && (
          <div
            className="absolute bottom-0 inset-x-0 bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800 rounded-t-3xl p-4 shadow-2xl z-30 max-h-[50vh] overflow-y-auto animate-in slide-in-from-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <Tv className="w-4 h-4 text-rose-500" />
                <h4 className="font-bold text-sm text-white">
                  {currentSeason?.title || 'Episodes'} ({allSeasonEpisodes.length})
                </h4>
              </div>
              <button onClick={() => setShowEpisodeDrawer(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {allSeasonEpisodes.map((ep) => {
                const isSelected = currentEpisode?.id === ep.id;
                return (
                  <button
                    key={ep.id}
                    onClick={() => {
                      haptic.notification('success');
                      if (currentSeason) {
                        setCurrentEpisode(ep);
                        setCurrentTime(0);
                        setShowEpisodeDrawer(false);
                        if (onEpisodeChange) onEpisodeChange(currentSeason, ep);
                      }
                    }}
                    className={`p-2 rounded-xl flex items-center gap-3 text-left transition-all border ${
                      isSelected
                        ? 'bg-rose-950/50 border-rose-500/80 shadow-md shadow-rose-950'
                        : 'bg-slate-900/60 hover:bg-slate-850 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="relative w-16 aspect-video rounded-lg overflow-hidden bg-slate-800 shrink-0">
                      <img
                        src={ep.thumbnail_url || content.backdrop_url || content.poster_url}
                        alt={ep.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/images/hero_cyber_samurai.jpg';
                        }}
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-rose-600/30 flex items-center justify-center">
                          <Play className="w-4 h-4 fill-white text-white drop-shadow" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-mono font-bold px-1 py-0.5 rounded ${
                          isSelected ? 'bg-rose-600 text-white' : 'bg-slate-800 text-rose-400'
                        }`}>
                          EP {ep.episode_number}
                        </span>
                        <span className="font-semibold text-xs text-white truncate">{ep.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {Math.round((ep.duration_seconds || 1440) / 60)} min
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* SETTINGS DRAWER MENU */}
        {showSettingsMenu && (
          <div
            className="absolute bottom-16 right-4 w-72 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl p-3 shadow-2xl z-30 animate-in fade-in zoom-in-95 text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {activeMenuTab === 'main' && (
              <div className="flex flex-col gap-1 text-xs">
                <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-800/80 mb-1">
                  <span className="font-semibold text-slate-200">Playback Settings</span>
                  <button onClick={() => setShowSettingsMenu(false)} className="text-slate-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Quality Select */}
                <button
                  onClick={() => setActiveMenuTab('quality')}
                  className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-800/80 transition-colors"
                >
                  <span className="font-medium">Video Quality</span>
                  <span className="text-rose-400 font-mono font-bold">{currentQuality}</span>
                </button>

                {/* Server Select */}
                <button
                  onClick={() => setActiveMenuTab('server')}
                  className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-800/80 transition-colors"
                >
                  <span className="font-medium">Stream Server</span>
                  <span className="text-rose-400 font-medium">
                    {selectedServer === 'server1' ? 'Ultra CDN' : selectedServer === 'server2' ? 'HD Backup' : 'Direct'}
                  </span>
                </button>

                {/* Speed Select */}
                <button
                  onClick={() => setActiveMenuTab('speed')}
                  className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-800/80 transition-colors"
                >
                  <span className="font-medium">Speed</span>
                  <span className="text-rose-400 font-mono">{playbackSpeed}x</span>
                </button>

                {/* Subtitles Select */}
                <button
                  onClick={() => setActiveMenuTab('subtitles')}
                  className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-800/80 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <Subtitles className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium">Subtitles</span>
                  </div>
                  <span className="text-rose-400">{activeSubtitle}</span>
                </button>

                {/* Audio Select */}
                <button
                  onClick={() => setActiveMenuTab('audio')}
                  className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-800/80 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <AudioLines className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium">Audio Track</span>
                  </div>
                  <span className="text-rose-400 truncate max-w-[90px]">{activeAudio}</span>
                </button>
              </div>
            )}

            {/* Quality Submenu */}
            {activeMenuTab === 'quality' && (
              <div className="flex flex-col gap-1 text-xs">
                <button
                  onClick={() => setActiveMenuTab('main')}
                  className="flex items-center gap-1 text-rose-400 px-2 py-1 mb-1 font-semibold hover:underline"
                >
                  ← Back to Settings
                </button>
                <span className="text-[10px] text-slate-400 px-2">Authorized Stream Qualities</span>
                {availableQualities.map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      haptic.selection();
                      loadStreamToken(q, selectedServer);
                      setShowSettingsMenu(false);
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                      currentQuality === q ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30' : 'hover:bg-slate-800'
                    }`}
                  >
                    <span className="font-mono">{q}</span>
                    {currentQuality === q && <Check className="w-3.5 h-3.5 text-rose-400" />}
                  </button>
                ))}
              </div>
            )}

            {/* Server Submenu */}
            {activeMenuTab === 'server' && (
              <div className="flex flex-col gap-1 text-xs">
                <button
                  onClick={() => setActiveMenuTab('main')}
                  className="flex items-center gap-1 text-rose-400 px-2 py-1 mb-1 font-semibold hover:underline"
                >
                  ← Back to Settings
                </button>
                <span className="text-[10px] text-slate-400 px-2">Select Active Streaming Gateway</span>
                {SERVER_OPTIONS.map((srv) => (
                  <button
                    key={srv.id}
                    onClick={() => {
                      haptic.selection();
                      setSelectedServer(srv.id);
                      loadStreamToken(currentQuality, srv.id);
                      setShowSettingsMenu(false);
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                      selectedServer === srv.id ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30' : 'hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Server className="w-3.5 h-3.5 text-slate-400" />
                      <span>{srv.name}</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-rose-300">
                      {srv.tag}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Speed Submenu */}
            {activeMenuTab === 'speed' && (
              <div className="flex flex-col gap-1 text-xs">
                <button
                  onClick={() => setActiveMenuTab('main')}
                  className="flex items-center gap-1 text-rose-400 px-2 py-1 mb-1 font-semibold hover:underline"
                >
                  ← Back to Settings
                </button>
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => {
                      haptic.selection();
                      setPlaybackSpeed(spd);
                      if (videoRef.current) videoRef.current.playbackRate = spd;
                      setShowSettingsMenu(false);
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                      playbackSpeed === spd ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30' : 'hover:bg-slate-800'
                    }`}
                  >
                    <span>{spd === 1 ? 'Normal (1x)' : `${spd}x`}</span>
                    {playbackSpeed === spd && <Check className="w-3.5 h-3.5 text-rose-400" />}
                  </button>
                ))}
              </div>
            )}

            {/* Subtitles Submenu */}
            {activeMenuTab === 'subtitles' && (
              <div className="flex flex-col gap-1 text-xs">
                <button
                  onClick={() => setActiveMenuTab('main')}
                  className="flex items-center gap-1 text-rose-400 px-2 py-1 mb-1 font-semibold hover:underline"
                >
                  ← Back to Settings
                </button>
                {['Off', 'English', 'Hindi', 'Spanish', 'Japanese'].map((sub) => (
                  <button
                    key={sub}
                    onClick={() => {
                      haptic.selection();
                      setActiveSubtitle(sub);
                      setShowSettingsMenu(false);
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                      activeSubtitle === sub ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30' : 'hover:bg-slate-800'
                    }`}
                  >
                    <span>{sub}</span>
                    {activeSubtitle === sub && <Check className="w-3.5 h-3.5 text-rose-400" />}
                  </button>
                ))}
              </div>
            )}

            {/* Audio Track Submenu */}
            {activeMenuTab === 'audio' && (
              <div className="flex flex-col gap-1 text-xs">
                <button
                  onClick={() => setActiveMenuTab('main')}
                  className="flex items-center gap-1 text-rose-400 px-2 py-1 mb-1 font-semibold hover:underline"
                >
                  ← Back to Settings
                </button>
                {['Japanese (Original)', 'English (Dub)', 'Hindi (Dub)'].map((aud) => (
                  <button
                    key={aud}
                    onClick={() => {
                      haptic.selection();
                      setActiveAudio(aud);
                      setShowSettingsMenu(false);
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                      activeAudio === aud ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30' : 'hover:bg-slate-800'
                    }`}
                  >
                    <span>{aud}</span>
                    {activeAudio === aud && <Check className="w-3.5 h-3.5 text-rose-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
