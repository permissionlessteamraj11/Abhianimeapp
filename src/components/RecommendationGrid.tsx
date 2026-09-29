import React from 'react';
import { Anime, Movie } from '../types';
import { ContentCard } from './ContentCard';
import { Sparkles, RefreshCw } from 'lucide-react';
import { haptic } from '../lib/telegram';

interface RecommendationGridProps {
  items: (Anime | Movie)[];
  savedItemIds: Set<string>;
  onSelectContent: (item: Anime | Movie) => void;
  onToggleSave: (item: Anime | Movie) => void;
  onRefreshRecommendations: () => void;
  isLoading?: boolean;
}

export const RecommendationGrid: React.FC<RecommendationGridProps> = ({
  items,
  savedItemIds,
  onSelectContent,
  onToggleSave,
  onRefreshRecommendations,
  isLoading = false
}) => {
  if (items.length === 0 && !isLoading) return null;

  return (
    <section className="w-full px-4 py-4 border-t border-slate-900/80">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <h2 className="font-['Syne'] font-bold text-base sm:text-lg text-white tracking-tight">
            Recommended For You
          </h2>
        </div>

        <button
          onClick={() => {
            haptic.impact('light');
            onRefreshRecommendations();
          }}
          disabled={isLoading}
          className="text-xs font-semibold text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1 min-h-[36px] px-2 rounded-lg hover:bg-slate-900"
          title="Vary Recommendations"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Vary</span>
        </button>
      </div>

      {/* 3-Column Mobile Grid [A][B][C] / [D][E][F] / [G][H][I] */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
        {isLoading
          ? Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5 animate-pulse">
                <div className="aspect-[3/4] w-full bg-slate-900 rounded-xl" />
                <div className="h-3 w-3/4 bg-slate-800 rounded" />
                <div className="h-2 w-1/2 bg-slate-800/60 rounded" />
              </div>
            ))
          : items.map((item) => {
              const isSaved = savedItemIds.has(item.id);
              return (
                <div key={item.id} className="w-full">
                  <ContentCard
                    item={item}
                    isSaved={isSaved}
                    onSelect={onSelectContent}
                    onToggleSave={onToggleSave}
                    compact
                  />
                </div>
              );
            })}
      </div>
    </section>
  );
};
