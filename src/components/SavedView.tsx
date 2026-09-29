import React, { useState } from 'react';
import { Anime, Movie, SavedItem } from '../types';
import { Bookmark, MoreVertical, Trash2, Play, Sparkles } from 'lucide-react';
import { haptic } from '../lib/telegram';

interface SavedViewProps {
  savedItems: SavedItem[];
  onSelectContent: (item: Anime | Movie) => void;
  onRemoveSaved: (contentType: 'anime' | 'movie', contentId: string) => void;
  onExploreHome: () => void;
}

export const SavedView: React.FC<SavedViewProps> = ({
  savedItems,
  onSelectContent,
  onRemoveSaved,
  onExploreHome
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  return (
    <div className="w-full min-h-screen px-4 py-4 pb-28 select-none">
      {/* Title Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-['Syne'] font-extrabold text-xl text-white tracking-tight">
            Saved Library
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            {savedItems.length} {savedItems.length === 1 ? 'title' : 'titles'} saved for later
          </p>
        </div>

        <div className="w-9 h-9 rounded-xl bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          <Bookmark className="w-4 h-4 fill-cyan-400" />
        </div>
      </div>

      {/* Empty State */}
      {savedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-4 shadow-inner">
            <Bookmark className="w-8 h-8" />
          </div>
          <h2 className="text-base font-bold text-white mb-1">Your Library is Empty</h2>
          <p className="text-xs text-slate-400 max-w-xs mb-6">
            Tap the bookmark icon on any anime or movie card to save it to your personal streaming list.
          </p>
          <button
            onClick={() => {
              haptic.impact('light');
              onExploreHome();
            }}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-xs shadow-lg shadow-cyan-500/25 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Explore Catalog
          </button>
        </div>
      ) : (
        /* 3-Column Mobile Grid */
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
          {savedItems.map((s) => {
            const item = s.content;
            if (!item) return null;
            const isMovie = 'runtime_minutes' in item;

            return (
              <div key={s.id} className="relative flex flex-col group">
                {/* Poster */}
                <div
                  onClick={() => onSelectContent(item)}
                  className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shadow-md cursor-pointer"
                >
                  <img
                    src={item.poster_url}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                  {/* Play badge */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                    <div className="w-9 h-9 rounded-full bg-cyan-500 text-white flex items-center justify-center shadow-lg">
                      <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                    </div>
                  </div>

                  {/* 3-Dot (⋮) Trigger Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      haptic.selection();
                      setActiveMenuId(activeMenuId === s.id ? null : s.id);
                    }}
                    className="absolute top-1.5 right-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/10 active:scale-95 z-10"
                    aria-label="Options"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>

                  {/* Dropdown Menu for Remove from Saved */}
                  {activeMenuId === s.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-10 right-1 bg-slate-900/95 border border-slate-800 rounded-xl p-1 shadow-2xl z-20 animate-in fade-in zoom-in-95 min-w-[130px]"
                    >
                      <button
                        onClick={() => {
                          haptic.impact('medium');
                          onRemoveSaved(s.content_type, s.content_id);
                          setActiveMenuId(null);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 text-rose-400 hover:bg-rose-950/40 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Title */}
                <div className="mt-1.5 flex flex-col">
                  <h3
                    onClick={() => onSelectContent(item)}
                    className="font-semibold text-xs text-slate-100 group-hover:text-cyan-400 transition-colors line-clamp-1 cursor-pointer"
                  >
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <span>{item.release_year}</span>
                    <span>·</span>
                    <span>{isMovie ? 'Movie' : 'Series'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
