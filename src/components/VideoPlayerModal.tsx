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
  AlertCircle
} from 'lucide-react';

interface VideoPlayerModalProps {
  content: Anime | Movie;
  initialSeason?: Season;
  initialEpisode?: Episode;
  initialPositionSeconds?: number;
  onClose: () => void;
  onEpisodeChange?: (season: Season, episode: Episode) => void;
}

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
  const [availableQualities, setAvailableQualities] = useState<VideoQuality[]>(['720p', '1080p']);

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
  const [activeMenuTab, setActiveMenuTab] = useState<'main' | 'quality' | 'speed' | 'subtitles' | 'audio'>('main');
  const [activeSubtitle, setActiveSubtitle] = useState<string>('English');
  const [activeAudio, setActiveAudio] = useState<string>('Japanese (Original)');

  // Auto-next state
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(null);
  const [endOfSeriesMessage, setEndOfSeriesMessage] = useState<string | null>(null);
  const autoNextTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Resume toast
  const [hasResumedPosition, setHasResumedPosition] = useState<boolean>(false);

  // 1. Fetch Signed Playback Token & Secure Stream URL
  const loadStreamToken = useCallback(async (quality: VideoQuality = currentQuality) => {
    try {
      setIsLoadingStream(true);
      setStreamError(null);

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
  }, [content.id, currentEpisode?.id, currentQuality, isMovie]);

  useEffect(() => {
    loadStreamToken();
  }, [loadStreamToken]);

  // Handle Controls Auto-hide
  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3500);
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
    videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration || duration, videoRef.current.currentTime + deltaSeconds));
    resetControlsTimeout();
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
  useEffect(() => {
    progressReportTimerRef.current = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) {
        const cur = Math.round(videoRef.current.currentTime);
        const dur = Math.round(videoRef.current.duration || duration);
        if (cur > 0 && dur > 0) {
          api.updateWatchProgress({
            contentType: isMovie ? 'movie' : 'anime',
            contentId: content.id,
            seasonId: currentSeason?.id,
            episodeId: currentEpisode?.id,
            positionSeconds: cur,
            durationSeconds: dur
          }).catch(() => {});
        }
      }
    }, 10000);

    return () => {
      if (progressReportTimerRef.current) clearInterval(progressReportTimerRef.current);
    };
  }, [content.id, currentEpisode?.id, currentSeason?.id, duration, isMovie]);

  // Navigate to Next Episode / Auto-Next logic
  const handleNextEpisode = useCallback(() => {
    if (isMovie) return;
    const anime = content as Anime;
    if (!anime.seasons || !currentSeason || !currentEpisode) return;

    const currentSeasonEps = currentSeason.episodes || [];
    const currentEpIndex = currentSeasonEps.findIndex((e) => e.id === currentEpisode.id);

    // 1. Next episode within current season
    if (currentEpIndex >= 0 && currentEpIndex < currentSeasonEps.length - 1) {
      const nextEp = currentSeasonEps[currentEpIndex + 1];
      setCurrentEpisode(nextEp);
      setCurrentTime(0);
      setAutoNextCountdown(null);
      onEpisodeChange?.(currentSeason, nextEp);
      return;
    }

    // 2. Next Season if current season ended
    const seasonIndex = anime.seasons.findIndex((s) => s.id === currentSeason.id);
    if (seasonIndex >= 0 && seasonIndex < anime.seasons.length - 1) {
      const nextSeason = anime.seasons[seasonIndex + 1];
      const nextEp = nextSeason.episodes?.[0];
      if (nextEp) {
        setCurrentSeason(nextSeason);
        setCurrentEpisode(nextEp);
        setCurrentTime(0);
        setAutoNextCountdown(null);
        onEpisodeChange?.(nextSeason, nextEp);
        return;
      }
    }

    // 3. Series Ended or Coming Soon
    const statusMsg = anime.status === 'Ongoing' ? 'Next Season Coming Soon!' : 'You have completed the series!';
    setEndOfSeriesMessage(statusMsg);
    setAutoNextCountdown(null);
  }, [content, currentEpisode, currentSeason, isMovie, onEpisodeChange]);

  const handlePrevEpisode = () => {
    if (isMovie) return;
    const anime = content as Anime;
    if (!anime.seasons || !currentSeason || !currentEpisode) return;

    const currentSeasonEps = currentSeason.episodes || [];
    const currentEpIndex = currentSeasonEps.findIndex((e) => e.id === currentEpisode.id);

    if (currentEpIndex > 0) {
      const prevEp = currentSeasonEps[currentEpIndex - 1];
      setCurrentEpisode(prevEp);
      setCurrentTime(0);
      onEpisodeChange?.(currentSeason, prevEp);
    }
  };

  // Video Events
  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (isMovie) {
      setEndOfSeriesMessage('Movie Completed');
      return;
    }

    // Start 5-second countdown to next episode
    setAutoNextCountdown(5);
  };

  // Countdown timer effect
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

  // Format seconds -> mm:ss or hh:mm:ss
  const formatTime = (secs: number) => {
    const s = Math.floor(secs);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const remainingSecs = s % 60;
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
    }
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center select-none"
    >
      {/* Main Video Element */}
      <div
        className="relative w-full h-full flex items-center justify-center overflow-hidden"
        onClick={() => resetControlsTimeout()}
      >
        {streamUrl ? (
          <video
            ref={videoRef}
            src={streamUrl}
            playsInline
            className="w-full h-full object-contain"
            onTimeUpdate={() => {
              if (videoRef.current) {
                setCurrentTime(videoRef.current.currentTime);
                // Check initial resume once
                if (!hasResumedPosition && initialPositionSeconds > 5 && videoRef.current.duration) {
                  videoRef.current.currentTime = initialPositionSeconds;
                  setHasResumedPosition(true);
                }
              }
            }}
            onDurationChange={() => {
              if (videoRef.current?.duration) {
                setDuration(videoRef.current.duration);
              }
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={handleVideoEnded}
            onError={() => {
              setStreamError('Failed to decode temporary streaming track.');
            }}
          />
        ) : null}

        {/* Loading Spinner */}
        {isLoadingStream && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm z-10 gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
            <span className="text-xs font-semibold text-slate-300">Generating Secure Stream Token...</span>
          </div>
        )}

        {/* Error Overlay */}
        {streamError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 p-6 text-center z-10 gap-3">
            <AlertCircle className="w-10 h-10 text-rose-500" />
            <h3 className="font-bold text-base text-white">Stream Authorization Error</h3>
            <p className="text-xs text-slate-400 max-w-sm">{streamError}</p>
            <button
              onClick={() => loadStreamToken(currentQuality)}
              className="mt-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Auto-Next Overlay */}
        {autoNextCountdown !== null && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 z-20 gap-3 animate-in fade-in">
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Up Next in {autoNextCountdown}s</span>
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
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold shadow-lg shadow-cyan-500/25 flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                Play Now
              </button>
            </div>
          </div>
        )}

        {/* End of Series / Movie Notice */}
        {endOfSeriesMessage && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 z-20 gap-3 animate-in fade-in">
            <div className="w-12 h-12 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white text-center">{endOfSeriesMessage}</h3>
            <p className="text-xs text-slate-400 text-center max-w-xs">
              Thank you for streaming on Stark Anime. Content is licensed and distributed with authorization.
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
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* OVERLAY CONTROLS (Fade in/out) */}
        <div
          className={`absolute inset-0 flex flex-col justify-between p-4 pointer-events-none transition-opacity duration-300 ${
            showControls ? 'opacity-100 bg-gradient-to-b from-black/80 via-transparent to-black/90' : 'opacity-0'
          }`}
        >
          {/* Top Bar: Back / Content Title / Settings */}
          <div className="flex items-center justify-between pointer-events-auto">
            <button
              onClick={() => {
                haptic.impact('light');
                onClose();
              }}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-black/50 hover:bg-black/80 backdrop-blur-md text-white border border-white/10"
              aria-label="Close Player"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center px-2 max-w-[65%]">
              <h4 className="text-sm font-bold text-white tracking-tight line-clamp-1">{content.title}</h4>
              <span className="text-[11px] text-cyan-400 font-medium">
                {isMovie
                  ? 'Movie Feature'
                  : `S${currentSeason?.season_number || 1} E${currentEpisode?.episode_number || 1}: ${currentEpisode?.title || ''}`}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  haptic.selection();
                  setShowSettingsMenu(!showSettingsMenu);
                  setActiveMenuTab('main');
                }}
                className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl backdrop-blur-md border transition-all ${
                  showSettingsMenu ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-black/50 hover:bg-black/80 text-white border-white/10'
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
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-300 hover:text-white active:scale-90 transition-all"
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
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-xl shadow-cyan-500/40 active:scale-95 transition-all"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-7 h-7 fill-white" /> : <Play className="w-7 h-7 fill-white ml-0.5" />}
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
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-300 hover:text-white active:scale-90 transition-all"
                title="Next Episode"
                aria-label="Next Episode"
              >
                <SkipForward className="w-6 h-6" />
              </button>
            )}
          </div>

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
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:h-2 transition-all"
              />
              <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                {formatTime(duration)}
              </span>
            </div>

            {/* Bottom Actions Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleMute}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-300 hover:text-white"
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                </button>

                <div className="flex items-center gap-1 text-[10px] font-mono bg-slate-900/80 border border-slate-800 px-2 py-1 rounded text-cyan-400">
                  <ShieldCheck className="w-3 h-3 text-cyan-400" />
                  <span>{currentQuality}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
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
                  <span className="text-cyan-400 font-mono">{currentQuality}</span>
                </button>

                {/* Speed Select */}
                <button
                  onClick={() => setActiveMenuTab('speed')}
                  className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-800/80 transition-colors"
                >
                  <span className="font-medium">Speed</span>
                  <span className="text-cyan-400 font-mono">{playbackSpeed}x</span>
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
                  <span className="text-cyan-400">{activeSubtitle}</span>
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
                  <span className="text-cyan-400 truncate max-w-[90px]">{activeAudio}</span>
                </button>
              </div>
            )}

            {/* Quality Submenu */}
            {activeMenuTab === 'quality' && (
              <div className="flex flex-col gap-1 text-xs">
                <button
                  onClick={() => setActiveMenuTab('main')}
                  className="flex items-center gap-1 text-cyan-400 px-2 py-1 mb-1 font-semibold hover:underline"
                >
                  ← Back to Settings
                </button>
                <span className="text-[10px] text-slate-400 px-2">Authorized Stream Qualities</span>
                {availableQualities.map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      haptic.selection();
                      loadStreamToken(q);
                      setShowSettingsMenu(false);
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                      currentQuality === q ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'hover:bg-slate-800'
                    }`}
                  >
                    <span className="font-mono">{q}</span>
                    {currentQuality === q && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>
                ))}
              </div>
            )}

            {/* Speed Submenu */}
            {activeMenuTab === 'speed' && (
              <div className="flex flex-col gap-1 text-xs">
                <button
                  onClick={() => setActiveMenuTab('main')}
                  className="flex items-center gap-1 text-cyan-400 px-2 py-1 mb-1 font-semibold hover:underline"
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
                      playbackSpeed === spd ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'hover:bg-slate-800'
                    }`}
                  >
                    <span>{spd === 1 ? 'Normal (1x)' : `${spd}x`}</span>
                    {playbackSpeed === spd && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>
                ))}
              </div>
            )}

            {/* Subtitles Submenu */}
            {activeMenuTab === 'subtitles' && (
              <div className="flex flex-col gap-1 text-xs">
                <button
                  onClick={() => setActiveMenuTab('main')}
                  className="flex items-center gap-1 text-cyan-400 px-2 py-1 mb-1 font-semibold hover:underline"
                >
                  ← Back to Settings
                </button>
                {['Off', 'English', 'Spanish', 'French', 'Japanese'].map((sub) => (
                  <button
                    key={sub}
                    onClick={() => {
                      haptic.selection();
                      setActiveSubtitle(sub);
                      setShowSettingsMenu(false);
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                      activeSubtitle === sub ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'hover:bg-slate-800'
                    }`}
                  >
                    <span>{sub}</span>
                    {activeSubtitle === sub && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>
                ))}
              </div>
            )}

            {/* Audio Track Submenu */}
            {activeMenuTab === 'audio' && (
              <div className="flex flex-col gap-1 text-xs">
                <button
                  onClick={() => setActiveMenuTab('main')}
                  className="flex items-center gap-1 text-cyan-400 px-2 py-1 mb-1 font-semibold hover:underline"
                >
                  ← Back to Settings
                </button>
                {['Japanese (Original)', 'English (Dub)'].map((aud) => (
                  <button
                    key={aud}
                    onClick={() => {
                      haptic.selection();
                      setActiveAudio(aud);
                      setShowSettingsMenu(false);
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                      activeAudio === aud ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'hover:bg-slate-800'
                    }`}
                  >
                    <span>{aud}</span>
                    {activeAudio === aud && <Check className="w-3.5 h-3.5 text-cyan-400" />}
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
