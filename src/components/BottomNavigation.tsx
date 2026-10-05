import React from 'react';
import { Home, Bookmark, User } from 'lucide-react';
import { haptic } from '../lib/telegram';

export type NavTab = 'home' | 'saved' | 'profile';

interface BottomNavigationProps {
  currentTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
  savedBadgeCount?: number;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentTab,
  onChangeTab,
  savedBadgeCount = 0
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-3 pb-[max(env(safe-area-inset-bottom),8px)] pt-1.5 shadow-2xl">
      <div className="max-w-md mx-auto grid grid-cols-3 items-center gap-1">
        {/* Tab 1: Home */}
        <button
          onClick={() => {
            haptic.selection();
            onChangeTab('home');
          }}
          className={`flex flex-col items-center justify-center min-h-[48px] py-1.5 rounded-2xl transition-all duration-200 active:scale-95 group ${
            currentTab === 'home'
              ? 'text-cyan-400 bg-cyan-950/50 border border-cyan-500/30 shadow-lg shadow-cyan-950/50'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60'
          }`}
          aria-label="Home"
        >
          <div className="relative">
            <Home className={`w-5 h-5 transition-transform group-hover:scale-110 ${currentTab === 'home' ? 'stroke-[2.5px]' : 'stroke-2'}`} />

          </div>
          <span className="text-[10px] font-bold tracking-tight mt-1">Home</span>
        </button>

        {/* Tab 2: Saved */}
        <button
          onClick={() => {
            haptic.selection();
            onChangeTab('saved');
          }}
          className={`flex flex-col items-center justify-center min-h-[48px] py-1.5 rounded-2xl transition-all duration-200 active:scale-95 group ${
            currentTab === 'saved'
              ? 'text-cyan-400 bg-cyan-950/50 border border-cyan-500/30 shadow-lg shadow-cyan-950/50'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60'
          }`}
          aria-label="Saved"
        >
          <div className="relative">
            <Bookmark
              className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                currentTab === 'saved' ? 'stroke-[2.5px] fill-cyan-400/20' : 'stroke-2'
              }`}
            />
            {savedBadgeCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-cyan-500 text-slate-950 font-mono text-[9px] font-black px-1.5 rounded-full min-w-[15px] text-center shadow-md shadow-cyan-500/30">
                {savedBadgeCount}
              </span>
            )}

          </div>
          <span className="text-[10px] font-bold tracking-tight mt-1">Saved</span>
        </button>

        {/* Tab 3: Profile */}
        <button
          onClick={() => {
            haptic.selection();
            onChangeTab('profile');
          }}
          className={`flex flex-col items-center justify-center min-h-[48px] py-1.5 rounded-2xl transition-all duration-200 active:scale-95 group ${
            currentTab === 'profile'
              ? 'text-cyan-400 bg-cyan-950/50 border border-cyan-500/30 shadow-lg shadow-cyan-950/50'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60'
          }`}
          aria-label="Profile"
        >
          <div className="relative">
            <User className={`w-5 h-5 transition-transform group-hover:scale-110 ${currentTab === 'profile' ? 'stroke-[2.5px]' : 'stroke-2'}`} />

          </div>
          <span className="text-[10px] font-bold tracking-tight mt-1">Profile</span>
        </button>
      </div>
    </div>
  );
};
