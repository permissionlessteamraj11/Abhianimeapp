import React, { useState } from 'react';
import starkAnimeLogoImg from '../assets/images/stark_anime_logo_1790699252710.jpg';

export const STARK_ANIME_LOGO_URL = starkAnimeLogoImg;
export const STARK_ANIME_PUBLIC_LOGO = '/stark-logo.jpg';

interface StarkLogoBadgeProps {
  size?: number | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  rounded?: 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

export const StarkLogoBadge: React.FC<StarkLogoBadgeProps> = ({
  size = 'md',
  className = '',
  rounded = 'xl'
}) => {
  const pixelSize = typeof size === 'number'
    ? size
    : { sm: 32, md: 40, lg: 54, xl: 80 }[size];

  const roundClass = {
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full'
  }[rounded];

  const [hasError, setHasError] = useState(false);
  const [triedFallback, setTriedFallback] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>(starkAnimeLogoImg);

  const handleError = () => {
    if (!triedFallback) {
      setTriedFallback(true);
      setCurrentSrc(STARK_ANIME_PUBLIC_LOGO);
    } else {
      setHasError(true);
    }
  };

  return (
    <div
      style={{ width: pixelSize, height: pixelSize }}
      className={`relative overflow-hidden shrink-0 border border-slate-700/80 shadow-lg shadow-black/60 bg-black flex items-center justify-center ${roundClass} ${className}`}
    >
      {!hasError ? (
        <img
          src={currentSrc}
          alt="STARK"
          onError={handleError}
          className="w-full h-full object-cover object-center select-none pointer-events-none"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-950 flex flex-col items-center justify-center p-1 relative">
          <div className="absolute inset-0 bg-cyan-600/10 backdrop-blur-[1px]" />
          <svg viewBox="0 0 40 40" className="w-3/4 h-3/4 text-cyan-400 fill-current drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">
            <path d="M20 4L34 14V26L20 36L6 26V14L20 4Z" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <path d="M12 18L20 12L28 18L24 23L20 20L16 23L12 18Z" fill="#06b6d4" />
            <path d="M15 26L20 32L25 26L20 28L15 26Z" fill="#3b82f6" />
          </svg>
        </div>
      )}
    </div>
  );
};

export const StarkLogo: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showBadge?: boolean;
}> = ({
  size = 'md',
  className = '',
  showBadge = true
}) => {
  const badgeSize = size === 'sm' ? 32 : size === 'md' ? 40 : 52;
  const titleSize = size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-xl';

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {showBadge && <StarkLogoBadge size={badgeSize} rounded="xl" />}
      <div className="flex flex-col leading-none">
        <span className={`font-['Syne'] font-black tracking-wider text-white ${titleSize}`}>
          STARK
        </span>
      </div>
    </div>
  );
};

export const StarkIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 36,
  className = ''
}) => {
  return <StarkLogoBadge size={size} className={className} rounded="xl" />;
};
