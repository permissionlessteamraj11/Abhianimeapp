import React, { useRef } from 'react';
import { Anime, Movie, HomepageSection } from '../types';
import { ContentCard } from './ContentCard';
import { ChevronRight } from 'lucide-react';

interface ContentRowProps {
  section: HomepageSection;
  savedItemIds: Set<string>;
  onSelectContent: (item: Anime | Movie) => void;
  onToggleSave: (item: Anime | Movie) => void;
  onSeeAll?: (section: HomepageSection) => void;
}

export const ContentRow: React.FC<ContentRowProps> = ({
  section,
  savedItemIds,
  onSelectContent,
  onToggleSave,
  onSeeAll
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const items = section.items || [];

  if (items.length === 0) return null;

  return (
    <section className="w-full py-3">
      {/* Section Header */}
      <div className="flex items-center justify-between px-4 mb-2.5">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="font-['Syne'] font-bold text-base sm:text-lg text-white tracking-tight">
              {section.title}
            </h2>
            <ChevronRight className="w-4 h-4 text-cyan-400" />
          </div>
          {section.subtitle && (
            <p className="text-[11px] text-slate-400 font-medium">
              {section.subtitle}
            </p>
          )}
        </div>

        {onSeeAll && items.length > 4 && (
          <button
            onClick={() => onSeeAll(section)}
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-0.5"
          >
            <span>More</span>
          </button>
        )}
      </div>

      {/* Horizontal Single-Row Scrolling Cards */}
      <div
        ref={scrollRef}
        className="flex items-start gap-3 px-4 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory"
      >
        {items.map((item) => {
          const isSaved = savedItemIds.has(item.id);
          return (
            <div
              key={item.id}
              className="w-[125px] sm:w-[150px] shrink-0 snap-start"
            >
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
