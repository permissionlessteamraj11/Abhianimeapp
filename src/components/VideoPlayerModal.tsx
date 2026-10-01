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
  { id: 'server1', name: 'Server 1 (Ultra CDN)', tag: 'Fast' },
  { id: 'server2', name: 'Server 2 (Backup HD)', tag: '1080p' },
  { id: 'server3', name: 'Server 3 (Direct Stream)', tag: 'HLS' }
];

const EMOJI_OPTIONS = ['🔥', '❤️', '👏', '😱', '🍿', '💯', '😍', '🚀'];

// Initial seed comments for realistic community engagement
const INITIAL_SEED_COMMENTS: Comment[] = [];

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
  const [duration, setDuration] = useState<number>(isMovie ? content.runtime_minutes * 60 : 1440);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isLoadingStream, setIsLoadingStream] = useState<boolean>(true);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isControlsLocked, setIsControlsLocked] = useState<boolean>(false);

  // Touch Feedback Animations for Double Tap Seeking
  const [doubleTapFeedback, setDoubleTapFeedback] = useState<{ type: 'rewind' | 'forward'; id: number } | null>(null);
  const lastTapTimeRef = useRef<number>(0);

  // Modals & Selectors
  const [showSettingsMenu, setShowSettingsMenu] = useState<boolean>(false);
  const [showEpisodeDrawer, setShowEpisodeDrawer] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [showMoreActionsMenu, setShowMoreActionsMenu] = useState<boolean>(false);
  const [activeMenuTab, setActiveMenuTab] = useState<'main' | 'quality' | 'speed' | 'subtitles' | 'audio' | 'server'>('main');
  const [activeSubtitle, setActiveSubtitle] = useState<string>('English');
  const [activeAudio, setActiveAudio] = useState<string>('Japanese (Original)');

  // Autoplay & Auto-next state
  const [isAutoplayEnabled, setIsAutoplayEnabled] = useState<boolean>(true);
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(null);
  const [endOfSeriesMessage, setEndOfSeriesMessage] = useState<string | null>(null);
  const autoNextTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Resume position
  const [hasResumedPosition, setHasResumedPosition] = useState<boolean>(false);

  // Action Buttons state
  const [likesCount, setLikesCount] = useState<number>(1420);
  const [dislikesCount, setDislikesCount] = useState<number>(12);
  const [hasLiked, setHasLiked] = useState<boolean>(false);
  const [hasDisliked, setHasDisliked] = useState<boolean>(false);
  const [isSavedInWatchlist, setIsSavedInWatchlist] = useState<boolean>(false);
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  // Description expansion state
  const [showFullDescription, setShowFullDescription] = useState<boolean>(false);

  // Comments state
  const [isCommentsOpen, setIsCommentsOpen] = useState<boolean>(false);
  const [comments, setComments] = useState<Comment[]>(INITIAL_SEED_COMMENTS);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; username: string } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [isLoadingComments, setIsLoadingComments] = useState<boolean>(false);
  const [commentsLimit, setCommentsLimit] = useState<number>(10);

  // Toast Helper
  const triggerToast = (msg: string) => {
    setToastNotification(msg);
    setTimeout(() => setToastNotification(null), 3000);
  };

  // 1. Fetch Signed Playback Token & Stream URL
  const loadStreamToken = useCallback(async (quality: VideoQuality = currentQuality, server: StreamServer = selectedServer) => {
    try {
      setIsLoadingStream(true);
      setStreamError(null);

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

  // Check saved status
  useEffect(() => {
    api.getSaved().then((items) => {
      const exists = items.some((i) => i.content_id === content.id);
      setIsSavedInWatchlist(exists);
    }).catch(() => {});
  }, [content.id]);

  // HLS.js Attachment effect
  useEffect(() => {
    if (!streamUrl || !videoRef.current) return;

    let hls: Hls | null = null;
    const isM3U8 = streamUrl.includes('.m3u8') || streamUrl.includes('m3u8');

    if (isM3U8 && Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hls.loadSource(streamUrl);
      hls.attachMedia(videoRef.current);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (videoRef.current && isPlaying) {
          videoRef.current.play().catch(() => {});
        }
      });
    } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      videoRef.current.src = streamUrl;
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

  const skipIntro = () => {
    haptic.impact('medium');
    seekRelative(85);
    triggerToast('Skipped Intro (+85s)');
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

  // Video Double Tap Handler (Left = -10s, Right = +10s)
  const handleVideoTap = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapTimeRef.current;
    lastTapTimeRef.current = now;

    if (timeSinceLastTap < 300) {
      // Double tap detected
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
      // Single tap -> show/hide controls
      if (isControlsLocked) return;
      if (showControls) {
        setShowControls(false);
      } else {
        resetControlsTimeout();
      }
    }
  };

  // Report watch progress periodically (every 10 seconds)
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
    if (next && isAutoplayEnabled) {
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
        triggerToast('Added to Watchlist');
      }
    } catch {
      triggerToast('Watchlist updated');
    }
  };


  // Comment Handlers
  const handlePostComment = () => {
    if (!newCommentText.trim()) return;
    haptic.impact('medium');

    const authorName = tgUser?.first_name ? `${tgUser.first_name} ${tgUser.last_name || ''}`.trim() : 'Stark Viewer';
    const authorAvatar = tgUser?.photo_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80';

    if (replyingTo) {
      // Add nested reply
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === replyingTo.commentId) {
            const newReply: CommentReply = {
              id: `r-${Date.now()}`,
              comment_id: c.id,
              user_id: String(tgUser?.id || Date.now()),
              username: authorName,
              user_avatar: authorAvatar,
              badge: 'Viewer',
              text: newCommentText.trim(),
              created_at: 'Just now',
              likes_count: 0,
              is_liked: false
            };
            return {
              ...c,
              replies_count: c.replies_count + 1,
              replies: [...(c.replies || []), newReply],
              is_expanded: true
            };
          }
          return c;
        })
      );
      triggerToast('Reply posted');
      setReplyingTo(null);
    } else {
      // Add root comment
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
        replies: [],
        is_expanded: false
      };
      setComments((prev) => [newComment, ...prev]);
      triggerToast('Comment posted');
    }

    setNewCommentText('');
    setShowEmojiPicker(false);
  };

  const handleToggleCommentLike = (commentId: string, isReply: boolean = false, replyId?: string) => {
    haptic.selection();
    setComments((prev) =>
      prev.map((c) => {
        if (!isReply && c.id === commentId) {
          const isLiked = !c.is_liked;
          return {
            ...c,
            is_liked: isLiked,
            likes_count: isLiked ? c.likes_count + 1 : Math.max(0, c.likes_count - 1)
          };
        }
        if (isReply && c.id === commentId && c.replies) {
          const updatedReplies = c.replies.map((r) => {
            if (r.id === replyId) {
              const isLiked = !r.is_liked;
              return {
                ...r,
                is_liked: isLiked,
                likes_count: isLiked ? r.likes_count + 1 : Math.max(0, r.likes_count - 1)
              };
            }
            return r;
          });
          return { ...c, replies: updatedReplies };
        }
        return c;
      })
    );
  };

  const toggleExpandReplies = (commentId: string) => {
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, is_expanded: !c.is_expanded } : c))
    );
  };

  const nextEpInfo = getNextEpisode();
  const allSeasonEpisodes = currentSeason?.episodes || [];
  const allSeasons = ('seasons' in content && content.seasons) || [];

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-slate-950 flex flex-col select-none overflow-y-auto no-scrollbar"
    >
      {/* Toast Floating Notification */}
      {toastNotification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-cyan-950/95 border border-cyan-500/60 text-cyan-200 px-4 py-2 rounded-xl text-xs font-semibold shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>{toastNotification}</span>
        </div>
      )}

      {/* =====================================================================
          1. TOP VIDEO PLAYER CONTAINER
          ===================================================================== */}
      <div
        className="sticky top-0 z-40 w-full bg-black shadow-2xl aspect-video max-h-[55vh] sm:max-h-[60vh] flex items-center justify-center relative group"
        onMouseMove={resetControlsTimeout}
        onClick={resetControlsTimeout}
        onTouchStart={resetControlsTimeout}
      >
        {streamUrl ? (
          <video
            ref={videoRef}
            src={streamUrl}
            className="w-full h-full object-contain"
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
            <div className="w-12 h-12 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
          </div>
        )}

        {/* Double-tap Touch Zones & Visual Feedback */}
        <div
          className="absolute inset-0 flex pointer-events-auto"
          onClick={handleVideoTap}
        >
          <div className="w-1/2 h-full flex items-center justify-center">
            {doubleTapFeedback?.type === 'rewind' && (
              <div className="px-4 py-2 rounded-full bg-cyan-500/30 border border-cyan-400/50 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1 animate-ping">
                <RotateCcw className="w-4 h-4" />
                <span>-10s</span>
              </div>
            )}
          </div>
          <div className="w-1/2 h-full flex items-center justify-center">
            {doubleTapFeedback?.type === 'forward' && (
              <div className="px-4 py-2 rounded-full bg-cyan-500/30 border border-cyan-400/50 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1 animate-ping">
                <RotateCw className="w-4 h-4" />
                <span>+10s</span>
              </div>
            )}
          </div>
        </div>

        {/* LOADING SPINNER */}
        {isLoadingStream && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm z-10 gap-3 pointer-events-none">
            <div className="w-12 h-12 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]" />
            <span className="text-xs font-semibold text-slate-200">
              Connecting to {selectedServer === 'server1' ? 'Ultra CDN' : selectedServer === 'server2' ? 'HD Server' : 'Direct Server'}...
            </span>
          </div>
        )}

        {/* ERROR OVERLAY */}
        {streamError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 p-6 text-center z-10 gap-3">
            <AlertCircle className="w-12 h-12 text-cyan-500 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
            <h3 className="font-bold text-base text-white">Stream Authorization Error</h3>
            <p className="text-xs text-slate-400 max-w-sm">{streamError}</p>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => loadStreamToken(currentQuality, selectedServer)}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-white rounded-xl text-xs font-semibold shadow-lg shadow-cyan-500/30"
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
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold shadow-lg shadow-cyan-500/30 flex items-center gap-1.5"
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
            <div className="w-12 h-12 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <CheckCircle2 className="w-6 h-6" />
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
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold shadow-lg shadow-cyan-500/30"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* LOCKED STATE ONLY TOGGLE */}
        {isControlsLocked && (
          <button
            onClick={() => {
              setIsControlsLocked(false);
              triggerToast('Controls Unlocked');
              resetControlsTimeout();
            }}
            className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-black/70 border border-cyan-500/60 text-cyan-400 backdrop-blur-md shadow-lg"
            title="Unlock Controls"
          >
            <Lock className="w-5 h-5" />
          </button>
        )}

        {/* OVERLAY CONTROLS (Fade in/out) */}
        {!isControlsLocked && (
          <div
            className={`absolute inset-0 flex flex-col justify-between p-3 sm:p-4 pointer-events-none transition-opacity duration-300 z-20 ${
              showControls ? 'opacity-100 bg-gradient-to-b from-black/85 via-black/30 to-black/90' : 'opacity-0'
            }`}
          >
            {/* Top Bar: Back / Content Title / Quick Switches */}
            <div className="flex items-center justify-between pointer-events-auto">
              <button
                onClick={() => {
                  haptic.impact('light');
                  onClose();
                }}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-black/60 hover:bg-black/90 backdrop-blur-md text-white border border-white/10"
                aria-label="Close Player"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center px-2 max-w-[55%]">
                <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight line-clamp-1">{content.title}</h4>
                <span className="text-[10px] text-cyan-400 font-semibold flex items-center gap-1">
                  {isMovie
                    ? 'Movie Feature • HD'
                    : `S${currentSeason?.season_number || 1} E${currentEpisode?.episode_number || 1}: ${currentEpisode?.title || ''}`}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Episode Drawer Toggle */}
                {!isMovie && allSeasonEpisodes.length > 0 && (
                  <button
                    onClick={() => {
                      haptic.selection();
                      setShowEpisodeDrawer(!showEpisodeDrawer);
                      setShowSettingsMenu(false);
                    }}
                    className={`min-h-[38px] px-2.5 py-1 flex items-center gap-1 rounded-xl backdrop-blur-md border text-[11px] font-semibold transition-all ${
                      showEpisodeDrawer
                        ? 'bg-cyan-500 border-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                        : 'bg-black/60 hover:bg-black/80 text-slate-200 border-white/10'
                    }`}
                    title="View Episode List"
                  >
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="hidden sm:inline">Episodes</span>
                  </button>
                )}

                {/* Lock Controls Button */}
                <button
                  onClick={() => {
                    haptic.impact('medium');
                    setIsControlsLocked(true);
                    triggerToast('Controls Locked');
                  }}
                  className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl bg-black/60 hover:bg-black/80 text-slate-200 border border-white/10"
                  title="Lock Controls"
                >
                  <Unlock className="w-4 h-4" />
                </button>

                {/* Settings Toggle */}
                <button
                  onClick={() => {
                    haptic.selection();
                    setShowSettingsMenu(!showSettingsMenu);
                    setShowEpisodeDrawer(false);
                    setActiveMenuTab('main');
                  }}
                  className={`min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl backdrop-blur-md border transition-all ${
                    showSettingsMenu ? 'bg-cyan-500/30 border-cyan-500 text-cyan-400' : 'bg-black/60 hover:bg-black/80 text-white border-white/10'
                  }`}
                  aria-label="Playback Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Center Playback Controls */}
            <div className="flex items-center justify-center gap-5 sm:gap-8 pointer-events-auto">
              {!isMovie && (
                <button
                  onClick={handlePrevEpisode}
                  disabled={!getPrevEpisode()}
                  className={`min-h-[40px] min-w-[40px] flex items-center justify-center transition-all ${
                    getPrevEpisode() ? 'text-slate-200 hover:text-white active:scale-90' : 'text-slate-600 cursor-not-allowed'
                  }`}
                  title="Previous Episode"
                >
                  <SkipBack className="w-5 h-5" />
                </button>
              )}

              <button
                onClick={() => seekRelative(-10)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-300 hover:text-white active:scale-90 transition-all"
                title="Rewind 10s"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              <button
                onClick={togglePlay}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 flex items-center justify-center shadow-2xl shadow-cyan-500/50 active:scale-95 transition-all border border-cyan-400/40"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-7 h-7 fill-slate-950" /> : <Play className="w-7 h-7 fill-slate-950 ml-1" />}
              </button>

              <button
                onClick={() => seekRelative(10)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-300 hover:text-white active:scale-90 transition-all"
                title="Forward 10s"
              >
                <RotateCw className="w-5 h-5" />
              </button>

              {!isMovie && (
                <button
                  onClick={handleNextEpisode}
                  disabled={!nextEpInfo}
                  className={`min-h-[40px] min-w-[40px] flex items-center justify-center transition-all ${
                    nextEpInfo ? 'text-slate-200 hover:text-white active:scale-90' : 'text-slate-600 cursor-not-allowed'
                  }`}
                  title="Next Episode"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Quick Skip Intro pill button if anime */}
            {!isMovie && (
              <div className="flex justify-center pointer-events-auto">
                <button
                  onClick={skipIntro}
                  className="px-3.5 py-1 rounded-full bg-black/70 hover:bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold backdrop-blur-md flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                >
                  <FastForward className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Skip Intro (+85s)</span>
                </button>
              </div>
            )}

            {/* Bottom Bar: Scrubber & Secondary Controls */}
            <div className="flex flex-col gap-1.5 pointer-events-auto">
              {/* Scrubber Range */}
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-mono text-slate-300 tabular-nums">
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration || 1}
                  value={currentTime}
                  onChange={handleSeekChange}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:h-2 transition-all"
                />
                <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                  {formatTime(duration)}
                </span>
              </div>

              {/* Bottom Actions Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleMute}
                    className="p-1 text-slate-300 hover:text-white"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-cyan-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => {
                      setShowSettingsMenu(true);
                      setActiveMenuTab('quality');
                    }}
                    className="flex items-center gap-1 text-[10px] font-mono bg-slate-900/80 border border-cyan-500/30 px-2 py-0.5 rounded-md text-cyan-300"
                  >
                    <ShieldCheck className="w-3 h-3 text-cyan-400" />
                    <span>{currentQuality}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowSettingsMenu(true);
                      setActiveMenuTab('speed');
                    }}
                    className="text-[10px] font-mono font-bold text-slate-300 hover:text-cyan-400 px-2 py-0.5 rounded-md bg-black/40 border border-white/10"
                  >
                    {playbackSpeed}x
                  </button>

                  <button
                    onClick={toggleFullscreen}
                    className="p-1 text-slate-300 hover:text-white"
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS DRAWER MENU */}
        {showSettingsMenu && (
          <div
            className="absolute bottom-12 right-4 w-72 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl p-3 shadow-2xl z-30 text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {activeMenuTab === 'main' && (
              <div className="flex flex-col gap-1 text-xs">
                <div className="flex items-center justify-between px-2 py-1 border-b border-slate-800/80 mb-1">
                  <span className="font-semibold text-slate-200">Settings</span>
                  <button onClick={() => setShowSettingsMenu(false)} className="text-slate-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => setActiveMenuTab('quality')}
                  className="flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-slate-800/80"
                >
                  <span className="font-medium">Video Quality</span>
                  <span className="text-cyan-400 font-mono font-bold">{currentQuality}</span>
                </button>

                <button
                  onClick={() => setActiveMenuTab('server')}
                  className="flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-slate-800/80"
                >
                  <span className="font-medium">Stream Server</span>
                  <span className="text-cyan-400 font-medium">
                    {selectedServer === 'server1' ? 'Ultra CDN' : selectedServer === 'server2' ? 'HD Backup' : 'Direct'}
                  </span>
                </button>

                <button
                  onClick={() => setActiveMenuTab('speed')}
                  className="flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-slate-800/80"
                >
                  <span className="font-medium">Speed</span>
                  <span className="text-cyan-400 font-mono">{playbackSpeed}x</span>
                </button>

                <button
                  onClick={() => setActiveMenuTab('subtitles')}
                  className="flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-slate-800/80"
                >
                  <div className="flex items-center gap-1.5">
                    <Subtitles className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium">Subtitles</span>
                  </div>
                  <span className="text-cyan-400">{activeSubtitle}</span>
                </button>

                <button
                  onClick={() => setActiveMenuTab('audio')}
                  className="flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-slate-800/80"
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
                  ← Back
                </button>
                {availableQualities.map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      haptic.selection();
                      loadStreamToken(q, selectedServer);
                      setShowSettingsMenu(false);
                    }}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-xl ${
                      currentQuality === q ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'hover:bg-slate-800'
                    }`}
                  >
                    <span className="font-mono">{q}</span>
                    {currentQuality === q && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>
                ))}
              </div>
            )}

            {/* Server Submenu */}
            {activeMenuTab === 'server' && (
              <div className="flex flex-col gap-1 text-xs">
                <button
                  onClick={() => setActiveMenuTab('main')}
                  className="flex items-center gap-1 text-cyan-400 px-2 py-1 mb-1 font-semibold hover:underline"
                >
                  ← Back
                </button>
                {SERVER_OPTIONS.map((srv) => (
                  <button
                    key={srv.id}
                    onClick={() => {
                      haptic.selection();
                      setSelectedServer(srv.id);
                      loadStreamToken(currentQuality, srv.id);
                      setShowSettingsMenu(false);
                    }}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-xl ${
                      selectedServer === srv.id ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Server className="w-3.5 h-3.5 text-slate-400" />
                      <span>{srv.name}</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300">
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
                  className="flex items-center gap-1 text-cyan-400 px-2 py-1 mb-1 font-semibold hover:underline"
                >
                  ← Back
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
                    className={`flex items-center justify-between px-3 py-1.5 rounded-xl ${
                      playbackSpeed === spd ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'hover:bg-slate-800'
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
                  ← Back
                </button>
                {['Off', 'English', 'Hindi', 'Spanish', 'Japanese'].map((sub) => (
                  <button
                    key={sub}
                    onClick={() => {
                      haptic.selection();
                      setActiveSubtitle(sub);
                      setShowSettingsMenu(false);
                    }}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-xl ${
                      activeSubtitle === sub ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'hover:bg-slate-800'
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
                  ← Back
                </button>
                {['Japanese (Original)', 'English (Dub)', 'Hindi (Dub)'].map((aud) => (
                  <button
                    key={aud}
                    onClick={() => {
                      haptic.selection();
                      setActiveAudio(aud);
                      setShowSettingsMenu(false);
                    }}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-xl ${
                      activeAudio === aud ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'hover:bg-slate-800'
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

      {/* =====================================================================
          MAIN WATCHING CONTENT CONTAINER (SCROLLABLE BELOW PLAYER)
          ===================================================================== */}
      <div className="w-full max-w-4xl mx-auto px-4 py-4 flex flex-col gap-5">

        {/* =====================================================================
            2. EPISODE INFORMATION SECTION
            ===================================================================== */}
        <div className="flex flex-col gap-2">
          {/* Anime Title */}
          <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
            <Tv className="w-3.5 h-3.5" />
            <span>{content.title}</span>
          </span>

          {/* Season + Episode & Episode Title */}
          <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug">
            {isMovie
              ? content.title
              : `S${currentSeason?.season_number || 1} · E${currentEpisode?.episode_number || 1} · ${currentEpisode?.title || 'Episode'}`}
          </h1>

          {/* Metadata Chips / Badges Row */}
          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            <span className="px-2.5 py-0.5 rounded-full bg-slate-900 border border-cyan-500/30 text-cyan-300 font-mono text-[11px] font-bold">
              {currentQuality}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-mono text-[11px]">
              {currentEpisode?.codec || (content as any).codec || 'H.265'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-mono text-[11px]">
              {currentEpisode?.color_depth || (content as any).color_depth || '10bit'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-mono text-[11px]">
              {activeAudio || currentEpisode?.audio_language || content.language || 'Hindi Audio'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-mono text-[11px]">
              {activeSubtitle !== 'Off' ? `${activeSubtitle} Sub` : 'English Sub'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 font-mono text-[11px] flex items-center gap-1">
              <HardDrive className="w-3 h-3 text-cyan-400" />
              <span>{currentEpisode?.file_size || (content as any).file_size || '420 MB'}</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 font-mono text-[11px] flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>{Math.round(duration / 60)} min</span>
            </span>
          </div>

          {/* Expandable Description */}
          {((currentEpisode?.description) || content.description) && (
            <div className="mt-2 p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <p className={`text-xs text-slate-300 leading-relaxed font-normal ${!showFullDescription ? 'line-clamp-2' : ''}`}>
                {currentEpisode?.description || content.description}
              </p>
              {(currentEpisode?.description || content.description).length > 120 && (
                <button
                  type="button"
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="mt-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5"
                >
                  <span>{showFullDescription ? 'Show less' : 'Read more'}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${showFullDescription ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* =====================================================================
            3. ACTION BUTTONS ROW
            ===================================================================== */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {/* Like */}
          <button
            onClick={handleToggleLike}
            className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 active:scale-95 ${
              hasLiked
                ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-950'
                : 'bg-slate-900/80 hover:bg-slate-850 border-slate-800 text-slate-300'
            }`}
          >
            <ThumbsUp className={`w-4 h-4 ${hasLiked ? 'fill-cyan-400 text-cyan-400' : ''}`} />
            <span>{likesCount}</span>
          </button>

          {/* Dislike */}
          <button
            onClick={handleToggleDislike}
            className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 active:scale-95 ${
              hasDisliked
                ? 'bg-slate-800 border-slate-700 text-slate-200'
                : 'bg-slate-900/80 hover:bg-slate-850 border-slate-800 text-slate-300'
            }`}
          >
            <ThumbsDown className={`w-4 h-4 ${hasDisliked ? 'fill-slate-300 text-slate-300' : ''}`} />
            <span>{dislikesCount}</span>
          </button>

          {/* Add to Watchlist */}
          <button
            onClick={handleToggleWatchlist}
            className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 active:scale-95 ${
              isSavedInWatchlist
                ? 'bg-cyan-500 border-cyan-400 text-slate-950 font-bold shadow-md shadow-cyan-500/25'
                : 'bg-slate-900/80 hover:bg-slate-850 border-slate-800 text-slate-300'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isSavedInWatchlist ? 'fill-slate-950' : ''}`} />
            <span>{isSavedInWatchlist ? 'In Watchlist' : 'Watchlist'}</span>
          </button>

          {/* Report */}
          <button
            onClick={() => setShowReportModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 active:scale-95"
          >
            <Flag className="w-4 h-4 text-slate-400" />
            <span>Report</span>
          </button>

          {/* More */}
          <button
            onClick={() => setShowMoreActionsMenu(true)}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 text-slate-300 transition-all shrink-0 active:scale-95"
            title="More Options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* REPORT MODAL SHEET */}
        {showReportModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-3 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Flag className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-bold text-sm text-white">Report Content Issue</h3>
                </div>
                <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {['Playback or buffering issue', 'Audio sync or subtitle error', 'Incorrect episode details', 'Inappropriate content'].map((reason, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    api.reportContent(isMovie ? 'movie' : 'anime', content.id, reason);
                    setShowReportModal(false);
                    triggerToast('Report submitted for moderation.');
                  }}
                  className="w-full p-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-left text-xs text-slate-200 font-medium"
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* MORE OPTIONS SHEET */}
        {showMoreActionsMenu && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-3 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="font-bold text-sm text-white">Stream Specifications</h3>
                <button onClick={() => setShowMoreActionsMenu(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="text-xs text-slate-300 space-y-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Video Codec:</span>
                  <span className="text-cyan-400">HEVC H.265 Main10</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Audio Channels:</span>
                  <span className="text-cyan-400">AAC 5.1 Surround</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Distribution:</span>
                  <span className="text-emerald-400">100% Authorized</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            4. COMMENTS SECTION (COLLAPSIBLE / ACCORDION)
            ===================================================================== */}
        <div className="flex flex-col gap-3 mt-2 border-t border-slate-800/80 pt-3">
          {/* Comments Header Bar - Click to open/close */}
          <button
            type="button"
            onClick={() => {
              haptic.impact("light");
              setIsCommentsOpen(!isCommentsOpen);
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 transition-all active:scale-[0.99]"
          >
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                Comments
              </h2>
              <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-800/40 px-2 py-0.5 rounded-full">
                {comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
              <span>{isCommentsOpen ? "Tap to close" : "Tap to open comments"}</span>
              {isCommentsOpen ? <ChevronUp className="w-4 h-4 text-cyan-400" /> : <ChevronDown className="w-4 h-4 text-cyan-400" />}
            </div>
          </button>

          {/* Collapsible Comments Content */}
          {isCommentsOpen && (
            <div className="flex flex-col gap-3 animate-in fade-in zoom-in-98 duration-200">
              {/* Comment Input */}
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2">
            {replyingTo && (
              <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-cyan-950/60 border border-cyan-800/40 text-[11px] text-cyan-300">
                <span>Replying to <strong className="text-white">@{replyingTo.username}</strong></span>
                <button onClick={() => setReplyingTo(null)} className="text-slate-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2.5">
              <img
                src={tgUser?.photo_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'}
                alt={tgUser?.first_name || 'User'}
                className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
              />
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handlePostComment();
                }}
                placeholder={replyingTo ? `Reply to @${replyingTo.username}...` : 'Add a comment...'}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 text-slate-400 hover:text-cyan-400 rounded-xl hover:bg-slate-800 transition-colors"
                title="Add Emoji"
              >
                <Smile className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handlePostComment}
                disabled={!newCommentText.trim()}
                className={`p-2 rounded-xl transition-all ${
                  newCommentText.trim()
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/30'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Emoji Bar */}
            {showEmojiPicker && (
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 overflow-x-auto no-scrollbar">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setNewCommentText((prev) => prev + emoji)}
                    className="p-1.5 text-base rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Comments List / Loading / Empty State */}
          {isLoadingComments ? (
            <div className="space-y-3 py-2">
              {[1, 2].map((i) => (
                <div key={i} className="p-3 rounded-2xl bg-slate-900/50 animate-pulse flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-800 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 bg-slate-800 rounded" />
                    <div className="h-3 w-full bg-slate-800 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="p-6 text-center bg-slate-900/40 rounded-2xl border border-slate-800/80 flex flex-col items-center gap-1.5">
              <MessageSquare className="w-8 h-8 text-slate-600" />
              <span className="font-bold text-xs text-slate-300">No comments yet</span>
              <p className="text-[11px] text-slate-500">Be the first to share your thoughts on this episode!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {comments.slice(0, commentsLimit).map((comment) => (
                <div
                  key={comment.id}
                  className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col gap-2"
                >
                  {/* Root Comment Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={comment.user_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'}
                        alt={comment.username}
                        className="w-7 h-7 rounded-full object-cover border border-slate-700 shrink-0"
                      />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-white">{comment.username}</span>
                          {comment.badge && (
                            <span className="text-[9px] font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800 px-1.5 py-0.2 rounded">
                              {comment.badge}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500">{comment.created_at}</span>
                      </div>
                    </div>
                  </div>

                  {/* Comment Text */}
                  <p className="text-xs text-slate-200 leading-relaxed pl-9">
                    {comment.text}
                  </p>

                  {/* Comment Actions Row */}
                  <div className="flex items-center gap-4 pl-9 text-[11px]">
                    <button
                      onClick={() => handleToggleCommentLike(comment.id)}
                      className={`flex items-center gap-1 font-semibold transition-colors ${
                        comment.is_liked ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 ${comment.is_liked ? 'fill-cyan-400' : ''}`} />
                      <span>{comment.likes_count}</span>
                    </button>

                    <button
                      onClick={() => setReplyingTo({ commentId: comment.id, username: comment.username })}
                      className="text-slate-400 hover:text-cyan-400 font-semibold transition-colors"
                    >
                      Reply
                    </button>
                  </div>

                  {/* Nested Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="pl-9 mt-1">
                      {!comment.is_expanded ? (
                        <button
                          onClick={() => toggleExpandReplies(comment.id)}
                          className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 mt-1"
                        >
                          <span>View {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}</span>
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      ) : (
                        <div className="space-y-2 border-l-2 border-cyan-500/30 pl-3 mt-2">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <img
                                  src={reply.user_avatar || 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&q=80'}
                                  alt={reply.username}
                                  className="w-5 h-5 rounded-full object-cover shrink-0"
                                />
                                <span className="font-bold text-[11px] text-white">{reply.username}</span>
                                {reply.badge && (
                                  <span className="text-[8px] bg-slate-800 text-cyan-400 px-1 rounded">
                                    {reply.badge}
                                  </span>
                                )}
                                <span className="text-[9px] text-slate-500 ml-auto">{reply.created_at}</span>
                              </div>
                              <p className="text-[11px] text-slate-300 pl-7">{reply.text}</p>
                              <div className="pl-7 flex items-center gap-3 text-[10px]">
                                <button
                                  onClick={() => handleToggleCommentLike(comment.id, true, reply.id)}
                                  className={`flex items-center gap-1 font-semibold ${
                                    reply.is_liked ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
                                  }`}
                                >
                                  <ThumbsUp className="w-3 h-3" />
                                  <span>{reply.likes_count}</span>
                                </button>
                              </div>
                            </div>
                          ))}
                          <button
                            onClick={() => toggleExpandReplies(comment.id)}
                            className="text-[10px] text-slate-500 hover:text-slate-300 font-semibold block mt-1"
                          >
                            Hide replies
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {comments.length > commentsLimit && (
                <button
                  onClick={() => setCommentsLimit((prev) => prev + 5)}
                  className="w-full py-2 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 rounded-xl text-xs text-cyan-400 font-bold transition-all"
                >
                  Load More Comments
                </button>
              )}
            </div>
          )}
            </div>
          )}
        </div>

        {/* =====================================================================
            8. DIVIDER
            ===================================================================== */}
        <div className="border-t border-slate-900 my-2" />

        {/* =====================================================================
            9. UP NEXT & 10. AUTOPLAY TOGGLE
            ===================================================================== */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Up Next · {currentSeason?.title || 'Season 1'}
              </h2>
            </div>

            {/* Autoplay Toggle */}
            <button
              onClick={() => {
                haptic.selection();
                setIsAutoplayEnabled(!isAutoplayEnabled);
                triggerToast(isAutoplayEnabled ? 'Autoplay Disabled' : 'Autoplay Enabled');
              }}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all active:scale-95 ${
                isAutoplayEnabled
                  ? 'bg-cyan-950/80 border-cyan-500/80 text-cyan-300 shadow-md shadow-cyan-950'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isAutoplayEnabled ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`} />
              <span>{isAutoplayEnabled ? 'Autoplay On' : 'Autoplay Off'}</span>
            </button>
          </div>

          {/* Season Switcher Tabs (if multi-season) */}
          {allSeasons.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {allSeasons.map((s) => {
                const isSelected = currentSeason?.id === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      haptic.selection();
                      setCurrentSeason(s);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                        : 'bg-slate-900 hover:bg-slate-850 text-slate-400 border-slate-800'
                    }`}
                  >
                    {s.title || `Season ${s.season_number}`}
                  </button>
                );
              })}
            </div>
          )}

          {/* =====================================================================
              11. EPISODE CARDS LIST
              ===================================================================== */}
          <div className="flex flex-col gap-2.5">
            {allSeasonEpisodes.length === 0 ? (
              <div className="p-6 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-xs text-slate-400">
                No extra episodes in this season.
              </div>
            ) : (
              allSeasonEpisodes.map((ep) => {
                const isCurrent = currentEpisode?.id === ep.id;
                return (
                  <div
                    key={ep.id}
                    onClick={() => {
                      if (isCurrent) return;
                      haptic.notification('success');
                      if (currentSeason) {
                        setCurrentEpisode(ep);
                        setCurrentTime(0);
                        if (onEpisodeChange) onEpisodeChange(currentSeason, ep);
                      }
                    }}
                    className={`p-3 rounded-2xl flex items-center gap-3.5 text-left transition-all border cursor-pointer active:scale-[0.99] group ${
                      isCurrent
                        ? 'bg-cyan-950/60 border-cyan-500 shadow-md shadow-cyan-950/50'
                        : 'bg-slate-900/70 hover:bg-slate-900 border-slate-800/80 hover:border-cyan-500/30'
                    }`}
                  >
                    {/* Thumbnail with progress indicator */}
                    <div className="relative w-28 sm:w-32 aspect-video rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700/50">
                      <img
                        src={ep.thumbnail_url || content.backdrop_url || content.poster_url}
                        alt={ep.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/images/hero_cyber_samurai.jpg';
                        }}
                      />
                      {isCurrent ? (
                        <div className="absolute inset-0 bg-cyan-950/60 backdrop-blur-[2px] flex items-center justify-center">
                          <div className="px-2 py-1 rounded-full bg-cyan-500 text-slate-950 font-bold text-[10px] flex items-center gap-1 shadow-lg">
                            <Play className="w-3 h-3 fill-slate-950" />
                            <span>Playing</span>
                          </div>
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-7 h-7 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shadow-lg">
                            <Play className="w-3.5 h-3.5 fill-slate-950 ml-0.5" />
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono text-slate-200">
                        {Math.round((ep.duration_seconds || 1440) / 60)}m
                      </div>

                      {/* Watched progress bar */}
                      {isCurrent && (
                        <div className="absolute bottom-0 inset-x-0 h-1 bg-slate-800">
                          <div
                            className="h-full bg-cyan-400"
                            style={{ width: `${Math.min(100, (currentTime / (duration || 1)) * 100)}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Title & Description */}
                    <div className="min-w-0 flex-1 flex flex-col justify-center">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          isCurrent ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-cyan-400 border border-cyan-800/40'
                        }`}>
                          S{currentSeason?.season_number || 1} · E{ep.episode_number}
                        </span>
                        <h4 className={`text-xs font-bold truncate ${isCurrent ? 'text-cyan-300' : 'text-white group-hover:text-cyan-300'}`}>
                          {ep.title}
                        </h4>
                      </div>

                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-tight">
                        {ep.description || 'Watch full episode in high definition streaming.'}
                      </p>

                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500">
                        <span>{Math.round((ep.duration_seconds || 1440) / 60)} min</span>
                        <span>·</span>
                        <span className={isCurrent ? 'text-cyan-400 font-bold' : 'text-slate-400'}>
                          {isCurrent ? 'Currently Watching' : 'Play Episode →'}
                        </span>
                      </div>
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
