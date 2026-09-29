import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HeroBanner } from '../types';
import { Play, Info, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { haptic } from '../lib/telegram';

interface HeroCarouselProps {
  banners: HeroBanner[];
  autoplay?: boolean;
  durationMs?: number;
  onWatch: (linkedType: 'anime' | 'movie' | 'category', linkedId: string) => void;
  onDetails: (linkedType: 'anime' | 'movie' | 'category', linkedId: string) => void;
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({
  banners,
  autoplay = true,
  durationMs = 5000,
  onWatch,
  onDetails
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const activeBanners = banners.filter((b) => b.is_enabled).slice(0, 5);
  const total = activeBanners.length;

  const nextBanner = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevBanner = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Autoplay management
  useEffect(() => {
    if (!autoplay || total <= 1) return;
    timerRef.current = setInterval(nextBanner, durationMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoplay, durationMs, nextBanner, total, currentIndex]);

  // Touch Swipe Handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      haptic.impact('light');
      nextBanner();
    } else if (distance < -minSwipeDistance) {
      haptic.impact('light');
      prevBanner();
    }
  };

  if (activeBanners.length === 0) return null;

  const current = activeBanners[currentIndex];

  return (
    <div
      className="relative w-full aspect-[16/10] sm:aspect-[16/9] overflow-hidden bg-slate-950 group select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Cinematic Image with Crossfade */}
      <div className="absolute inset-0">
        <img
          key={current.id}
          src={current.image_url}
          alt={current.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center animate-in fade-in zoom-in-105 duration-700"
        />
        {/* Anti-Slop Measured Scrim Overlay: ensuring 4.5:1 text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/40 to-transparent" />
      </div>

      {/* Manual Desktop / Tablet Chevrons */}
      {total > 1 && (
        <>
          <button
            onClick={() => {
              haptic.selection();
              prevBanner();
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] hidden sm:flex items-center justify-center rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md text-white/80 hover:text-white transition-all opacity-0 group-hover:opacity-100"
            aria-label="Previous Banner"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              haptic.selection();
              nextBanner();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] hidden sm:flex items-center justify-center rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md text-white/80 hover:text-white transition-all opacity-0 group-hover:opacity-100"
            aria-label="Next Banner"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Banner Content Container */}
      <div className="absolute bottom-4 left-0 right-0 px-4 flex flex-col justify-end">
        {/* Unboxed Metadata Line */}
        <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 mb-1.5">
          {current.rating && (
            <div className="flex items-center gap-1 text-amber-400">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span className="font-mono tabular-nums">{current.rating.toFixed(1)}</span>
            </div>
          )}
          {current.rating && <span aria-hidden="true" className="text-slate-600">·</span>}
          {current.year && <span>{current.year}</span>}
          {current.classification && (
            <>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-slate-300 font-mono text-[11px]">{current.classification}</span>
            </>
          )}
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="capitalize text-slate-300">{current.linked_type}</span>
        </div>

        {/* Title */}
        <h2 className="font-['Syne'] font-extrabold text-xl sm:text-2xl text-white tracking-tight leading-tight line-clamp-1 drop-shadow-md">
          {current.title}
        </h2>

        {/* Subtitle / Description */}
        <p className="text-xs text-slate-300/90 line-clamp-2 mt-1 max-w-lg drop-shadow-sm font-medium">
          {current.subtitle || current.description}
        </p>

        {/* Buttons: Watch Now & Details */}
        <div className="flex items-center gap-2.5 mt-3">
          <button
            onClick={() => {
              haptic.impact('medium');
              onWatch(current.linked_type, current.linked_id);
            }}
            className="min-h-[44px] px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 active:scale-95 transition-all whitespace-nowrap"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{current.button_text || 'Watch Now'}</span>
          </button>

          <button
            onClick={() => {
              haptic.impact('light');
              onDetails(current.linked_type, current.linked_id);
            }}
            className="min-h-[44px] px-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 font-semibold text-xs flex items-center justify-center gap-1.5 backdrop-blur-md active:scale-95 transition-all whitespace-nowrap"
          >
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>Details</span>
          </button>
        </div>

        {/* Progress Bar / Indicator Dots */}
        {total > 1 && (
          <div className="flex items-center gap-1.5 mt-3.5">
            {activeBanners.map((b, idx) => (
              <button
                key={b.id}
                onClick={() => {
                  haptic.selection();
                  setCurrentIndex(idx);
                }}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentIndex
                    ? 'w-6 bg-cyan-400 shadow-sm shadow-cyan-400/50'
                    : 'w-1.5 bg-slate-700/80 hover:bg-slate-600'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
