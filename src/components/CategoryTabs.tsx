import React from 'react';
import { Category } from '../types';
import { haptic } from '../lib/telegram';
import { Sparkles, Tv, Film, Flame, Wand2, Cpu, Grid } from 'lucide-react';

interface CategoryTabsProps {
  categories: Category[];
  activeCategoryId: string;
  onSelectCategory: (id: string) => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Sparkles: <Sparkles className="w-3.5 h-3.5" />,
  Tv: <Tv className="w-3.5 h-3.5" />,
  Film: <Film className="w-3.5 h-3.5" />,
  Flame: <Flame className="w-3.5 h-3.5" />,
  Wand2: <Wand2 className="w-3.5 h-3.5" />,
  Cpu: <Cpu className="w-3.5 h-3.5" />
};

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categories,
  activeCategoryId,
  onSelectCategory
}) => {
  return (
    <nav className="w-full bg-slate-950/70 border-b border-slate-900/80 px-3 py-2 overflow-x-auto no-scrollbar" aria-label="Category Filter">
      <div className="flex items-center gap-1.5 min-w-max">
        {categories.map((cat) => {
          const isActive = activeCategoryId === cat.id;
          const icon = cat.icon ? ICON_MAP[cat.icon] || <Grid className="w-3.5 h-3.5" /> : null;

          return (
            <button
              key={cat.id}
              onClick={() => {
                haptic.selection();
                onSelectCategory(cat.id);
              }}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-tight flex items-center gap-1.5 transition-all whitespace-nowrap active:scale-95 ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                  : 'bg-slate-900/60 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-800/60'
              }`}
            >
              {icon}
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
