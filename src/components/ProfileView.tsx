import React, { useState } from 'react';
import { TelegramUser, WatchProgress } from '../types';
import {
  User,
  Shield,
  Clock,
  Bookmark,
  Play,
  Trash2,
  ExternalLink,
  FileText,
  AlertTriangle,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';
import { haptic } from '../lib/telegram';
import { StarkLogoBadge } from './StarkLogo';

interface ProfileViewProps {
  user: TelegramUser;
  savedCount: number;
  historyCount: number;
  totalWatchSeconds: number;
  continueWatching: WatchProgress[];
  onResumeProgress: (progress: WatchProgress) => void;
  onClearHistory: () => void;
  onOpenPrivacyPolicy: () => void;
  onOpenTerms: () => void;
  onOpenContentPolicy: () => void;
  onDeleteMyData: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  savedCount,
  historyCount,
  totalWatchSeconds,
  continueWatching,
  onResumeProgress,
  onClearHistory,
  onOpenPrivacyPolicy,
  onOpenTerms,
  onOpenContentPolicy,
  onDeleteMyData
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const totalHours = (totalWatchSeconds / 3600).toFixed(1);

  return (
    <div className="w-full min-h-screen px-4 py-4 pb-28 select-none">
      {/* Header */}
      <h1 className="font-['Syne'] font-extrabold text-xl text-white tracking-tight mb-4">
        Telegram Profile
      </h1>

      {/* User Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl mb-5">
        <div className="flex items-center gap-3.5">
          {/* Avatar */}
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-cyan-500/25 shrink-0 overflow-hidden">
            {user.photo_url ? (
              <img src={user.photo_url} alt={user.first_name} className="w-full h-full object-cover" />
            ) : (
              <span>{user.first_name.charAt(0)}</span>
            )}
            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
          </div>

          {/* Details */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base text-white tracking-tight truncate">
                {user.first_name} {user.last_name || ''}
              </span>
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            </div>
            {user.username && (
              <span className="text-xs text-cyan-400 font-mono">@{user.username}</span>
            )}
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
              <span>ID: {user.id}</span>
              <span>·</span>
              <span>Joined 2026</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/80">
          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <span className="text-base font-extrabold text-cyan-400 font-mono tabular-nums">{savedCount}</span>
            <span className="text-[10px] text-slate-400 font-medium">Saved</span>
          </div>

          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <span className="text-base font-extrabold text-white font-mono tabular-nums">{historyCount}</span>
            <span className="text-[10px] text-slate-400 font-medium">Watched</span>
          </div>

          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <span className="text-base font-extrabold text-amber-400 font-mono tabular-nums">{totalHours}h</span>
            <span className="text-[10px] text-slate-400 font-medium">Stream Time</span>
          </div>
        </div>
      </div>

      {/* Continue Watching Section */}
      {continueWatching.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h2 className="font-['Syne'] font-bold text-sm text-white">Continue Watching</h2>
            </div>
            <button
              onClick={() => {
                haptic.impact('light');
                onClearHistory();
              }}
              className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Clear History
            </button>
          </div>

          <div className="flex flex-col gap-2.5">
            {continueWatching.map((item) => (
              <div
                key={item.id}
                onClick={() => onResumeProgress(item)}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/30 transition-all cursor-pointer group active:scale-[0.99]"
              >
                {/* Poster */}
                <div className="relative w-16 aspect-[3/4] rounded-lg overflow-hidden shrink-0 bg-slate-800">
                  <img
                    src={item.content_poster}
                    alt={item.content_title || 'Content'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-80 group-hover:opacity-100">
                    <Play className="w-4 h-4 fill-white text-white" />
                  </div>
                </div>

                {/* Details & Scrubber */}
                <div className="flex flex-col justify-center flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-white truncate group-hover:text-cyan-400 transition-colors">
                    {item.content_title}
                  </h4>
                  {item.episode_title && (
                    <span className="text-[11px] text-slate-400 truncate mt-0.5">
                      S{item.season_number || 1} E{item.episode_number || 1}: {item.episode_title}
                    </span>
                  )}

                  {/* Progress bar */}
                  <div className="w-full h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 rounded-full"
                      style={{ width: `${item.completion_percentage}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1">
                    <span>{Math.round(item.position_seconds / 60)}m watched</span>
                    <span>{Math.round(item.completion_percentage)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compliance, Privacy & Policies */}
      <div className="mb-6">
        {/* Brand Card with Logo */}
        <div className="p-3.5 mb-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 flex items-center gap-3">
          <StarkLogoBadge size={46} rounded="xl" />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-['Syne'] font-extrabold text-sm text-white tracking-wide">STARK</span>
              <span className="font-sans font-black text-xs text-cyan-400 italic tracking-wider">ANIME</span>
              <span className="text-[9px] bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 font-mono px-1.5 py-0.2 rounded ml-1">v2.4</span>
            </div>
            <span className="text-[11px] text-slate-400">Official Telegram Streaming Gateway</span>
          </div>
        </div>

        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
          Legal & Compliance
        </h3>

        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => {
              haptic.selection();
              onOpenContentPolicy();
            }}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-200 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>Authorized Content Policy</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </button>

          <button
            onClick={() => {
              haptic.selection();
              onOpenPrivacyPolicy();
            }}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-200 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-slate-400" />
              <span>Privacy Policy</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </button>

          <button
            onClick={() => {
              haptic.selection();
              onOpenTerms();
            }}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-200 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-slate-400" />
              <span>Terms of Service</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Account Data Deletion (GDPR / Telegram Compliance) */}
      <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/40">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-bold text-rose-300">Data Erasure Right</h4>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              Permanently wipe your watch history, saved library, and active session tokens from our servers.
            </p>

            {showDeleteConfirm ? (
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => {
                    haptic.impact('heavy');
                    onDeleteMyData();
                    setShowDeleteConfirm(false);
                  }}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold"
                >
                  Yes, Delete My Data
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="mt-2.5 px-3 py-1.5 bg-rose-900/50 hover:bg-rose-900/80 border border-rose-700/50 text-rose-200 text-xs font-semibold rounded-lg transition-colors"
              >
                Delete My Data
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
