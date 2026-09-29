import React from 'react';

// Exact generated high-fidelity asset matching user's reference image
export const STARK_ANIME_LOGO_URL = '/src/assets/images/stark_anime_logo_1790699252710.jpg';

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

  return (
    <div
      style={{ width: pixelSize, height: pixelSize }}
      className={`relative overflow-hidden shrink-0 border border-slate-700/80 shadow-lg shadow-black/60 bg-black ${roundClass} ${className}`}
    >
      <img
        src={STARK_ANIME_LOGO_URL}
        alt="Stark Anime"
        className="w-full h-full object-cover object-center select-none pointer-events-none"
      />
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
  const subSize = size === 'sm' ? 'text-[10px]' : size === 'md' ? 'text-xs' : 'text-sm';

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {showBadge && <StarkLogoBadge size={badgeSize} rounded="xl" />}
      <div className="flex flex-col leading-none">
        <span className={`font-['Syne'] font-black tracking-wider text-white ${titleSize}`}>
          STARK
        </span>
        <span className={`font-sans font-extrabold italic tracking-widest text-slate-300 ${subSize}`}>
          ANIME
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
