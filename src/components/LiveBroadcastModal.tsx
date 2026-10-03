import React, { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { X, Radio, Eye, Send, Smile, ThumbsUp, Sparkles, MessageSquare, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-react';
import { haptic, getTelegramUser } from '../lib/telegram';

interface LiveBroadcastModalProps {
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  username: string;
  text: string;
  time: string;
  badge?: string;
  color?: string;
}

const SEED_CHAT_MESSAGES: ChatMessage[] = [
  { id: '1', username: 'Aarav_Anime', text: 'Live show starting! 🔥', time: '12:00', badge: 'VIP', color: 'text-amber-400' },
  { id: '2', username: 'Priya_K', text: 'Subbed & Official audio quality is insane! 😍', time: '12:01', color: 'text-cyan-400' },
  { id: '3', username: 'Rohan_Otaku', text: 'STARK live broadcast op 🎉', time: '12:01', color: 'text-emerald-400' }
];

export const LiveBroadcastModal: React.FC<LiveBroadcastModalProps> = ({ onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const tgUser = getTelegramUser();

  const [viewerCount, setViewerCount] = useState<number>(1420);
  const [likeCount, setLikeCount] = useState<number>(3890);
  const [hasLiked, setHasLiked] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(SEED_CHAT_MESSAGES);
  const [inputMsg, setInputMsg] = useState<string>('');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Live stream source (Fallback HLS live sample)
  const LIVE_STREAM_URL = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4';

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.src = LIVE_STREAM_URL;
    videoRef.current.play().catch(() => {});

    // Simulate dynamic viewer counter fluctuations
    const timer = setInterval(() => {
      setViewerCount((prev) => prev + Math.floor(Math.random() * 7) - 3);
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  const handleSendMsg = () => {
    if (!inputMsg.trim()) return;
    haptic.impact('light');

    const name = tgUser?.first_name ? `${tgUser.first_name}` : 'Viewer';
    const newMsg: ChatMessage = {
      id: `live-m-${Date.now()}`,
      username: name,
      text: inputMsg.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      color: 'text-cyan-400'
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setInputMsg('');
  };

  const handleLikeLive = () => {
    haptic.selection();
    if (!hasLiked) {
      setHasLiked(true);
      setLikeCount((prev) => prev + 1);
    } else {
      setHasLiked(false);
      setLikeCount((prev) => Math.max(0, prev - 1));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col select-none overflow-hidden animate-in fade-in">
      {/* Top Header Bar */}
      <div className="h-14 px-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="px-2.5 py-1 rounded-full bg-rose-600 text-white font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 animate-pulse shadow-md shadow-rose-600/30">
            <Radio className="w-3 h-3" />
            <span>LIVE SHOW</span>
          </span>
          <span className="font-['Syne'] font-bold text-sm text-white">STARK Live Stream</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 text-cyan-300 text-xs font-mono font-bold border border-slate-700">
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span>{viewerCount.toLocaleString()}</span>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Video Player + Live Chat */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Live Video Player Area */}
        <div className="w-full lg:w-2/3 aspect-video lg:aspect-auto bg-black relative flex items-center justify-center">
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            playsInline
            autoPlay
            loop
            muted={isMuted}
          />

          {/* Floating Controls Overlay */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/10"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-cyan-400" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              onClick={handleLikeLive}
              className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 backdrop-blur-md transition-all ${
                hasLiked
                  ? 'bg-rose-600 border-rose-500 text-white'
                  : 'bg-black/60 border-white/10 text-slate-200'
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>{likeCount}</span>
            </button>
          </div>
        </div>

        {/* Live Chat Panel */}
        <div className="w-full lg:w-1/3 flex-1 bg-slate-900/90 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col min-h-0">
          <div className="p-3 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-xs text-white uppercase tracking-wider">Live Chat</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Real-time</span>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs no-scrollbar">
            {chatMessages.map((msg) => (
              <div key={msg.id} className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col gap-0.5">
                <div className="flex items-center justify-between">
                  <span className={`font-bold ${msg.color || 'text-cyan-400'}`}>
                    {msg.username}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">{msg.time}</span>
                </div>
                <p className="text-slate-200 leading-relaxed">{msg.text}</p>
              </div>
            ))}
          </div>

          {/* Live Chat Input */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMsg();
              }}
              placeholder="Send live message..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={handleSendMsg}
              disabled={!inputMsg.trim()}
              className="p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
