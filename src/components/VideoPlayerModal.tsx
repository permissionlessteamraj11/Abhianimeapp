import React, { useState, useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';
import { Anime, Movie, Episode, VideoQuality, Season, Comment, CommentReply } from '../types';
import { api } from '../lib/api';
import { haptic, getTelegramUser } from '../lib/telegram';
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
  Lock,
  Unlock,
  ThumbsUp,
  ThumbsDown,
  Bookmark,
  Flag,
  MoreHorizontal,
  MessageSquare,
  Send,
  Smile,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Clock,
  HardDrive,
  Film,
  Tv,
  CheckCircle2
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
  { id: 'server1', name: 'Server 1 (Ultra Fast)', tag: 'CDN' },
  { id: 'server2', name: 'Server 2 (Backup HD)', tag: '1080p' },
  { id: 'server3', name: 'Server 3 (Direct Stream)', tag: 'HLS' }
];

const EMOJI_OPTIONS = ['🔥', '❤️', '👏', '😱', '🍿', '💯', '😍', '🚀'];

// Smart stream URL parser supporting Google Drive, YouTube, Embeds, HLS, and Direct MP4
export function parseVideoStream(url: string): { type: 'video' | 'embed' | 'hls'; src: string } {
  if (!url) return { type: 'video', src: '' };
  const trimmed = url.trim();

  // Google Drive URLs: convert to preview embed for 100% reliable CORS-free playback
  const driveMatch = trimmed.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    const fileId = driveMatch[1];
    return {
      type: 'embed',
      src: `https://drive.google.com/file/d/${fileId}/preview`
    };
  }

  // YouTube Links
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'embed',
      src: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`
    };
  }

  // Generic iframe embed player (e.g. streamtape, doodstream, etc.)
  if (trimmed.includes('/embed/') || trimmed.includes('player.') || trimmed.includes('streamtape.com/e/') || trimmed.includes('dood.')) {
    return {
      type: 'embed',
      src: trimmed
    };
  }

  // HLS .m3u8 manifest
  if (trimmed.includes('.m3u8') || trimmed.includes('m3u8')) {
    return {
      type: 'hls',
      src: trimmed
    };
  }

  // Direct MP4 / MKV / WebM
  return {
    type: 'video',
    src: trimmed
  };
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
  const tgUser = getTelegramUser();

  // Active Season & Episode state
  const [currentSeason, setCurrentSeason] = useState<Season | undefined>(initialSeason);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | undefined>(initialEpisode);
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [currentQuality, setCurrentQuality] = useState<VideoQuality>('1080p');
  const [availableQualities, setAvailableQualities] = useState<VideoQuality[]>(['360p', '480p', '720p', '1080p', '4K']);
  const [selectedServer, setSelectedServer] = useState<StreamServer>('server1');

  // Player controls
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(initialPositionSeconds);
  const [duration, setDuration] = useState<number>(() => {
    if (isMovie) return (content as Movie).runtime_minutes * 60;
    return initialEpisode?.duration_seconds || 0;
  });
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isLoadingStream, setIsLoadingStream] = useState<boolean>(true);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isControlsLocked, setIsControlsLocked] = useState<boolean>(false);

  // Touch Feedback Animations
  const [doubleTapFeedback, setDoubleTapFeedback] = useState<{ type: 'rewind' | 'forward'; id: number } | null>(null);
  const lastTapTimeRef = useRef<number>(0);

  // Modals & Selectors
  const [showSettingsMenu, setShowSettingsMenu] = useState<boolean>(false);
  const [showEpisodeDrawer, setShowEpisodeDrawer] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [activeMenuTab, setActiveMenuTab] = useState<'main' | 'quality' | 'speed' | 'subtitles' | 'audio' | 'server'>('main');
  const [activeSubtitle, setActiveSubtitle] = useState<string>('English');
  const [activeAudio, setActiveAudio] = useState<string>('Hindi Audio');

  // Autoplay state
  const [isAutoplayEnabled, setIsAutoplayEnabled] = useState<boolean>(true);
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(null);
  const [endOfSeriesMessage, setEndOfSeriesMessage] = useState<string | null>(null);
  const autoNextTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Resume position
  const [hasResumedPosition, setHasResumedPosition] = useState<boolean>(false);

  // Sync duration when episode or movie changes
  useEffect(() => {
    if (isMovie) {
      if ((content as Movie).runtime_minutes) {
        setDuration((content as Movie).runtime_minutes * 60);
      }
    } else if (currentEpisode?.duration_seconds) {
      setDuration(currentEpisode.duration_seconds);
    }
  }, [content, currentEpisode, isMovie]);

  // Action Buttons state
  const [likesCount, setLikesCount] = useState<number>(0);
  const [dislikesCount, setDislikesCount] = useState<number>(0);
  const [hasLiked, setHasLiked] = useState<boolean>(false);
  const [hasDisliked, setHasDisliked] = useState<boolean>(false);
  const [isSavedInWatchlist, setIsSavedInWatchlist] = useState<boolean>(false);
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; username: string } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);

  // Toast Helper
  const triggerToast = (msg: string) => {
    setToastNotification(msg);
    setTimeout(() => setToastNotification(null), 3000);
  };

  // 1. Fetch Stream URL directly with quality and resume time support
  const loadStreamToken = useCallback(async (quality: VideoQuality = currentQuality, server: StreamServer = selectedServer, resumeTime?: number) => {
    try {
      setIsLoadingStream(true);
      setStreamError(null);

      // Check available qualities from episode or movie
      const sourceUrls = currentEpisode?.stream_urls || (isMovie ? (content as Movie).stream_urls : undefined);
      if (sourceUrls && typeof sourceUrls === 'object') {
        const activeKeys = Object.keys(sourceUrls).filter((k) => Boolean((sourceUrls as any)[k]));
        if (activeKeys.length > 0) {
          setAvailableQualities(activeKeys as VideoQuality[]);
        }
      }

      // Check if episode or movie has specific quality stream
      let epStream = sourceUrls?.[quality] || currentEpisode?.stream_url;
      if (!epStream && isMovie) {
        epStream = (content as Movie).stream_url;
      }

      if (epStream) {
        setStreamUrl(epStream);
        setCurrentQuality(quality);
        setIsLoadingStream(false);
        if (resumeTime !== undefined && videoRef.current) {
          videoRef.current.currentTime = resumeTime;
        }
        return;
      }

      // Fallback via API
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
      if (resumeTime !== undefined && videoRef.current) {
        videoRef.current.currentTime = resumeTime;
      }
    } catch (err: any) {
      setStreamError(err.message || 'Streaming URL unavailable. Please check upload link.');
    } finally {
      setIsLoadingStream(false);
    }
  }, [content, currentEpisode, currentQuality, isMovie, selectedServer]);

  // Handle Quick Quality Switch (resumes at same playback timestamp)
  const handleQualityChange = (q: VideoQuality) => {
    if (q === currentQuality) return;
    haptic.selection();
    const prevTime = videoRef.current?.currentTime || currentTime;
    setCurrentQuality(q);
    loadStreamToken(q, selectedServer, prevTime);
  };

  useEffect(() => {
    loadStreamToken();
  }, [loadStreamToken]);

  // Check saved status
  useEffect(() => {
    api.getSaved().then((items) => {
      const exists = items.some((i) => i.content_id === content.id);
      setIsSavedInWatchlist(exists);
    }).catch(() => {});
  }, [content.id]);

  // Smart Stream & HLS.js Attachment effect
  useEffect(() => {
    if (!streamUrl) return;
    const parsed = parseVideoStream(streamUrl);
    if (parsed.type === 'embed') {
      setIsLoadingStream(false);
      return;
    }

    if (!videoRef.current) return;

    let hls: Hls | null = null;
    if (parsed.type === 'hls' && Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hls.loadSource(parsed.src);
      hls.attachMedia(videoRef.current);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoadingStream(false);
        if (videoRef.current && isPlaying) {
          videoRef.current.play().catch(() => {});
        }
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls?.recoverMediaError();
              break;
            default:
              setStreamError('HLS stream network error. Try switching quality or server.');
              hls?.destroy();
              break;
          }
        }
      });
    } else {
      videoRef.current.src = parsed.src;
      setIsLoadingStream(false);
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      }
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [streamUrl]);

  // Handle Controls Auto-hide
  const resetControlsTimeout = useCallback(() => {
    if (isControlsLocked) return;
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showSettingsMenu && !showEpisodeDrawer) {
        setShowControls(false);
      }
    }, 3800);
  }, [isControlsLocked, isPlaying, showEpisodeDrawer, showSettingsMenu]);

  const togglePlay = () => {
    if (isControlsLocked) return;
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
    if (isControlsLocked) return;
    haptic.selection();
    if (!videoRef.current) return;
    const maxDur = videoRef.current.duration || duration;
    videoRef.current.currentTime = Math.max(0, Math.min(maxDur, videoRef.current.currentTime + deltaSeconds));
    resetControlsTimeout();
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isControlsLocked) return;
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

  // Video Double Tap Handler
  const handleVideoTap = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapTimeRef.current;
    lastTapTimeRef.current = now;

    if (timeSinceLastTap < 300) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0]?.clientX || rect.width / 2 : (e as React.MouseEvent).clientX;
      const relativeX = clientX - rect.left;

      if (relativeX < rect.width / 2) {
        seekRelative(-10);
        setDoubleTapFeedback({ type: 'rewind', id: Date.now() });
      } else {
        seekRelative(10);
        setDoubleTapFeedback({ type: 'forward', id: Date.now() });
      }
      setTimeout(() => setDoubleTapFeedback(null), 800);
    } else {
      if (isControlsLocked) return;
      if (showControls) {
        setShowControls(false);
      } else {
        resetControlsTimeout();
      }
    }
  };

  // Report watch progress periodically
  const reportProgress = useCallback(async () => {
    if (!videoRef.current) return;
    const pos = Math.round(videoRef.current.currentTime);
    const dur = Math.round(videoRef.current.duration || duration);
    if (pos > 0 && dur > 0) {
      try {
        await api.updateWatchProgress({
          contentType: isMovie ? 'movie' : 'anime',
          contentId: content.id,
          seasonId: currentSeason?.id,
          episodeId: currentEpisode?.id,
          positionSeconds: pos,
          durationSeconds: dur
        });
      } catch {}
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
      if (!isNaN(videoRef.current.duration) && videoRef.current.duration > 0) {
        setDuration(videoRef.current.duration);
      }
      if (initialPositionSeconds > 0 && !hasResumedPosition) {
        videoRef.current.currentTime = initialPositionSeconds;
        setHasResumedPosition(true);
      }
    }
  };

  const handleDurationChange = () => {
    if (videoRef.current && !isNaN(videoRef.current.duration) && videoRef.current.duration > 0) {
      setDuration(videoRef.current.duration);
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

  const handleVideoEnded = () => {
    reportProgress();
    const next = getNextEpisode();
    if (next && isAutoplayEnabled) {
      setAutoNextCountdown(5);
    } else {
      setEndOfSeriesMessage(isMovie ? 'Feature Complete' : 'You have completed this episode!');
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Action Button Handlers
  const handleToggleLike = () => {
    haptic.selection();
    if (hasLiked) {
      setHasLiked(false);
      setLikesCount((prev) => prev - 1);
    } else {
      setHasLiked(true);
      setLikesCount((prev) => prev + 1);
      if (hasDisliked) {
        setHasDisliked(false);
        setDislikesCount((prev) => Math.max(0, prev - 1));
      }
    }
  };

  const handleToggleDislike = () => {
    haptic.selection();
    if (hasDisliked) {
      setHasDisliked(false);
      setDislikesCount((prev) => Math.max(0, prev - 1));
    } else {
      setHasDisliked(true);
      setDislikesCount((prev) => prev + 1);
      if (hasLiked) {
        setHasLiked(false);
        setLikesCount((prev) => Math.max(0, prev - 1));
      }
    }
  };

  const handleToggleWatchlist = async () => {
    haptic.selection();
    const contentType = isMovie ? 'movie' : 'anime';
    try {
      if (isSavedInWatchlist) {
        await api.removeSaved(contentType, content.id);
        setIsSavedInWatchlist(false);
        triggerToast('Removed from Watchlist');
      } else {
        await api.addSaved(contentType, content.id);
        setIsSavedInWatchlist(true);
        triggerToast('Saved to Watchlist');
      }
    } catch {
      triggerToast('Watchlist updated');
    }
  };

  // Comment Handlers
  const handlePostComment = () => {
    if (!newCommentText.trim()) return;
    haptic.impact('medium');

    const authorName = tgUser?.first_name ? `${tgUser.first_name} ${tgUser.last_name || ''}`.trim() : 'Viewer';
    const authorAvatar = tgUser?.photo_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80';

    const newComment: Comment = {
      id: `c-${Date.now()}`,
      content_id: content.id,
      episode_id: currentEpisode?.id,
      user_id: String(tgUser?.id || Date.now()),
      username: authorName,
      user_avatar: authorAvatar,
      badge: 'Viewer',
      text: newCommentText.trim(),
      created_at: 'Just now',
      likes_count: 0,
      is_liked: false,
      replies_count: 0,
      replies: []
    };
    setComments((prev) => [newComment, ...prev]);
    setNewCommentText('');
    setShowEmojiPicker(false);
    triggerToast('Comment posted');
  };

  const allSeasonEpisodes = currentSeason?.episodes || [];

  // Determine display values matching requested format
  const episodeNumberStr = currentEpisode ? `S0${currentSeason?.season_number || 1}E0${currentEpisode.episode_number}` : 'S01E01';
  const audioTypeDisplay = currentEpisode?.audio_type || 'Official Dub';
  const fileSizeDisplay = currentEpisode?.file_size || '188.56MB';
  const codecDisplay = currentEpisode?.codec || 'x265';
  const colorDepthDisplay = currentEpisode?.color_depth || '10bit';
  const parsedStream = parseVideoStream(streamUrl);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-[#0b0c13] text-slate-100 flex flex-col select-none overflow-y-auto no-scrollbar"
    >
      {/* Toast Floating Notification */}
      {toastNotification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-rose-950/95 border border-rose-500/60 text-rose-200 px-4 py-2 rounded-xl text-xs font-semibold shadow-2xl backdrop-blur-md animate-in fade-in flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-rose-400" />
          <span>{toastNotification}</span>
        </div>
      )}

      {/* =====================================================================
          1. TOP VIDEO PLAYER CONTAINER (Landscape & Portrait Responsive)
          ===================================================================== */}
      <div
        className="sticky top-0 z-40 w-full bg-black shadow-2xl aspect-video max-h-[50vh] sm:max-h-[60vh] flex items-center justify-center relative group"
        onMouseMove={resetControlsTimeout}
        onClick={resetControlsTimeout}
        onTouchStart={resetControlsTimeout}
      >
        {parsedStream.type === 'embed' ? (
          <iframe
            src={parsedStream.src}
            className="w-full h-full border-0"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
            title={content.title}
          />
        ) : streamUrl ? (
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            playsInline
            autoPlay
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onDurationChange={handleDurationChange}
            onEnded={handleVideoEnded}
            onError={() => {
              if (parsedStream.type !== 'embed') {
                setStreamError('Playback interrupted: stream URL unavailable or network timed out. Try switching quality.');
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 gap-2">
            <div className="w-10 h-10 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
            <span className="text-xs text-slate-400">Loading stream...</span>
          </div>
        )}

        {/* Touch zones (only active for native video, not iframe) */}
        {parsedStream.type !== 'embed' && (
          <div
            className="absolute inset-0 flex pointer-events-auto"
            onClick={handleVideoTap}
          >
            <div className="w-1/2 h-full flex items-center justify-center">
              {doubleTapFeedback?.type === 'rewind' && (
                <div className="px-4 py-2 rounded-full bg-rose-600/30 border border-rose-400/50 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1 animate-ping">
                  <RotateCcw className="w-4 h-4" />
                  <span>-10s</span>
                </div>
              )}
            </div>
            <div className="w-1/2 h-full flex items-center justify-center">
              {doubleTapFeedback?.type === 'forward' && (
                <div className="px-4 py-2 rounded-full bg-rose-600/30 border border-rose-400/50 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1 animate-ping">
                  <RotateCw className="w-4 h-4" />
                  <span>+10s</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* LOADING SPINNER */}
        {isLoadingStream && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm z-10 gap-2 pointer-events-none">
            <div className="w-10 h-10 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
            <span className="text-xs text-slate-300 font-medium">Loading Video Stream ({currentQuality})...</span>
          </div>
        )}

        {/* ERROR OVERLAY WITH ONE-TAP RESOLUTION SWITCH */}
        {streamError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 p-6 text-center z-30 gap-3">
            <AlertCircle className="w-10 h-10 text-rose-500" />
            <h3 className="font-bold text-sm text-white">Video Stream Unavailable</h3>
            <p className="text-xs text-slate-400 max-w-sm">{streamError}</p>

            <div className="flex flex-col gap-2 w-full max-w-xs mt-1">
              <span className="text-[11px] text-slate-400 font-semibold">Try another resolution:</span>
              <div className="flex items-center gap-2 justify-center">
                {(['480p', '720p', '1080p'] as VideoQuality[]).map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setStreamError(null);
                      handleQualityChange(q);
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all ${
                      currentQuality === q
                        ? 'bg-rose-600 border-rose-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setStreamError(null);
                  loadStreamToken(currentQuality, selectedServer);
                }}
                className="mt-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                Retry Playback
              </button>
            </div>
          </div>
        )}

        {/* TOP PLAYER CONTROLS (FADE IN/OUT) */}
        {!isControlsLocked && parsedStream.type !== 'embed' && (
          <div
            className={`absolute inset-0 flex flex-col justify-between p-3 pointer-events-none transition-opacity duration-300 z-20 ${
              showControls ? 'opacity-100 bg-gradient-to-b from-black/80 via-transparent to-black/90' : 'opacity-0'
            }`}
          >
            {/* Top Bar: Back & Title */}
            <div className="flex items-center justify-between pointer-events-auto">
              <button
                onClick={() => {
                  haptic.impact('light');
                  onClose();
                }}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-black/60 hover:bg-black/90 text-white border border-white/10"
              >
                <X className="w-5 h-5" />
              </button>

              <span className="text-xs font-bold text-white line-clamp-1 max-w-[60%]">
                {content.title}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-black/60 hover:bg-black/90 text-white border border-white/10"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Center Controls */}
            <div className="flex items-center justify-center gap-6 pointer-events-auto">
              <button
                onClick={() => seekRelative(-10)}
                className="text-slate-200 hover:text-white"
              >
                <RotateCcw className="w-6 h-6" />
              </button>

              <button
                onClick={togglePlay}
                className="w-12 h-12 rounded-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 active:scale-95"
              >
                {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white ml-0.5" />}
              </button>

              <button
                onClick={() => seekRelative(10)}
                className="text-slate-200 hover:text-white"
              >
                <RotateCw className="w-6 h-6" />
              </button>
            </div>

            {/* Bottom Scrubber */}
            <div className="flex flex-col gap-1 pointer-events-auto">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-300">
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration || 1}
                  value={currentTime}
                  onChange={handleSeekChange}
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-rose-500"
                />
                <span className="text-[10px] font-mono text-slate-400">
                  {formatTime(duration)}
                </span>

                <span className="px-2 py-0.5 rounded bg-black/60 text-[10px] font-mono font-bold text-rose-300 border border-white/10">
                  {currentQuality}
                </span>

                <button onClick={toggleFullscreen} className="text-slate-300 hover:text-white">
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS MENU */}
        {showSettingsMenu && (
          <div className="absolute bottom-12 right-4 w-60 bg-slate-900/95 border border-slate-800 rounded-2xl p-3 shadow-2xl z-30 text-xs">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
              <span className="font-bold text-white">Quality Select</span>
              <button onClick={() => setShowSettingsMenu(false)} className="text-slate-400">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {['480p', '720p', '1080p'].map((q) => (
              <button
                key={q}
                onClick={() => {
                  handleQualityChange(q as VideoQuality);
                  setShowSettingsMenu(false);
                }}
                className={`w-full py-1.5 px-2 rounded-lg text-left flex items-center justify-between ${
                  currentQuality === q ? 'bg-rose-950 border border-rose-800 text-rose-300 font-bold' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <span>{q}</span>
                {currentQuality === q && <Check className="w-3.5 h-3.5 text-rose-400" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Dedicated Quick Resolution Switcher Bar */}
      <div className="w-full max-w-2xl mx-auto px-4 pt-3">
        <div className="flex items-center justify-between p-2.5 bg-[#141622] rounded-2xl border border-slate-800/80 shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <span>⚡ Quality:</span>
            </span>
            <div className="flex items-center gap-1.5">
              {(['480p', '720p', '1080p'] as VideoQuality[]).map((q) => {
                const isSelected = currentQuality === q;
                const epStream = currentEpisode?.stream_urls?.[q];
                const movieStream = (content as Movie).stream_urls?.[q];
                const hasExplicit = Boolean(epStream || movieStream);

                return (
                  <button
                    key={q}
                    onClick={() => handleQualityChange(q)}
                    className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1 border ${
                      isSelected
                        ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30'
                        : hasExplicit
                        ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
                        : 'bg-slate-950/60 text-slate-400 border-slate-800/60 hover:text-slate-200'
                    }`}
                  >
                    <span>{q}</span>
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                  </button>
                );
              })}
            </div>
          </div>

          <span className="text-[10px] font-mono text-rose-400/90 font-bold bg-rose-950/60 border border-rose-900/40 px-2 py-0.5 rounded-lg hidden sm:inline">
            Active: {currentQuality}
          </span>
        </div>
      </div>

      {/* =====================================================================
          2. BELOW VIDEO CONTENT AREA (DESIGNED EXACTLY LIKE THE PROVIDED SCREENSHOT)
          ===================================================================== */}
      <div className="w-full max-w-2xl mx-auto px-4 py-4 flex flex-col gap-4">

        {/* Title Block (Formatted like Screenshot: [@SBANIME] Title S01E01 1080p x265 10bit WEB-DL Hindi Audio ESub.mkv) */}
        <div className="flex flex-col gap-2">
          <h1 className="text-base sm:text-lg font-serif font-bold text-slate-100 leading-snug tracking-tight">
            [@STARK] {content.title} {episodeNumberStr} {currentQuality} {codecDisplay} {colorDepthDisplay} WEB-DL Hindi Audio ESub.mkv
          </h1>

          {/* Badges Pill Row matching screenshot */}
          <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono">
            {/* File Size */}
            <span className="px-3 py-1 rounded-full bg-[#1e202e] border border-slate-800 text-slate-300 flex items-center gap-1.5">
              <span>💾</span>
              <span>{fileSizeDisplay}</span>
            </span>

            {/* Codec */}
            <span className="px-3 py-1 rounded-full bg-[#1e202e] border border-slate-800 text-slate-300 flex items-center gap-1.5">
              <span>🎥</span>
              <span>{codecDisplay}</span>
            </span>

            {/* Color Depth */}
            <span className="px-3 py-1 rounded-full bg-[#1e202e] border border-slate-800 text-slate-300 flex items-center gap-1.5">
              <span>🌈</span>
              <span>{colorDepthDisplay}</span>
            </span>

            {/* Audio Type */}
            <span className="px-3 py-1 rounded-full bg-[#1e202e] border border-slate-800 text-slate-300 flex items-center gap-1.5">
              <span>👤</span>
              <span className="text-rose-400 font-bold">{audioTypeDisplay}</span>
            </span>
          </div>
        </div>

        {/* Action Buttons Row: Like, Dislike, Bookmark, Report */}
        <div className="flex items-center gap-2 py-1">
          {/* Like */}
          <button
            onClick={handleToggleLike}
            className={`px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              hasLiked
                ? 'bg-rose-950 border-rose-500 text-rose-300'
                : 'bg-[#1e202e] border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>{likesCount}</span>
          </button>

          {/* Dislike */}
          <button
            onClick={handleToggleDislike}
            className={`px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              hasDisliked
                ? 'bg-slate-800 border-slate-700 text-slate-200'
                : 'bg-[#1e202e] border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <ThumbsDown className="w-3.5 h-3.5" />
            <span>{dislikesCount}</span>
          </button>

          {/* Bookmark / Save */}
          <button
            onClick={handleToggleWatchlist}
            className={`px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isSavedInWatchlist
                ? 'bg-rose-600 border-rose-400 text-white font-bold shadow-md shadow-rose-600/30'
                : 'bg-[#1e202e] border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
          </button>

          {/* Report */}
          <button
            onClick={() => setShowReportModal(true)}
            className="px-4 py-2 rounded-xl bg-[#1e202e] border border-slate-800 text-slate-300 hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5"
          >
            <Flag className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        {/* =====================================================================
            3. COMMENTS SECTION
            ===================================================================== */}
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-300" />
              <h2 className="text-sm font-bold text-white">Comments</h2>
            </div>
            <span className="text-xs text-slate-400">{comments.length} comments</span>
          </div>

          {/* Comment Input Box */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-rose-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {tgUser?.first_name ? tgUser.first_name[0].toUpperCase() : 'H'}
            </div>
            <div className="flex-1 relative">
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handlePostComment();
                }}
                placeholder="Add a comment..."
                className="w-full bg-[#181a24] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
              {newCommentText.trim() && (
                <button
                  onClick={handlePostComment}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-rose-400 hover:text-white"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Comments List */}
          {comments.length > 0 && (
            <div className="flex flex-col gap-2 mt-2">
              {comments.map((c) => (
                <div key={c.id} className="p-3 rounded-xl bg-[#181a24] border border-slate-800/80 text-xs flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-300">{c.username}</span>
                    <span className="text-[10px] text-slate-500">{c.created_at}</span>
                  </div>
                  <p className="text-slate-300">{c.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* =====================================================================
            4. UP NEXT · SEASON SECTION
            ===================================================================== */}
        <div className="flex flex-col gap-3 pt-3 border-t border-slate-900">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white font-serif">
              Up Next · Season {currentSeason?.season_number || 1}
            </h2>

            {/* Autoplay Toggle */}
            <button
              onClick={() => setIsAutoplayEnabled(!isAutoplayEnabled)}
              className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
                isAutoplayEnabled
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isAutoplayEnabled ? 'bg-slate-950' : 'bg-slate-500'}`} />
              <span>{isAutoplayEnabled ? 'Autoplay On' : 'Autoplay Off'}</span>
            </button>
          </div>

          {/* Episode Cards */}
          <div className="flex flex-col gap-3">
            {allSeasonEpisodes.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#181a24] text-xs text-slate-400 text-center">
                No next episodes available in this season.
              </div>
            ) : (
              allSeasonEpisodes.map((ep) => {
                const isCurrent = currentEpisode?.id === ep.id;
                return (
                  <div
                    key={ep.id}
                    onClick={() => {
                      if (isCurrent) return;
                      if (currentSeason) {
                        setCurrentEpisode(ep);
                        setCurrentTime(0);
                        if (onEpisodeChange) onEpisodeChange(currentSeason, ep);
                      }
                    }}
                    className={`p-3 rounded-2xl bg-[#181a24] border flex items-center gap-3.5 cursor-pointer transition-all ${
                      isCurrent ? 'border-rose-500 bg-rose-950/30' : 'border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="relative w-28 aspect-video rounded-xl overflow-hidden bg-slate-900 shrink-0">
                      <img
                        src={ep.thumbnail_url || content.backdrop_url || content.poster_url}
                        alt={ep.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/stark-logo.jpg';
                        }}
                      />
                      {isCurrent && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Play className="w-5 h-5 text-rose-400 fill-rose-400" />
                        </div>
                      )}
                    </div>

                    {/* Title & Excerpt */}
                    <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
                      <h4 className="text-xs font-bold text-white truncate">
                        S{currentSeason?.season_number || 1} · E{ep.episode_number} · {ep.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-snug">
                        {ep.description || `${content.title} Season ${currentSeason?.season_number || 1} Episode ${ep.episode_number}`}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
