import { colors } from '@/lib/theme/tokens';

export function LoopSpinner({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-label="loading">
      <circle
        cx="32"
        cy="32"
        r="18"
        fill="none"
        stroke={colors.coral}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray="113"
        strokeDashoffset="113"
        style={{ animation: 'lpw-spinner-draw 1.5s ease-in-out infinite' }}
      />
    </svg>
  );
}
