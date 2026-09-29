import React from 'react';
import { Movie, Anime } from '../types';
import { Play, Bookmark, Star, Clock, ShieldCheck, ChevronLeft } from 'lucide-react';
import { haptic } from '../lib/telegram';
import { ContentCard } from './ContentCard';

interface MovieDetailsModalProps {
  movie: Movie;
  isSaved: boolean;
  moreLikeThis: (Anime | Movie)[];
  savedItemIds: Set<string>;
  onClose: () => void;
  onToggleSave: (movie: Movie) => void;
  onPlayMovie: (movie: Movie) => void;
  onSelectRelated: (item: Anime | Movie) => void;
}

export const MovieDetailsModal: React.FC<MovieDetailsModalProps> = ({
  movie,
  isSaved,
  moreLikeThis,
  savedItemIds,
  onClose,
  onToggleSave,
  onPlayMovie,
  onSelectRelated
}) => {
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
            onToggleSave(movie);
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

      {/* Hero Backdrop */}
      <div className="relative w-full aspect-[16/9] -mt-16 bg-slate-900">
        <img
          src={movie.backdrop_url || movie.poster_url}
          alt={movie.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
      </div>

      {/* Main Info */}
      <div className="px-4 -mt-10 relative z-10">
        <div className="flex gap-3.5 items-end">
          <div className="w-24 sm:w-28 aspect-[3/4] rounded-xl overflow-hidden shadow-2xl border-2 border-slate-800 shrink-0 bg-slate-900">
            <img
              src={movie.poster_url}
              alt={movie.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex flex-col justify-end pb-1">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-950/80 border border-cyan-500/30 px-1.5 py-0.5 rounded">
                {movie.classification}
              </span>
              <span className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded font-mono">
                {movie.runtime_minutes} min
              </span>
            </div>
            <h1 className="font-['Syne'] font-extrabold text-xl sm:text-2xl text-white leading-tight tracking-tight">
              {movie.title}
            </h1>
            {movie.alt_title && (
              <span className="text-xs text-slate-400 font-medium line-clamp-1 italic mt-0.5">
                {movie.alt_title}
              </span>
            )}
          </div>
        </div>

        {/* Unboxed Metadata Line */}
        <div className="flex items-center gap-2 text-xs text-slate-400 mt-3 pt-3 border-t border-slate-900 font-medium">
          <div className="flex items-center gap-1 text-amber-400 font-bold">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            <span className="font-mono tabular-nums">{movie.rating.toFixed(1)}</span>
          </div>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <span>{movie.release_year}</span>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <span>Theatrical Feature</span>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <span>{movie.language}</span>
        </div>

        {/* Primary Action Button */}
        <div className="mt-4">
          <button
            onClick={() => {
              haptic.impact('medium');
              onPlayMovie(movie);
            }}
            className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/25 active:scale-[0.98] transition-all"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Watch Full Movie</span>
          </button>
        </div>

        {/* Genres */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {movie.genres?.map((g) => (
            <span
              key={g}
              className="text-[11px] font-medium text-slate-300 bg-slate-900/90 border border-slate-800/80 px-2.5 py-1 rounded-lg"
            >
              {g}
            </span>
          ))}
        </div>

        {/* About */}
        <div className="mt-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">About</h3>
          <p className="text-xs text-slate-300 leading-relaxed font-normal">
            {movie.description}
          </p>
        </div>

        {/* License Note */}
        <div className="mt-4 p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-slate-400 leading-tight">
            <span className="font-semibold text-slate-300 block mb-0.5">Licensed & Authorized Feature Film</span>
            <span>{movie.distribution_license_notes || 'All streaming assets legally distributed under formal theatrical VOD licensing.'}</span>
          </div>
        </div>

        {/* More Like This */}
        {moreLikeThis.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-bold text-white mb-2 font-['Syne']">More Like This</h3>
            <div className="grid grid-cols-3 gap-2.5">
              {moreLikeThis.slice(0, 6).map((item) => (
                <div key={item.id} className="w-full">
                  <ContentCard
                    item={item}
                    isSaved={savedItemIds.has(item.id)}
                    onSelect={onSelectRelated}
                    compact
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
