import React, { useState } from "react";
import { Anime, Movie, SavedItem } from "../types";
import { Bookmark, MoreVertical, Trash2, Play, Sparkles, Check, CheckSquare, X } from "lucide-react";
import { haptic } from "../lib/telegram";

interface SavedViewProps {
  savedItems: SavedItem[];
  onSelectContent: (item: Anime | Movie) => void;
  onRemoveSaved: (contentType: "anime" | "movie", contentId: string) => void;
  onExploreHome: () => void;
}

export const SavedView: React.FC<SavedViewProps> = ({
  savedItems,
  onSelectContent,
  onRemoveSaved,
  onExploreHome
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    haptic.selection();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    haptic.selection();
    if (selectedIds.size === savedItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(savedItems.map((s) => s.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    haptic.impact("medium");
    savedItems.forEach((s) => {
      if (selectedIds.has(s.id)) {
        onRemoveSaved(s.content_type, s.content_id);
      }
    });
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  return (
    <div className="w-full min-h-screen px-4 py-4 pb-28 select-none">
      {/* Title Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-['Syne'] font-extrabold text-xl text-white tracking-tight">
            Saved Library
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            {savedItems.length} {savedItems.length === 1 ? "title" : "titles"} saved for later
          </p>
        </div>

        <div className="flex items-center gap-2">
          {savedItems.length > 0 && (
            <button
              onClick={() => {
                haptic.selection();
                if (isSelectionMode) {
                  setIsSelectionMode(false);
                  setSelectedIds(new Set());
                } else {
                  setIsSelectionMode(true);
                  setSelectedIds(new Set());
                }
              }}
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all active:scale-95 ${
                isSelectionMode
                  ? "bg-rose-950/80 border-rose-500/50 text-rose-400"
                  : "bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300"
              }`}
              title={isSelectionMode ? "Cancel selection" : "Select & Delete"}
              aria-label="Delete options"
            >
              {isSelectionMode ? <X className="w-4 h-4" /> : <Trash2 className="w-4 h-4 text-rose-400" />}
            </button>
          )}

          <div className="w-9 h-9 rounded-xl bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Bookmark className="w-4 h-4 fill-cyan-400" />
          </div>
        </div>
      </div>

      {/* Selection Mode Actions Bar */}
      {isSelectionMode && savedItems.length > 0 && (
        <div className="mb-4 p-2.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between animate-in fade-in duration-150">
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
            <span>{selectedIds.size === savedItems.length ? "Deselect All" : "Select All"}</span>
          </button>

          <button
            onClick={handleDeleteSelected}
            disabled={selectedIds.size === 0}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md ${
              selectedIds.size > 0
                ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Selected ({selectedIds.size})</span>
          </button>
        </div>
      )}

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
              haptic.impact("light");
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
            const isMovie = "runtime_minutes" in item;
            const isSelected = selectedIds.has(s.id);

            return (
              <div key={s.id} className="relative flex flex-col group">
                {/* Poster */}
                <div
                  onClick={() => {
                    if (isSelectionMode) {
                      toggleSelect(s.id);
                    } else {
                      onSelectContent(item);
                    }
                  }}
                  className={`relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-slate-900 border shadow-md cursor-pointer transition-all ${
                    isSelectionMode && isSelected
                      ? "border-cyan-400 ring-2 ring-cyan-400/50 scale-[0.98]"
                      : "border-slate-800"
                  }`}
                >
                  <img
                    src={item.poster_url}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                  {/* Selection Mode Overlay Checkbox */}
                  {isSelectionMode ? (
                    <div className="absolute top-2 left-2 z-20">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                          isSelected
                            ? "bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/50"
                            : "bg-black/60 border border-white/40 text-transparent"
                        }`}
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    </div>
                  ) : (
                    <>
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
                              haptic.impact("medium");
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
                    </>
                  )}
                </div>

                {/* Title */}
                <div className="mt-1.5 flex flex-col">
                  <h3
                    onClick={() => {
                      if (isSelectionMode) {
                        toggleSelect(s.id);
                      } else {
                        onSelectContent(item);
                      }
                    }}
                    className="font-semibold text-xs text-slate-100 group-hover:text-cyan-400 transition-colors line-clamp-1 cursor-pointer"
                  >
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <span>{item.release_year}</span>
                    <span>·</span>
                    <span>{isMovie ? "Movie" : "Series"}</span>
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
