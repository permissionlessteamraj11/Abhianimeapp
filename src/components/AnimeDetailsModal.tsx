import React, { useState } from 'react';
import { Anime, Episode, Season } from '../types';
import { Play, Bookmark, Star, Clock, ChevronLeft, Tv, Film } from 'lucide-react';
import { haptic } from '../lib/telegram';

interface AnimeDetailsModalProps {
  anime: Anime;
  isSaved: boolean;
  onClose: () => void;
  onToggleSave: (anime: Anime) => void;
  onPlayEpisode: (anime: Anime, season: Season, episode: Episode) => void;
}

export const AnimeDetailsModal: React.FC<AnimeDetailsModalProps> = ({
  anime,
  isSaved,
  onClose,
  onToggleSave,
  onPlayEpisode
}) => {
  const seasons = anime.seasons || [];
  const [selectedSeasonIndex, setSelectedSeasonIndex] = useState(0);
  const [showFullDesc, setShowFullDesc] = useState(false);

  const currentSeason = seasons[selectedSeasonIndex] || seasons[0];
  const episodes = currentSeason?.episodes || [];

  return (
    <div className="fixed inset-0 z-40 bg-slate-950 overflow-y-auto no-scrollbar pb-24 select-none animate-in fade-in duration-200">
      {/* Top Floating Back & Bookmark Bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-slate-950/95 via-slate-950/80 to-transparent backdrop-blur-md">
        <button
          onClick={() => {
            haptic.impact('light');
            onClose();
          }}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-800 active:scale-95 transition-all"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={() => {
            haptic.selection();
            onToggleSave(anime);
          }}
          className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border transition-all active:scale-95 ${
            isSaved
              ? 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-md shadow-cyan-500/25'
              : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300'
          }`}
          aria-label="Bookmark"
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-slate-950' : ''}`} />
        </button>
      </div>

      {/* Hero Backdrop Banner */}
      <div className="relative w-full aspect-[16/9] -mt-16 bg-slate-900 overflow-hidden">
        <img
          src={anime.backdrop_url || anime.poster_url}
          alt={anime.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-top"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/images/hero_cyber_samurai.jpg';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
      </div>

      {/* Main Details & Title Card */}
      <div className="px-4 -mt-12 relative z-10">
        <div className="flex gap-3.5 items-end">
          {/* Poster */}
          <div className="w-24 sm:w-28 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-800 shrink-0 bg-slate-900">
            <img
              src={anime.poster_url}
              alt={anime.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/stark-logo.jpg';
              }}
            />
          </div>

          {/* Title & Classification */}
          <div className="flex flex-col justify-end pb-1 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-950/80 border border-cyan-500/30 px-1.5 py-0.5 rounded">
                {anime.classification || 'PG-13'}
              </span>
              <span className="text-[10px] text-slate-300 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">
                {anime.status || 'Ongoing'}
              </span>
              <span className="text-[10px] text-amber-400 font-bold flex items-center gap-0.5 bg-amber-950/60 border border-amber-800/40 px-1.5 py-0.5 rounded">
                <Star className="w-3 h-3 fill-amber-400" />
                {anime.rating?.toFixed(1) || '9.0'}
              </span>
            </div>

            <h1 className="font-['Syne'] font-extrabold text-xl sm:text-2xl text-white leading-tight tracking-tight line-clamp-2">
              {anime.title}
            </h1>

            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
              <span>{anime.release_year || 2026}</span>
              <span>·</span>
              <span className="text-cyan-400 font-semibold">{seasons.length} {seasons.length === 1 ? 'Season' : 'Seasons'}</span>
              <span>·</span>
              <span>{anime.language || 'Japanese'}</span>
            </div>
          </div>
        </div>

        {/* Quick Play First Episode Button */}
        {currentSeason && episodes[0] && (
          <div className="mt-4">
            <button
              onClick={() => {
                haptic.impact('medium');
                onPlayEpisode(anime, currentSeason, episodes[0]);
              }}
              className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/25 active:scale-[0.98] transition-all"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Watch {currentSeason.title || `Season ${currentSeason.season_number}`} Episode 1</span>
            </button>
          </div>
        )}

        {/* Synopsis / Description (Clean & Expandable) */}
        {anime.description && (
          <div className="mt-3.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <p className={`text-xs text-slate-300 leading-relaxed font-normal ${!showFullDesc ? 'line-clamp-2' : ''}`}>
              {anime.description}
            </p>
            {anime.description.length > 120 && (
              <button
                type="button"
                onClick={() => setShowFullDesc(!showFullDesc)}
                className="mt-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300"
              >
                {showFullDesc ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
        )}

        {/* =====================================================================
            SEASONS HEADER & SELECTOR (PROMINENTLY UP TOP)
            ===================================================================== */}
        <div className="mt-6 pt-2 border-t border-slate-900">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Tv className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white font-['Syne'] uppercase tracking-wide">
                Seasons
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {seasons.length} Available
            </span>
          </div>

          {/* Horizontal Seasons Selector Tabs */}
          {seasons.length > 0 ? (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {seasons.map((s, idx) => {
                const epCount = s.episodes?.length || 0;
                const isSelected = selectedSeasonIndex === idx;

                return (
                  <button
                    key={s.id || idx}
                    onClick={() => {
                      haptic.selection();
                      setSelectedSeasonIndex(idx);
                    }}
                    className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 border ${
                      isSelected
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-400 shadow-lg shadow-cyan-500/25 scale-[1.02]'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800'
                    }`}
                  >
                    <span>{s.title || `Season ${s.season_number}`}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        isSelected ? 'bg-black/30 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {epCount} {epCount === 1 ? 'ep' : 'eps'}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
              No seasons configured for this series yet.
            </div>
          )}
        </div>

        {/* =====================================================================
            EPISODES LIST (DIRECTLY BELOW SELECTED SEASON)
            ===================================================================== */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <span>Episodes</span>
              <span className="text-cyan-400 font-mono">({episodes.length})</span>
            </h3>
            {currentSeason && (
              <span className="text-[11px] text-slate-400 font-medium truncate max-w-[180px]">
                {currentSeason.title || `Season ${currentSeason.season_number}`}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            {episodes.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800/80 flex flex-col items-center gap-2">
                <Film className="w-8 h-8 text-slate-600" />
                <span className="font-bold text-xs text-slate-300">No episodes in this season yet</span>
                <p className="text-[11px] text-slate-500 max-w-xs">
                  New episodes can be added anytime through the Admin Console.
                </p>
              </div>
            ) : (
              episodes.map((ep) => (
                <div
                  key={ep.id}
                  onClick={() => {
                    haptic.impact('light');
                    if (currentSeason) onPlayEpisode(anime, currentSeason, ep);
                  }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800/80 hover:border-cyan-500/40 active:scale-[0.99] transition-all cursor-pointer group shadow-sm"
                >
                  {/* Video Thumbnail with duration and Play Button */}
                  <div className="relative w-28 aspect-[16/9] rounded-xl overflow-hidden shrink-0 bg-slate-800 border border-slate-700/50">
                    <img
                      src={ep.thumbnail_url || anime.backdrop_url || anime.poster_url}
                      alt={ep.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/images/hero_cyber_samurai.jpg';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                      <div className="w-7 h-7 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shadow-lg shadow-cyan-500/40 group-hover:scale-110 transition-transform">
                        <Play className="w-3.5 h-3.5 fill-slate-950 ml-0.5" />
                      </div>
                    </div>
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md text-[9px] font-mono text-slate-200">
                      {Math.round(ep.duration_seconds / 60)}m
                    </div>
                  </div>

                  {/* Episode Title & Information */}
                  <div className="flex flex-col justify-center flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold font-mono text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/40 shrink-0">
                        EP {ep.episode_number}
                      </span>
                      <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                        {ep.title}
                      </h4>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                      {ep.description || 'Watch full episode in high definition streaming.'}
                    </p>

                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500 font-medium">
                      <span className="flex items-center gap-1 text-slate-400 font-mono">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{Math.round(ep.duration_seconds / 60)} mins</span>
                      </span>
                      <span>·</span>
                      <span className="text-cyan-400 font-semibold group-hover:underline">Play Now →</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Genres & Metadata Badges at Bottom */}
        {anime.genres && anime.genres.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-900 flex flex-wrap gap-1.5">
            {anime.genres.map((g) => (
              <span
                key={g}
                className="text-[11px] font-medium text-slate-400 bg-slate-900/80 border border-slate-800 px-2.5 py-1 rounded-lg"
              >
                {g}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
