import { colors } from '@/lib/theme/tokens';

export function HorizonLine() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <hr
        style={{
          position: 'absolute',
          top: '70vh',
          left: 0,
          right: 0,
          height: 0,
          margin: 0,
          border: 0,
          borderTop: `0.5px solid ${colors.midnightLine}`,
        }}
      />
    </div>
  );
}
