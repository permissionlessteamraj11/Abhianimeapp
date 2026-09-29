import React, { useState, useEffect, useRef } from 'react';
import { Anime, Movie, Category } from '../types';
import { api } from '../lib/api';
import { Search, X, Star, ChevronRight } from 'lucide-react';
import { haptic } from '../lib/telegram';
import { ContentCard } from './ContentCard';

interface SearchModalProps {
  categories: Category[];
  savedItemIds: Set<string>;
  onClose: () => void;
  onSelectContent: (item: Anime | Movie) => void;
  onToggleSave: (item: Anime | Movie) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  categories,
  savedItemIds,
  onClose,
  onSelectContent,
  onToggleSave
}) => {
  const [query, setQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [results, setResults] = useState<(Anime | Movie)[]>([]);
  const [exactMatches, setExactMatches] = useState<(Anime | Movie)[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input automatically on open
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced Search Effect
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setExactMatches([]);
      return;
    }

    setIsSearching(true);
    const handler = setTimeout(async () => {
      try {
        const data = await api.search(query, selectedCat);
        setResults(data.results || []);
        setExactMatches(data.exactMatches || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(handler);
  }, [query, selectedCat]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col select-none animate-in fade-in duration-200">
      {/* Top Search Input Bar */}
      <div className="p-3 bg-slate-950/90 border-b border-slate-800/80 flex items-center gap-2">
        <div className="relative flex-1 flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search anime, movies, genres, episodes..."
            className="w-full h-11 pl-9 pr-9 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/80 transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 p-1 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={() => {
            haptic.selection();
            onClose();
          }}
          className="min-h-[44px] px-3 flex items-center justify-center text-xs font-semibold text-slate-400 hover:text-white"
        >
          Cancel
        </button>
      </div>

      {/* Category Filter Bar */}
      <div className="px-3 py-2 border-b border-slate-900 bg-slate-950/60 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 min-w-max">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                haptic.selection();
                setSelectedCat(c.id);
              }}
              className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold transition-all ${
                selectedCat === c.id
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800/80'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Search Results Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4">
        {/* Loading State */}
        {isSearching && (
          <div className="flex items-center justify-center py-12 gap-2 text-slate-400 text-xs">
            <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span>Searching authorized catalog...</span>
          </div>
        )}

        {/* Empty State / Prompt */}
        {!query.trim() && (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500 px-6">
            <Search className="w-10 h-10 text-slate-700 mb-3" />
            <p className="text-sm font-semibold text-slate-300">Discover Authorized Titles</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Search by title, alternative Japanese names, genres (Action, Sci-Fi, Fantasy), or tags.
            </p>
          </div>
        )}

        {/* No Results */}
        {!isSearching && query.trim() && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
            <p className="text-sm font-semibold text-slate-200">No matching titles found</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Try searching with another keyword or checking our category filters.
            </p>
          </div>
        )}

        {/* Primary Exact / High-Rank Match Section */}
        {exactMatches.length > 0 && (
          <div className="mb-5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 block mb-2">
              Top Result
            </span>
            {exactMatches.slice(0, 1).map((match) => (
              <div
                key={match.id}
                onClick={() => onSelectContent(match)}
                className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-900 border border-cyan-500/30 cursor-pointer group active:scale-[0.99] transition-all"
              >
                <div className="w-16 aspect-[3/4] rounded-lg overflow-hidden shrink-0 bg-slate-800">
                  <img
                    src={match.poster_url}
                    alt={match.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 text-amber-400 text-xs font-bold mb-0.5">
                    <Star className="w-3 h-3 fill-amber-400" />
                    <span>{match.rating.toFixed(1)}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-400 font-normal">{match.release_year}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                    {match.title}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">
                    {match.description}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-cyan-400/80 group-hover:translate-x-0.5 transition-transform" />
              </div>
            ))}
          </div>
        )}

        {/* All Matches in 3-Column Mobile Grid */}
        {results.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300">
                All Matches ({results.length})
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {results.map((item) => (
                <div key={item.id} className="w-full">
                  <ContentCard
                    item={item}
                    isSaved={savedItemIds.has(item.id)}
                    onSelect={onSelectContent}
                    onToggleSave={onToggleSave}
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
