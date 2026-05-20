import { ImageResponse } from 'next/og';

export const runtime = 'edge';

const SITE = 'https://loopdeloop.xyz';

const MIDNIGHT = '#0F1729';
const MIDNIGHT_LINE = '#1F2E48';
const CORAL = '#FF6B4A';
const AMBER = '#FFB84D';
const CREAM = '#F5F1E8';
const CREAM_MUTED = '#A8B0C0';
const SLATE = '#6B7B95';

const TOKEN_SRC: Record<'USDC' | 'PYUSD' | 'PRIME', string> = {
  USDC: `${SITE}/logos/usdc.png`,
  PYUSD: `${SITE}/logos/pyusd.png`,
  PRIME: `${SITE}/logos/prime.svg`,
};

type Sym = keyof typeof TOKEN_SRC;

function Token({
  x,
  y,
  symbol,
  size,
}: {
  x: number;
  y: number;
  symbol: Sym;
  size: number;
}) {
  const border = Math.max(2, Math.round(size / 28));
  const inner = size - border * 2 - 2;
  return (
    <div
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: size / 2,
        border: `${border}px solid ${CORAL}`,
        background: MIDNIGHT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={TOKEN_SRC[symbol]}
        width={inner}
        height={inner}
        alt={symbol}
        style={{ borderRadius: inner / 2 }}
      />
    </div>
  );
}

function StraightArrow({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <svg
      width={w + 12}
      height={16}
      viewBox={`0 0 ${w + 12} 16`}
      style={{ position: 'absolute', left: x, top: y - 8 }}
    >
      <line x1={0} y1={8} x2={w} y2={8} stroke={CORAL} strokeWidth={2} strokeLinecap="round" />
      <polygon points={`${w + 8},8 ${w - 2},3 ${w - 2},13`} fill={AMBER} />
    </svg>
  );
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lev = searchParams.get('lev');
  const apy = searchParams.get('apy');

  const levStr = lev ? Number(lev).toFixed(2) : '';
  const apyStr = apy ? `${(Number(apy) * 100).toFixed(2)}%` : '';

  const Y = 320;
  const nodes: { x: number; size: number; sym: Sym }[] = [
    { x: 540, size: 44, sym: 'USDC' },
    { x: 640, size: 52, sym: 'PYUSD' },
    { x: 760, size: 72, sym: 'PRIME' },
    { x: 900, size: 110, sym: 'PRIME' },
    { x: 1080, size: 170, sym: 'PRIME' },
  ];
  const finalNode = nodes[nodes.length - 1];
  const finalLeftEdge = finalNode.x - finalNode.size / 2;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: MIDNIGHT,
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* LEFT COLUMN */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '64px 0 64px 80px',
            width: 480,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <svg width="44" height="44" viewBox="0 0 64 64">
              <line x1="6" y1="44" x2="58" y2="44" stroke={CORAL} strokeWidth="4" strokeLinecap="round" />
              <circle cx="28" cy="28" r="14" fill="none" stroke={CORAL} strokeWidth="4" />
              <path d="M58 44 L52 41 L54.5 44 L52 47 Z" fill={AMBER} />
            </svg>
            <div style={{ display: 'flex', fontSize: 38, fontWeight: 600, letterSpacing: '-0.04em', color: CREAM, lineHeight: 1 }}>
              loopdeloop
            </div>
          </div>

          <div style={{ display: 'flex', marginTop: 60, fontSize: 16, fontWeight: 500, letterSpacing: '0.22em', textTransform: 'uppercase', color: CORAL }}>
            Position opened
          </div>

          <div style={{ display: 'flex', marginTop: 16, fontSize: 30, fontWeight: 600, color: CREAM, letterSpacing: '-0.01em' }}>
            PRIME / PYUSD loop
          </div>

          {apyStr ? (
            <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 28, lineHeight: 1 }}>
              <div style={{ display: 'flex', fontSize: 84, fontWeight: 600, color: AMBER, letterSpacing: '-0.03em' }}>{apyStr}</div>
            </div>
          ) : null}
          {apyStr ? (
            <div style={{ display: 'flex', marginTop: 6, fontSize: 18, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: CREAM_MUTED }}>
              Net APY
            </div>
          ) : null}

          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 40, fontSize: 18, color: CREAM_MUTED, lineHeight: 1.4 }}>
            <div style={{ display: 'flex' }}>Single transaction.</div>
            <div style={{ display: 'flex' }}>Non-custodial.</div>
            <div style={{ display: 'flex' }}>Built on Morpho Bundler3.</div>
          </div>

          <div style={{ display: 'flex', marginTop: 'auto', color: SLATE, fontSize: 22, letterSpacing: '0.04em' }}>
            loopdeloop.xyz
          </div>
        </div>

        {/* RIGHT COLUMN: linear escalation */}
        <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
          {nodes.slice(0, -1).map((n, i) => {
            const next = nodes[i + 1];
            const startX = n.x + n.size / 2 + 8 - 480;
            const endXAbs = next.x - next.size / 2 - 14;
            const w = endXAbs - 480 - startX;
            return <StraightArrow key={i} x={startX} y={Y} w={Math.max(8, w)} />;
          })}
          {nodes.map((n, i) => (
            <Token key={i} x={n.x - 480} y={Y} symbol={n.sym} size={n.size} />
          ))}
          {levStr ? (
            <div
              style={{
                position: 'absolute',
                left: finalLeftEdge - 480,
                top: Y + 100,
                display: 'flex',
                alignItems: 'baseline',
                color: AMBER,
                lineHeight: 1,
              }}
            >
              <div style={{ display: 'flex', fontSize: 68, fontWeight: 600, letterSpacing: '-0.03em' }}>{levStr}</div>
              <div style={{ display: 'flex', fontSize: 42, fontWeight: 600, marginLeft: 4 }}>×</div>
            </div>
          ) : null}
        </div>

        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 90, height: 1, background: MIDNIGHT_LINE }} />
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
