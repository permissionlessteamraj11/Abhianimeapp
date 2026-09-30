import React from 'react';
import { Search, ShieldCheck, ShieldAlert } from 'lucide-react';
import { haptic } from '../lib/telegram';
import { StarkIcon } from './StarkLogo';

interface HeaderProps {
  onOpenSearch: () => void;
  maintenanceMode?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  maintenanceMode
}) => {
  return (
    <header className="sticky top-0 z-30 h-14 w-full bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80 px-4 flex items-center justify-between">
      {/* Brand Zone: Stark Anime Wordmark & Insignia */}
      <div className="flex items-center gap-2.5 select-none">
        <StarkIcon size={34} />
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <div className="flex flex-col leading-none">
              <span className="font-['Syne'] font-black text-sm tracking-wider text-white">
                STARK
              </span>
              <span className="font-sans font-extrabold italic text-xs tracking-widest text-slate-300">
                ANIME
              </span>
            </div>
            <span className="inline-flex items-center gap-0.5 text-[9px] uppercase tracking-wider font-semibold text-cyan-400 bg-cyan-950/80 border border-cyan-500/40 px-1.5 py-0.5 rounded ml-1">
              <ShieldCheck className="w-2.5 h-2.5" />
              Official
            </span>
          </div>
        </div>
      </div>

      {/* Action Zone */}
      <div className="flex items-center gap-2">
        {maintenanceMode && (
          <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-950/70 border border-amber-500/30 px-2 py-1 rounded-md">
            <ShieldAlert className="w-3 h-3" />
            Maintenance
          </span>
        )}

        <button
          onClick={() => {
            haptic.selection();
            onOpenSearch();
          }}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800/90 active:scale-95 border border-slate-800 rounded-xl transition-all"
          aria-label="Search Catalog"
        >
          <Search className="w-4 h-4 text-cyan-400" />
        </button>
      </div>
    </header>
  );
};
