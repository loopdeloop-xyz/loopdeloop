'use client';

import { Paper, Stack, Typography, Box } from '@mui/material';
import type { Address } from 'viem';
import { usePosition } from '@/hooks/usePosition';
import { useMarketData } from '@/hooks/useMarketData';
import {
  liquidationOraclePrice,
  bufferBps,
  driftToLiquidation,
  formatDrift,
  navFromOraclePrice,
} from '@/lib/risk';
import { MARKET_PARAMS } from '@/lib/addresses';
import { colors } from '@/lib/theme/tokens';

export function RiskCard({ user }: { user: Address }) {
  const { data: pos } = usePosition(user);
  const { data: market } = useMarketData();

  if (!pos || !pos.hasPosition || !market) return null;

  const liqPrice = liquidationOraclePrice(pos.collateralPrime, pos.borrowAssets, MARKET_PARAMS.lltv);
  const liqNav = navFromOraclePrice(liqPrice);
  const currentNav = navFromOraclePrice(pos.oraclePrice);
  const buffer = bufferBps(pos.oraclePrice, liqPrice);
  const drift = driftToLiquidation(pos.hfWad, market.primeApy, market.borrowApy);

  const bufferTone = buffer < 500 ? colors.danger : buffer < 1500 ? colors.amber : colors.cream;

  return (
    <Paper elevation={0} sx={{ p: 2.5, height: '100%' }}>
      <Stack spacing={1.5}>
        <Typography variant="caption" sx={{ color: colors.creamMuted }}>Risk</Typography>
        <Box sx={{ '& > div + div': { borderTop: `1px solid ${colors.midnightLine}` } }}>
          <Row
            label="Liquidation NAV"
            value={
              <span>
                ${liqNav.toFixed(4)} <Box component="span" sx={{ color: colors.creamMuted, fontWeight: 400 }}>vs ${currentNav.toFixed(4)} now</Box>
              </span>
            }
          />
          <Row
            label="Buffer to liquidation"
            value={<Box component="span" sx={{ color: bufferTone }}>{(buffer / 100).toFixed(2)}%</Box>}
          />
          <Row label="Drift at current rates" value={formatDrift(drift)} />
        </Box>
      </Stack>
    </Paper>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ py: 0.85 }}>
      <Typography variant="body2" sx={{ color: colors.creamMuted, fontSize: 12 }}>{label}</Typography>
      <Box component="span" sx={{
        fontFamily: 'var(--font-geist-sans)',
        fontVariantNumeric: 'tabular-nums',
        fontSize: 12.5,
        fontWeight: 500,
        color: colors.cream,
        textAlign: 'right',
      }}>
        {value}
      </Box>
    </Stack>
  );
}
