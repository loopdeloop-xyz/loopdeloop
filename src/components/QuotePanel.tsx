'use client';

import { Paper, Stack, Typography, Box, Skeleton } from '@mui/material';
import useSWR from 'swr';
import { useEffect, useState } from 'react';
import { useUiStore } from '@/state/store';
import { useMarketData } from '@/hooks/useMarketData';
import { publicClient } from '@/lib/viem';
import { quoteCurvePyusdToUsdc, applySlippage } from '@/lib/quote';
import { planLeverage, ltvFromLeverage, netApy, entryCostBps } from '@/lib/loop';
import { MARKET_PARAMS, DEC } from '@/lib/addresses';
import { parseUnits, fmtUnits, fmtPct } from '@/lib/format';
import { colors } from '@/lib/theme/tokens';
import { LogoMarkCompact } from './brand/Logo';
import { TokenIcon } from './brand/TokenIcon';

export interface Quote {
  inputUsdc: bigint;
  feeUsdc: bigint;
  netUsdc: bigint;
  collateralPrime: bigint;
  collateralValuePyusd: bigint;
  flashAmountPyusd: bigint;
  expectedCurveUsdc: bigint;
  minCurveUsdc: bigint;
  liqPricePerPrime: bigint;
  hfEntryWad: bigint;
  netApyAnnual: number;
  primeApy: number;
  borrowApy: number;
  primeApySource: 'live' | 'fallback';
  entryCostTotalBps: number;
  ltvWad: bigint;
  leverageRatio: number;
}

export function useQuote(): { quote?: Quote; loading: boolean; error?: string } {
  const usdcInput = useUiStore((s) => s.usdcInput);
  const leverage = useUiStore((s) => s.leverage);
  const slippageBps = useUiStore((s) => s.slippageBps);
  const { data: market } = useMarketData();
  const [debounced, setDebounced] = useState({ usdcInput, leverage });

  useEffect(() => {
    const t = setTimeout(() => setDebounced({ usdcInput, leverage }), 300);
    return () => clearTimeout(t);
  }, [usdcInput, leverage]);

  const key =
    market && debounced.usdcInput && Number(debounced.usdcInput) > 0
      ? ['quote', debounced.usdcInput, debounced.leverage, market.oraclePrice.toString(), slippageBps]
      : null;

  const swr = useSWR<Quote>(
    key,
    async () => {
      if (!market) throw new Error('no market');
      const inputUsdc = parseUnits(debounced.usdcInput, DEC.USDC);
      const ltvWad = ltvFromLeverage(debounced.leverage);
      const plan = planLeverage({
        initialUsdc: inputUsdc,
        targetLtvWad: ltvWad,
        oraclePrice: market.oraclePrice,
        lltvWad: MARKET_PARAMS.lltv,
      });
      const expectedCurveUsdc = await quoteCurvePyusdToUsdc(publicClient, plan.flashAmountPyusd);
      const minCurveUsdc = applySlippage(expectedCurveUsdc, slippageBps);

      const liqPrice = plan.totalCollateralPyusd > 0n && plan.finalCollateralPrime > 0n
        ? (plan.flashAmountPyusd * (10n ** 36n)) /
          ((plan.finalCollateralPrime * MARKET_PARAMS.lltv) / 10n ** 18n) /
          10n ** 18n
        : 0n;
      const hfEntry = plan.flashAmountPyusd > 0n
        ? (plan.totalCollateralPyusd * MARKET_PARAMS.lltv) / plan.flashAmountPyusd
        : 2n ** 255n;

      const apy = netApy(market.primeApy, market.borrowApy, ltvWad);
      const cost = entryCostBps(slippageBps);

      return {
        inputUsdc,
        feeUsdc: plan.feeUsdc,
        netUsdc: plan.netUsdc,
        collateralPrime: plan.finalCollateralPrime,
        collateralValuePyusd: plan.totalCollateralPyusd,
        flashAmountPyusd: plan.flashAmountPyusd,
        expectedCurveUsdc,
        minCurveUsdc,
        liqPricePerPrime: liqPrice,
        hfEntryWad: hfEntry,
        netApyAnnual: apy,
        primeApy: market.primeApy,
        borrowApy: market.borrowApy,
        primeApySource: market.primeApySource,
        entryCostTotalBps: cost.totalBps,
        ltvWad,
        leverageRatio: plan.leverageRatio,
      };
    },
    { revalidateOnFocus: false, keepPreviousData: true, refreshInterval: 15_000 },
  );

  return {
    quote: swr.data,
    loading: swr.isLoading || swr.isValidating,
    error: swr.error ? String(swr.error.message ?? swr.error) : undefined,
  };
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ py: 0.75 }}>
      <Typography variant="body2" sx={{ color: colors.creamMuted, fontSize: 12.5 }}>{label}</Typography>
      <Box component="span" sx={{
        fontFamily: 'var(--font-geist-sans)',
        fontSize: 13,
        fontWeight: 500,
        fontVariantNumeric: 'tabular-nums',
        color: colors.cream,
      }}>
        {value}
      </Box>
    </Stack>
  );
}

