import { Box } from '@mui/material';
import { colors } from '@/lib/theme/tokens';

type Token = 'USDC' | 'PYUSD' | 'PRIME';

const SRC: Partial<Record<Token, string>> = {
  USDC: '/logos/usdc.png',
  PYUSD: '/logos/pyusd.png',
  PRIME: '/logos/prime.svg',
};

export function TokenIcon({ symbol, size = 16 }: { symbol: Token; size?: number }) {
  const src = SRC[symbol];
  if (!src) {
    // Placeholder for tokens we don't have a logo for yet (e.g. PRIME).
    return (
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: '50%',
          border: `1.5px solid ${colors.coral}`,
          backgroundColor: colors.midnight,
          color: colors.amber,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.55,
          fontWeight: 600,
          fontFamily: "'Geist','Inter',sans-serif",
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        {symbol[0]}
      </Box>
    );
  }
  return (
    <Box
      component="img"
      src={src}
      alt={symbol}
      width={size}
      height={size}
      sx={{ borderRadius: '50%', flexShrink: 0, display: 'inline-block' }}
    />
  );
}

type Protocol = 'Hastra' | 'Morpho' | 'Curve';

const PROTO_SRC: Partial<Record<Protocol, string>> = {
  Hastra: '/logos/hastra.webp',
  Morpho: '/logos/morpho.webp',
};

export function ProtocolIcon({ name, size = 14 }: { name: Protocol; size?: number }) {
  const src = PROTO_SRC[name];
  if (!src) {
    return (
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: 4,
          border: `1px solid ${colors.midnightLine}`,
          color: colors.creamMuted,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.6,
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {name[0]}
      </Box>
    );
  }
  return (
    <Box
      component="img"
      src={src}
      alt={name}
      width={size}
      height={size}
      sx={{ borderRadius: 4, flexShrink: 0, display: 'inline-block' }}
    />
  );
}
