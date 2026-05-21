'use client';

import { Paper, Stack, Typography, Box, Divider, Chip } from '@mui/material';
import type { Address } from 'viem';
import { usePosition } from '@/hooks/usePosition';
import { useMarketData } from '@/hooks/useMarketData';
import { useEntryBasis } from '@/hooks/useEntryBasis';
import { netApy } from '@/lib/loop';
import { fmtUnits, fmtPct } from '@/lib/format';
import { DEC } from '@/lib/addresses';
import { colors } from '@/lib/theme/tokens';
import { LogoMark } from '@/components/brand/Logo';
import { TokenIcon } from '@/components/brand/TokenIcon';

function hfTone(hf: number) {
  if (hf >= 1.5) return colors.cream;
  if (hf >= 1.2) return colors.amber;
  return colors.danger;
}

function fmtElapsed(sec: number): string {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  const d = Math.floor(sec / 86400);
  if (d < 7) return `${d}d`;
  if (d < 30) return `${Math.floor(d / 7)}w`;
  if (d < 365) return `${Math.floor(d / 30)}mo`;
  return `${(d / 365).toFixed(1)}y`;
}

export function PositionStatCard({ user }: { user: Address }) {
  const { data: pos } = usePosition(user);
  const { data: market } = useMarketData();
  const entry = useEntryBasis(user);

  if (!pos) return null;

  if (!pos.hasPosition) {
    return (
      <Paper elevation={0} sx={{ p: 4 }}>
        <Stack spacing={1.5} alignItems="center" sx={{ py: 2 }}>
          <Box sx={{ opacity: 0.3 }}><LogoMark size={40} /></Box>
          <Typography variant="body2" sx={{ color: colors.creamMuted }}>
            No open loops yet.
          </Typography>
          <Typography
            component="a"
            href="/"
            sx={{
              color: colors.coral, textDecoration: 'none',
              fontSize: 13, fontWeight: 500,
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            Open your first one →
          </Typography>
        </Stack>
      </Paper>
    );
  }

  const hfFloat = Number(pos.hfWad) / 1e18;
  const equityPyusd = pos.collateralValuePyusd - pos.borrowAssets;
  const currentNet = market ? netApy(market.primeApy, market.borrowApy, pos.ltvWad) : 0;

  const depositRaw = entry ? BigInt(entry.cumulativeDepositUsdcRaw) : 0n;
  const sinceOpen = entry && depositRaw > 0n;
  const elapsedSec = entry ? Math.floor(Date.now() / 1000) - entry.firstOpenTimestamp : 0;
  const pnlRaw = sinceOpen ? equityPyusd - depositRaw : 0n;
  const pnlPct = sinceOpen && depositRaw > 0n
    ? Number((pnlRaw * 10_000n) / depositRaw) / 100
    : 0;

  return (
    <Paper elevation={0} sx={{ p: 2.5, height: '100%' }}>
      <Stack spacing={1.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Stack direction="row" sx={{ '& > *:nth-of-type(2)': { ml: '-6px' } }}>
              <TokenIcon symbol="PRIME" size={22} />
              <TokenIcon symbol="PYUSD" size={22} />
            </Stack>
            <Typography sx={{ fontSize: 16, fontWeight: 600, color: colors.cream }}>
              PRIME / PYUSD loop
            </Typography>
          </Stack>
          <Chip
            label={`HF ${hfFloat > 100 ? '∞' : hfFloat.toFixed(3)}`}
            variant="outlined"
            size="small"
            sx={{
              height: 22,
              borderColor: hfTone(hfFloat),
              color: hfTone(hfFloat),
              fontFamily: 'var(--font-geist-sans)',
              fontVariantNumeric: 'tabular-nums',
              fontSize: 11, fontWeight: 500, letterSpacing: '0.12em',
            }}
          />
        </Stack>

        <Divider />

        <Typography variant="caption" sx={{ color: colors.creamMuted }}>Live</Typography>
        <Box sx={{ '& > div + div': { borderTop: `1px solid ${colors.midnightLine}` } }}>
          <Row label="Collateral" value={`${fmtUnits(pos.collateralPrime, DEC.PRIME, 4)} PRIME`} icon={<TokenIcon symbol="PRIME" size={12} />} />
          <Row label="Collateral value" value={`${fmtUnits(pos.collateralValuePyusd, DEC.PYUSD, 2)} PYUSD`} />
          <Row label="Debt" value={`${fmtUnits(pos.borrowAssets, DEC.PYUSD, 2)} PYUSD`} icon={<TokenIcon symbol="PYUSD" size={12} />} />
          <Row label="Equity" value={`${fmtUnits(equityPyusd, DEC.PYUSD, 2)} PYUSD`} bold />
          <Row label="Current net APY" value={fmtPct(currentNet, 2)} amber />
        </Box>

        {sinceOpen ? (
          <>
            <Typography variant="caption" sx={{ color: colors.creamMuted }}>Since open</Typography>
            <Box sx={{ '& > div + div': { borderTop: `1px solid ${colors.midnightLine}` } }}>
              <Row label="USDC deposited" value={`${fmtUnits(depositRaw, DEC.USDC, 2)} USDC`} />
              <Row
                label="P&L"
                value={
                  <Box component="span" sx={{ color: pnlRaw >= 0n ? colors.success : colors.danger }}>
                    {pnlRaw >= 0n ? '+' : ''}{fmtUnits(pnlRaw, DEC.PYUSD, 2)} USDC ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)
                  </Box>
                }
              />
              <Row label="Time held" value={fmtElapsed(elapsedSec)} />
            </Box>
          </>
        ) : (
          <Typography variant="body2" sx={{ color: colors.slate, fontSize: 11 }}>
            Performance data starts when you open via loopdeloop.
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}

function Row({
  label, value, amber, bold, icon,
}: {
  label: string; value: React.ReactNode; amber?: boolean; bold?: boolean; icon?: React.ReactNode;
}) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ py: 0.6 }}>
      <Typography variant="body2" sx={{ color: colors.creamMuted, fontSize: 12 }}>{label}</Typography>
      <Stack direction="row" spacing={0.6} alignItems="center">
        {icon}
        <Box component="span" sx={{
          fontFamily: 'var(--font-geist-sans)',
          fontVariantNumeric: 'tabular-nums',
          fontSize: 12.5,
          fontWeight: bold ? 600 : 500,
          color: amber ? colors.amber : colors.cream,
        }}>
          {value}
        </Box>
      </Stack>
    </Stack>
  );
}
