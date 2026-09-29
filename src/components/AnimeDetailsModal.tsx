import React, { useState } from 'react';
import { Anime, Episode, Season } from '../types';
import { Play, Bookmark, Star, Clock, ShieldCheck, ChevronLeft } from 'lucide-react';
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

  const currentSeason = seasons[selectedSeasonIndex] || seasons[0];
  const episodes = currentSeason?.episodes || [];

  return (
    <div className="fixed inset-0 z-40 bg-slate-950 overflow-y-auto no-scrollbar pb-20 select-none animate-in fade-in duration-200">
      {/* Top Floating Back & Action Bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-slate-950/90 via-slate-950/70 to-transparent backdrop-blur-md">
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

      {/* Hero Backdrop with Scrim */}
      <div className="relative w-full aspect-[16/9] -mt-16 bg-slate-900">
        <img
          src={anime.backdrop_url || anime.poster_url}
          alt={anime.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
      </div>

      {/* Main Content Info Card */}
      <div className="px-4 -mt-10 relative z-10">
        <div className="flex gap-3.5 items-end">
          {/* Poster */}
          <div className="w-24 sm:w-28 aspect-[3/4] rounded-xl overflow-hidden shadow-2xl border-2 border-slate-800 shrink-0 bg-slate-900">
            <img
              src={anime.poster_url}
              alt={anime.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Title & Classification */}
          <div className="flex flex-col justify-end pb-1">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-950/80 border border-cyan-500/30 px-1.5 py-0.5 rounded">
                {anime.classification}
              </span>
              <span className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">
                {anime.status}
              </span>
            </div>
            <h1 className="font-['Syne'] font-extrabold text-xl sm:text-2xl text-white leading-tight tracking-tight">
              {anime.title}
            </h1>
            {anime.alt_title && (
              <span className="text-xs text-slate-400 font-medium line-clamp-1 italic mt-0.5">
                {anime.alt_title}
              </span>
            )}
          </div>
        </div>

        {/* Unboxed Metadata Line */}
        <div className="flex items-center gap-2 text-xs text-slate-400 mt-3 pt-3 border-t border-slate-900 font-medium">
          <div className="flex items-center gap-1 text-amber-400 font-bold">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            <span className="font-mono tabular-nums">{anime.rating.toFixed(1)}</span>
          </div>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <span>{anime.release_year}</span>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <span>{seasons.length} {seasons.length === 1 ? 'Season' : 'Seasons'}</span>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <span>{anime.language}</span>
        </div>

        {/* Primary Action Button */}
        <div className="mt-4">
          <button
            onClick={() => {
              if (currentSeason && episodes[0]) {
                haptic.impact('medium');
                onPlayEpisode(anime, currentSeason, episodes[0]);
              }
            }}
            disabled={episodes.length === 0}
            className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/25 active:scale-[0.98] transition-all"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Play S1 E1</span>
          </button>
        </div>

        {/* Genres List */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {anime.genres?.map((g) => (
            <span
              key={g}
              className="text-[11px] font-medium text-slate-300 bg-slate-900/90 border border-slate-800/80 px-2.5 py-1 rounded-lg"
            >
              {g}
            </span>
          ))}
        </div>

        {/* About / Description */}
        <div className="mt-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">About</h3>
          <p className="text-xs text-slate-300 leading-relaxed font-normal">
            {anime.description}
          </p>
        </div>

        {/* Distribution Rights Confirmation Note */}
        <div className="mt-4 p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-slate-400 leading-tight">
            <span className="font-semibold text-slate-300 block mb-0.5">Licensed & Authorized Distribution</span>
            <span>{anime.distribution_license_notes || 'All streaming assets legally distributed under formal syndicate licensing agreement.'}</span>
          </div>
        </div>

        {/* SEASONS & EPISODES SECTION */}
        <div className="mt-6">
          <h3 className="text-sm font-bold text-white mb-2 font-['Syne']">Episodes</h3>

          {/* Horizontal Season Tabs */}
          {seasons.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-3">
              {seasons.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => {
                    haptic.selection();
                    setSelectedSeasonIndex(idx);
                  }}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedSeasonIndex === idx
                      ? 'bg-slate-100 text-slate-900 shadow-sm'
                      : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {s.title || `Season ${s.season_number}`}
                </button>
              ))}
            </div>
          )}

          {/* Episodes List */}
          <div className="flex flex-col gap-2.5">
            {episodes.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-900">
                Episodes currently being encoded for authorized distribution.
              </div>
            ) : (
              episodes.map((ep) => (
                <div
                  key={ep.id}
                  onClick={() => {
                    haptic.impact('light');
                    if (currentSeason) onPlayEpisode(anime, currentSeason, ep);
                  }}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-cyan-500/30 active:scale-[0.99] transition-all cursor-pointer group"
                >
                  {/* Thumbnail */}
                  <div className="relative w-24 aspect-[16/9] rounded-lg overflow-hidden shrink-0 bg-slate-800">
                    <img
                      src={ep.thumbnail_url || anime.backdrop_url}
                      alt={ep.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-80 group-hover:opacity-100">
                      <Play className="w-3.5 h-3.5 fill-white text-white" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex flex-col justify-center flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-1">
                        {ep.episode_number}. {ep.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                      {ep.description}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-1 font-mono">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{Math.round(ep.duration_seconds / 60)}m</span>
                      {ep.release_date && (
                        <>
                          <span>·</span>
                          <span>{ep.release_date}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
