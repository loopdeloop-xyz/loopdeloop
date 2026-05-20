import { colors } from '@/lib/theme/tokens';

export function LogoMark({ size = 32, animateOnce = false }: { size?: number; animateOnce?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-label="loopdeloop">
      <line
        x1="6"
        y1="44"
        x2="58"
        y2="44"
        stroke={colors.coral}
        strokeWidth={4}
        strokeLinecap="round"
        className={animateOnce ? 'lpw-trail' : undefined}
      />
      <circle
        cx="28"
        cy="28"
        r="14"
        fill="none"
        stroke={colors.coral}
        strokeWidth={4}
        className={animateOnce ? 'lpw-loop' : undefined}
      />
      <path
        d="M58 44 L52 41 L54.5 44 L52 47 Z"
        fill={colors.amber}
        className={animateOnce ? 'lpw-plane' : undefined}
      />
    </svg>
  );
}

export function LogoMarkCompact({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="14" cy="16" r="10" fill="none" stroke={colors.coral} strokeWidth={3} />
      <circle cx="27" cy="16" r="3" fill={colors.amber} />
    </svg>
  );
}

export function Logotype({ height = 28, animateOnce = false }: { height?: number; animateOnce?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
      <LogoMark size={height} animateOnce={animateOnce} />
      <span
        style={{
          fontFamily: "'Geist', 'Inter', sans-serif",
          fontSize: height * 0.78,
          fontWeight: 600,
          letterSpacing: '-0.04em',
          color: colors.cream,
          lineHeight: 1,
        }}
      >
        loopdeloop
      </span>
    </span>
  );
}
