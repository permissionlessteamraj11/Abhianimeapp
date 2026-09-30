import React from 'react';
import { Anime, Movie } from '../types';
import { Star, Bookmark, Play } from 'lucide-react';
import { haptic } from '../lib/telegram';

interface ContentCardProps {
  item: Anime | Movie;
  isSaved?: boolean;
  onSelect: (item: Anime | Movie) => void;
  onToggleSave?: (item: Anime | Movie) => void;
  compact?: boolean;
}

export const ContentCard: React.FC<ContentCardProps> = ({
  item,
  isSaved = false,
  onSelect,
  onToggleSave,
  compact = false
}) => {
  const isMovie = 'runtime_minutes' in item;
  const typeLabel = isMovie ? 'Movie' : 'Series';
  const [imgError, setImgError] = React.useState(false);

  return (
    <div className="group relative flex flex-col cursor-pointer select-none" onClick={() => onSelect(item)}>
      {/* Poster Container */}
      <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-800/80 shadow-md group-hover:border-cyan-500/40 transition-all duration-300">
        {!imgError && item.poster_url ? (
          <img
            src={item.poster_url}
            alt={item.title}
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col items-center justify-center p-3 text-center">
            <img src="/stark-logo.jpg" alt="Stark Anime" className="w-12 h-12 rounded-lg opacity-40 mb-2 object-cover" />
            <span className="text-[11px] font-bold text-slate-400 line-clamp-2">{item.title}</span>
          </div>
        )}

        {/* Gradient Overlay for subtle depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80" />

        {/* Top Floating Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
          {/* Rating Badge */}
          <div className="flex items-center gap-1 bg-slate-950/80 backdrop-blur-md border border-slate-700/50 px-1.5 py-0.5 rounded text-[10px] font-bold text-amber-400">
            <Star className="w-2.5 h-2.5 fill-amber-400" />
            <span className="font-mono tabular-nums">{item.rating?.toFixed(1) || '8.5'}</span>
          </div>

          {/* Classification */}
          <div className="bg-slate-950/80 backdrop-blur-md border border-slate-700/50 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-300">
            {item.classification}
          </div>
        </div>

        {/* Save Toggle Button */}
        {onToggleSave && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              haptic.selection();
              onToggleSave(item);
            }}
            className={`absolute bottom-2 right-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg backdrop-blur-md border transition-all active:scale-90 ${
              isSaved
                ? 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'bg-black/50 hover:bg-black/70 border-white/20 text-white'
            }`}
            title={isSaved ? 'Remove from Saved' : 'Save to Library'}
            aria-label="Save"
          >
            <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-slate-950' : ''}`} />
          </button>
        )}

        {/* Hover / Active Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 backdrop-blur-[2px]">
          <div className="w-10 h-10 rounded-full bg-cyan-500 text-white flex items-center justify-center shadow-lg shadow-cyan-500/40">
            <Play className="w-4 h-4 fill-white ml-0.5" />
          </div>
        </div>
      </div>

      {/* Title & Clean Unboxed Metadata */}
      <div className="mt-1.5 flex flex-col">
        <h3 className={`font-semibold text-slate-100 group-hover:text-cyan-400 transition-colors line-clamp-1 ${compact ? 'text-xs' : 'text-sm'}`}>
          {item.title}
        </h3>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
          <span>{item.release_year}</span>
          <span aria-hidden="true">·</span>
          <span>{typeLabel}</span>
          {item.genres?.[0] && (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate max-w-[80px]">{item.genres[0]}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
