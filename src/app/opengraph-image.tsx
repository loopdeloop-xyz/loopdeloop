import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const MIDNIGHT = '#0F1729';
const MIDNIGHT_LINE = '#1F2E48';
const CORAL = '#FF6B4A';
const AMBER = '#FFB84D';
const CREAM = '#F5F1E8';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: MIDNIGHT,
          padding: 80,
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <svg width="120" height="120" viewBox="0 0 64 64">
            <line x1="6" y1="44" x2="58" y2="44" stroke={CORAL} strokeWidth="4" strokeLinecap="round" />
            <circle cx="28" cy="28" r="14" fill="none" stroke={CORAL} strokeWidth="4" />
            <path d="M58 44 L52 41 L54.5 44 L52 47 Z" fill={AMBER} />
          </svg>
          <div
            style={{
              fontSize: 96,
              fontWeight: 600,
              letterSpacing: '-0.04em',
              color: CREAM,
              lineHeight: 1,
            }}
          >
            loopdeloop
          </div>
        </div>
        <div
          style={{
            marginTop: 40,
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: CORAL,
          }}
        >
          Leverage, executed cleanly
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 26,
            fontWeight: 400,
            color: '#A8B0C0',
            maxWidth: 880,
            lineHeight: 1.4,
          }}
        >
          Non-custodial leveraged PRIME loops on Morpho Blue. One transaction.
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 440,
            height: 1,
            background: MIDNIGHT_LINE,
          }}
        />
      </div>
    ),
    size,
  );
}