function hfTone(hfFloat: number) {
  if (hfFloat >= 1.5) return colors.cream;
  if (hfFloat >= 1.2) return colors.amber;
  return colors.danger;
}

export function QuotePanel() {
  const { quote, loading, error } = useQuote();

  if (!quote) {
    return (
      <Paper elevation={0} sx={{ p: 2.5 }}>
        {error ? (
          <Typography color="error" variant="body2">{error}</Typography>
        ) : loading ? (
          <Stack spacing={1}>
            <Skeleton variant="text" width="40%" height={32} sx={{ bgcolor: colors.midnightLine }} />
            <Skeleton variant="text" width="80%" sx={{ bgcolor: colors.midnightLine }} />
            <Skeleton variant="text" width="80%" sx={{ bgcolor: colors.midnightLine }} />
          </Stack>
        ) : (
          <Stack spacing={1}>
            <Typography variant="caption" sx={{ color: colors.creamMuted, fontSize: 10 }}>Quote</Typography>
            <Typography variant="body2" sx={{ color: colors.creamMuted, fontSize: 12.5 }}>
              Enter a USDC amount to see the projection.
            </Typography>
          </Stack>
        )}
      </Paper>
    );
  }

  const hfFloat = Number(quote.hfEntryWad) / 1e18;
  const apyValue = quote.netApyAnnual * 100;
  const apySign = apyValue >= 0 ? '' : '-';
  const apyAbs = Math.abs(apyValue);

  return (
    <Paper elevation={0} sx={{ p: 2.5 }}>
      <Stack spacing={2}>
        <Stack spacing={0.5}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <LogoMarkCompact size={12} />
            <Typography variant="caption" sx={{ color: colors.creamMuted, fontSize: 10 }}>Net APY</Typography>
          </Stack>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
            <Typography sx={{
              color: colors.amber,
              fontSize: 32,
              fontWeight: 600,
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
            }}>
              {apySign}{apyAbs.toFixed(2)}
            </Typography>
            <Typography sx={{ color: colors.amber, fontSize: 17, fontWeight: 600, lineHeight: 1 }}>%</Typography>
          </Box>
        </Stack>

        <Box>
          <Typography variant="caption" sx={{ color: colors.creamMuted, display: 'block', mb: 0.25, fontSize: 10 }}>
            Breakdown
          </Typography>
          <Box sx={{ '& > div + div': { borderTop: `1px solid ${colors.midnightLine}` } }}>
            <Row
              label={
                <Stack direction="row" spacing={0.5} alignItems="center" component="span">
                  <TokenIcon symbol="PRIME" size={12} />
                  <span>PRIME yield × {quote.leverageRatio.toFixed(2)}</span>
                </Stack>
              }
              value={fmtPct(quote.primeApy * quote.leverageRatio)}
            />
            <Row
              label={
                <Stack direction="row" spacing={0.5} alignItems="center" component="span">
                  <TokenIcon symbol="PYUSD" size={12} />
                  <span>PYUSD borrow × {(quote.leverageRatio - 1).toFixed(2)}</span>
                </Stack>
              }
              value={`−${fmtPct(quote.borrowApy * (quote.leverageRatio - 1))}`}
            />
            <Row label="Service fee (1%)" value={`${fmtUnits(quote.feeUsdc, DEC.USDC, 2)} USDC`} />
            <Row label="Swap slippage" value={`${(quote.entryCostTotalBps / 100 - 1).toFixed(2)}%`} />
          </Box>
        </Box>

        <Box>
          <Typography variant="caption" sx={{ color: colors.creamMuted, display: 'block', mb: 0.25, fontSize: 10 }}>
            Risk
          </Typography>
          <Box sx={{ '& > div + div': { borderTop: `1px solid ${colors.midnightLine}` } }}>
            <Row
              label="Collateral"
              value={
                <Stack direction="row" spacing={0.5} alignItems="center" component="span">
                  <span>{fmtUnits(quote.collateralPrime, DEC.PRIME, 4)} PRIME</span>
                  <TokenIcon symbol="PRIME" size={12} />
                </Stack>
              }
            />
            <Row
              label="Debt"
              value={
                <Stack direction="row" spacing={0.5} alignItems="center" component="span">
                  <span>{fmtUnits(quote.flashAmountPyusd, DEC.PYUSD, 2)} PYUSD</span>
                  <TokenIcon symbol="PYUSD" size={12} />
                </Stack>
              }
            />
            <Row label="Liquidation price" value={`${fmtUnits(quote.liqPricePerPrime, 18, 4)} PYUSD / PRIME`} />
            <Row
              label="Entry HF"
              value={
                <Box component="span" sx={{ color: hfTone(hfFloat) }}>
                  {hfFloat > 100 ? '∞' : hfFloat.toFixed(3)}
                </Box>
              }
            />
          </Box>
        </Box>
      </Stack>
    </Paper>
  );
}
