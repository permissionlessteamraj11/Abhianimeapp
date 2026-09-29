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
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/80 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-1.5">
      <div className="max-w-md mx-auto grid grid-cols-3 items-center">
        {/* Tab 1: Home */}
        <button
          onClick={() => {
            haptic.selection();
            onChangeTab('home');
          }}
          className={`flex flex-col items-center justify-center min-h-[48px] py-1 transition-all active:scale-95 ${
            currentTab === 'home' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-label="Home"
        >
          <div className="relative">
            <Home className={`w-5 h-5 ${currentTab === 'home' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            {currentTab === 'home' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/80" />
            )}
          </div>
          <span className="text-[10px] font-semibold tracking-tight mt-1">Home</span>
        </button>

        {/* Tab 2: Saved */}
        <button
          onClick={() => {
            haptic.selection();
            onChangeTab('saved');
          }}
          className={`flex flex-col items-center justify-center min-h-[48px] py-1 transition-all active:scale-95 ${
            currentTab === 'saved' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-label="Saved"
        >
          <div className="relative">
            <Bookmark
              className={`w-5 h-5 ${
                currentTab === 'saved' ? 'stroke-[2.5px] fill-cyan-400/20' : 'stroke-2'
              }`}
            />
            {savedBadgeCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-mono text-[9px] font-bold px-1 rounded-full min-w-[14px] text-center">
                {savedBadgeCount}
              </span>
            )}
            {currentTab === 'saved' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/80" />
            )}
          </div>
          <span className="text-[10px] font-semibold tracking-tight mt-1">Saved</span>
        </button>

        {/* Tab 3: Profile */}
        <button
          onClick={() => {
            haptic.selection();
            onChangeTab('profile');
          }}
          className={`flex flex-col items-center justify-center min-h-[48px] py-1 transition-all active:scale-95 ${
            currentTab === 'profile' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-label="Profile"
        >
          <div className="relative">
            <User className={`w-5 h-5 ${currentTab === 'profile' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            {currentTab === 'profile' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/80" />
            )}
          </div>
          <span className="text-[10px] font-semibold tracking-tight mt-1">Profile</span>
        </button>
      </div>
    </div>
  );
};
