'use client';

import { Paper, Stack, Typography, Box, Button, Divider, Link } from '@mui/material';
import { type Address } from 'viem';
import { usePosition } from '@/hooks/usePosition';
import { useMarketData } from '@/hooks/useMarketData';
import { fmtUnits } from '@/lib/format';
import { DEC, MARKET_ID } from '@/lib/addresses';
import { netApy } from '@/lib/loop';
import { colors } from '@/lib/theme/tokens';
import { LogoMark } from './brand/Logo';
import { TokenIcon, ProtocolIcon } from './brand/TokenIcon';

const MORPHO_MARKET_URL = `https://app.morpho.org/ethereum/market/${MARKET_ID}/prime-pyusd#yourPosition`;

function hfTone(hf: number) {
  if (hf >= 1.5) return colors.cream;
  if (hf >= 1.2) return colors.amber;
  return colors.danger;
}

export function PositionCard({ user }: { user: Address }) {
  const { data, error, isLoading } = usePosition(user);
  const { data: market } = useMarketData();

  if (isLoading) {
    return (
      <Paper elevation={0} sx={{ p: 4 }}>
        <Typography variant="body2" sx={{ color: colors.creamMuted }}>Loading position…</Typography>
      </Paper>
    );
  }
  if (error) {
    return (
      <Paper elevation={0} sx={{ p: 4 }}>
        <Typography color="error" variant="body2">{String(error)}</Typography>
      </Paper>
    );
  }
  if (!data) return null;
  if (!data.hasPosition) {
    return (
      <Paper elevation={0} sx={{ p: 6 }}>
        <Stack spacing={2} alignItems="center" sx={{ py: 2 }}>
          <Box sx={{ opacity: 0.3 }}>
            <LogoMark size={48} />
          </Box>
          <Typography variant="body2" sx={{ color: colors.creamMuted }}>
            No open loops yet.
          </Typography>
          <Typography
            component="a"
            href="/"
            sx={{
              color: colors.coral,
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            Open your first one →
          </Typography>
        </Stack>
      </Paper>
    );
  }

  const hfFloat = Number(data.hfWad) / 1e18;
  const ltvPct = (Number(data.ltvWad) / 1e18 * 100).toFixed(2);
  const currentNet = market ? netApy(market.primeApy, market.borrowApy, data.ltvWad) : 0;

  return (
    <Paper elevation={0} sx={{ p: 4 }}>
      <Stack spacing={3}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Stack direction="row" spacing={-0.75} sx={{ '& > *:nth-of-type(2)': { ml: '-6px' } }}>
              <TokenIcon symbol="PRIME" size={26} />
              <TokenIcon symbol="PYUSD" size={26} />
            </Stack>
            <Typography variant="h3">PRIME / PYUSD loop</Typography>
          </Stack>
          <Box sx={{
            border: `1px solid ${hfTone(hfFloat)}`,
            borderRadius: 999,
            px: 1.5,
            py: 0.5,
            color: hfTone(hfFloat),
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontFamily: 'var(--font-geist-sans)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            HF {hfFloat > 100 ? '∞' : hfFloat.toFixed(3)}
          </Box>
        </Stack>
        <Divider />
        <Box sx={{ '& > div + div': { borderTop: `1px solid ${colors.midnightLine}` } }}>
          <Stat label="Collateral" value={`${fmtUnits(data.collateralPrime, DEC.PRIME, 4)} PRIME`} icon={<TokenIcon symbol="PRIME" size={14} />} />
          <Stat label="Collateral value" value={`${fmtUnits(data.collateralValuePyusd, DEC.PYUSD, 2)} PYUSD`} />
          <Stat label="Debt" value={`${fmtUnits(data.borrowAssets, DEC.PYUSD, 2)} PYUSD`} icon={<TokenIcon symbol="PYUSD" size={14} />} />
          <Stat label="Loan-to-value" value={`${ltvPct}%`} />
          <Stat label="Liquidation price" value={`${fmtUnits(data.liqPricePyusdPerPrime, 18, 4)} PYUSD / PRIME`} />
          <Stat label="Current net APY" value={`${(currentNet * 100).toFixed(2)}%`} amber />
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button variant="outlined" fullWidth disabled>
            Close position (coming soon)
          </Button>
          <Link
            href={MORPHO_MARKET_URL}
            target="_blank"
            rel="noopener"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              color: colors.coral,
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 500,
              whiteSpace: 'nowrap',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            <ProtocolIcon name="Morpho" size={14} />
            View on Morpho ↗
          </Link>
        </Stack>
      </Stack>
    </Paper>
  );
}

function Stat({ label, value, amber, icon }: { label: string; value: string; amber?: boolean; icon?: React.ReactNode }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ py: 1.25 }}>
      <Typography variant="body2" sx={{ color: colors.creamMuted }}>{label}</Typography>
      <Stack direction="row" spacing={0.75} alignItems="center">
        {icon}
        <Box component="span" sx={{
          fontFamily: 'var(--font-geist-sans)',
          fontVariantNumeric: 'tabular-nums',
          fontSize: 14,
          fontWeight: 500,
          color: amber ? colors.amber : colors.cream,
        }}>
          {value}
        </Box>
      </Stack>
    </Stack>
  );
}
