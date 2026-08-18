import * as React from 'react';
import { cn } from '@/lib/utils';

interface RigorMarkProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
  theme?: 'dark' | 'light' | 'auto';
  showCrosshairs?: boolean;
}

/**
 * Monograma oficial RIGOR
 * Monograma arquitetônico com mira técnica (crosshairs) em Signal Blue (#1687FF)
 * e estrutura em Blueprint Navy (#0B1F33) / Chalk White (#F5F7F6)
 */
export function RigorMark({
  className,
  size = 40,
  theme = 'auto',
  showCrosshairs = true,
  ...props
}: RigorMarkProps) {
  const mainColor =
    theme === 'dark'
      ? '#F5F7F6'
      : theme === 'light'
      ? '#0B1F33'
      : 'currentColor';

  const accentColor = '#1687FF';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0 select-none overflow-visible', className)}
      aria-label="RIGOR Monogram"
      {...props}
    >
      {/* Mira técnica de precisão (Crosshairs) */}
      {showCrosshairs && (
        <g className="rigor-crosshairs" stroke={accentColor} strokeWidth="2.5" strokeLinecap="round">
          {/* Linha vertical superior da mira */}
          <line x1="28" y1="6" x2="28" y2="40" opacity="0.95" />
          {/* Linha horizontal esquerda da mira */}
          <line x1="6" y1="44" x2="40" y2="44" opacity="0.95" />
        </g>
      )}

      {/* Monograma 'R' com proporções arquitetônicas */}
      <g className="rigor-glyph">
        {/* Haste Vertical Superior */}
        <rect x="21" y="20" width="14" height="15" fill={mainColor} rx="1" />

        {/* Haste Vertical Central - Destaque Ativo em Signal Blue */}
        <rect x="21" y="37" width="14" height="20" fill={accentColor} rx="1" />

        {/* Haste Vertical Inferior */}
        <rect x="21" y="59" width="14" height="27" fill={mainColor} rx="1" />

        {/* Barra Horizontal Superior */}
        <path
          d="M35 20H84C86.2091 20 88 21.7909 88 24V31C88 33.2091 86.2091 35 84 35H35V20Z"
          fill={mainColor}
        />

        {/* Perna Diagonal com corte a 45º e precisão geométrica */}
        <path
          d="M36 46H52L79 79.5C82.5 83.5 86 86 90 86H70L46 56.5L36 56.5V46Z"
          fill={mainColor}
        />
        {/* Chanfro da perna diagonal */}
        <path
          d="M48 46H86C88.5 46 90 48 90 50.5C90 53 88.5 55 86 55H56L48 46Z"
          fill={mainColor}
          opacity="0.12"
        />
      </g>
    </svg>
  );
}

interface RigorLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  markSize?: number;
  showTagline?: boolean;
  taglineText?: string;
  theme?: 'dark' | 'light' | 'auto';
  showCrosshairs?: boolean;
}

/**
 * Logotipo oficial completo RIGOR
 * Monograma vetorial + Wordmark tipográfico com chanfros técnicos e precisão
 */
export function RigorLogo({
  className,
  markSize = 36,
  showTagline = false,
  taglineText = 'BUILT ON PRECISION',
  theme = 'auto',
  showCrosshairs = true,
  ...props
}: RigorLogoProps) {
  const isDark = theme === 'dark';
  const textColor = isDark ? 'text-[#F5F7F6]' : theme === 'light' ? 'text-[#0B1F33]' : 'text-current';

  return (
    <div
      className={cn('inline-flex items-center gap-3 select-none group', className)}
      {...props}
    >
      <div className="relative flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
        <RigorMark size={markSize} theme={theme} showCrosshairs={showCrosshairs} />
      </div>

      <div className="flex flex-col justify-center">
        <div className="flex items-center tracking-[0.14em]">
          <span
            className={cn(
              'font-heading font-black leading-none text-2xl tracking-[0.14em] uppercase',
              textColor
            )}
            style={{ fontFamily: 'var(--font-heading), "Barlow Condensed", sans-serif' }}
          >
            RIGOR
          </span>
          <span className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-[#1687FF] opacity-90 shadow-[0_0_8px_#1687FF]" />
        </div>

        {showTagline && (
          <span className="mt-1 text-[8.5px] font-black tracking-[0.24em] text-[#354654] dark:text-[#AAB4BD] uppercase">
            {taglineText}
          </span>
        )}
      </div>
    </div>
  );
}
