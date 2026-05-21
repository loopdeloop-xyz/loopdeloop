'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Slider, Stack, Typography } from '@mui/material';
import { useAccount, useWalletClient } from 'wagmi';
import useSWR from 'swr';
import {
  ADJUST_FEE_BPS,
  DEC,
  DEFAULT_ADJUST_SLIPPAGE_BPS,
  MARKET_PARAMS,
} from '@/lib/addresses';
import { fmtUnits } from '@/lib/format';
import { usePosition } from '@/hooks/usePosition';
import { useUiStore } from '@/state/store';
import { executeAdjustLeverage } from '@/lib/execute';
import { publicClient } from '@/lib/viem';
import {
  quoteCurvePyusdToUsdc,
  quoteCurveUsdcToPyusd,
  quoteUniV3PrimeToUsdc,
  applySlippage,
  inflateForSlippage,
} from '@/lib/quote';
import { leverageRatioFromLtv, ltvFromLeverage } from '@/lib/loop';
import { colors } from '@/lib/theme/tokens';
import { ActionPanelShell, CostBreakdown } from './ActionPanelShell';

const STALE_AFTER_MS = 15_000;
const MIN_LEVERAGE = 1.05;
const MAX_LEVERAGE = leverageRatioFromLtv(MARKET_PARAMS.lltv);

export function AdjustLeverageAction() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { data: pos } = usePosition(address);
  const startTx = useUiStore((s) => s.startTx);
  const setTxSigning = useUiStore((s) => s.setTxSigning);
  const setTxSending = useUiStore((s) => s.setTxSending);
  const setTxPending = useUiStore((s) => s.setTxPending);
  const setTxSuccess = useUiStore((s) => s.setTxSuccess);
  const setTxError = useUiStore((s) => s.setTxError);

  // Current leverage (computed once from live position).
  const currentLeverage = useMemo(() => {
    if (!pos || !pos.hasPosition) return 1;
    const ltv = Number(pos.ltvWad) / 1e18;
    return ltv >= 1 ? MAX_LEVERAGE : 1 / (1 - ltv);
  }, [pos]);

  const [target, setTarget] = useState<number>(currentLeverage);
  useEffect(() => { setTarget(currentLeverage); }, [currentLeverage]);

  const direction: 'up' | 'down' | 'same' =
    Math.abs(target - currentLeverage) < 0.02
      ? 'same'
      : target > currentLeverage ? 'up' : 'down';

  const quote = useSWR(
    pos && pos.hasPosition && direction !== 'same'
      ? ['adjust-quote', target.toFixed(4), pos.collateralPrime.toString(), pos.borrowAssets.toString()]
      : null,
    async () => {
      if (!pos) throw new Error('no position');
      const targetLtvWad = ltvFromLeverage(target);
      const equity = pos.collateralValuePyusd - pos.borrowAssets;
      const targetDebt = (equity * targetLtvWad) / (10n ** 18n - targetLtvWad);
      const ts = Date.now();

      if (direction === 'up') {
        const deltaDebt = targetDebt - pos.borrowAssets;
        const feePyusd = (deltaDebt * ADJUST_FEE_BPS) / 10_000n;
        const expectedUsdc = await quoteCurvePyusdToUsdc(publicClient, deltaDebt);
        const minUsdc = applySlippage(expectedUsdc, DEFAULT_ADJUST_SLIPPAGE_BPS);
        return { kind: 'up' as const, deltaDebt, feePyusd, expectedUsdc, minUsdc, ts };
      }
      // down
      const deltaDebt = pos.borrowAssets - targetDebt;
      const deltaCollateral = (deltaDebt * 10n ** 36n) / pos.oraclePrice;
      const feeUsdc = (deltaDebt * ADJUST_FEE_BPS) / 10_000n;
      const uni = await quoteUniV3PrimeToUsdc(publicClient, deltaCollateral);
      const minUsdcFromPrime = applySlippage(uni.amountOut, DEFAULT_ADJUST_SLIPPAGE_BPS);
      const safety = deltaDebt / 10_000n > 1000n ? deltaDebt / 10_000n : 1000n;
      const flashAmount = deltaDebt + safety;
      const dyAtFlash = await quoteCurveUsdcToPyusd(publicClient, flashAmount);
      const dxEstimate = dyAtFlash > 0n ? (flashAmount * flashAmount) / dyAtFlash : flashAmount;
      const dxUsdcForFlashRepay = inflateForSlippage(dxEstimate, DEFAULT_ADJUST_SLIPPAGE_BPS);
      return {
        kind: 'down' as const,
        deltaDebt, deltaCollateral, feeUsdc,
        uniOut: uni.amountOut, priceImpactBps: uni.priceImpactBps,
        minUsdcFromPrime, dxUsdcForFlashRepay, ts,
      };
    },
    { refreshInterval: STALE_AFTER_MS, revalidateOnFocus: false, keepPreviousData: true },
  );

  const [quoteAt, setQuoteAt] = useState<number | null>(null);
  useEffect(() => { if (quote.data) setQuoteAt(quote.data.ts); }, [quote.data]);
  const isStale = quoteAt !== null && Date.now() - quoteAt > STALE_AFTER_MS;

  const submitDisabled =
    !walletClient ||
    !address ||
    !pos?.hasPosition ||
    direction === 'same' ||
    !quote.data;

  async function onSubmit() {
    if (!walletClient || !address || direction === 'same') return;
    const targetLtvWad = ltvFromLeverage(target);
    startTx();
    try {
      setTxSigning();
      await executeAdjustLeverage(
        walletClient,
        { user: address, targetLtvWad, slippageBps: DEFAULT_ADJUST_SLIPPAGE_BPS },
        {
          onSigning: () => setTxSigning(),
          onSending: () => setTxSending(),
          onSubmitted: (h) => setTxPending(h),
        },
      );
      setTxSuccess();
    } catch (e) {
      setTxError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <ActionPanelShell caption="Resize" title="Adjust leverage">
      <Stack spacing={1.5}>
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: colors.creamMuted }}>
              Target leverage · current {currentLeverage.toFixed(2)}×
            </Typography>
            <Typography sx={{ color: colors.amber, fontSize: 22, fontWeight: 600, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {target.toFixed(2)}×
            </Typography>
          </Stack>
          <Slider
            value={target}
            min={MIN_LEVERAGE}
            max={MAX_LEVERAGE}
            step={0.05}
            size="small"
            onChange={(_, v) => setTarget(typeof v === 'number' ? v : v[0])}
            marks={[
              { value: 2, label: '2×' },
              { value: 3, label: '3×' },
              { value: 4, label: '4×' },
              { value: Math.floor(MAX_LEVERAGE * 10) / 10, label: `${Math.floor(MAX_LEVERAGE * 10) / 10}×` },
            ]}
            sx={{
              mt: 0.25,
              '& .MuiSlider-markLabel': { color: colors.slate, fontSize: 10, fontWeight: 500 },
            }}
          />
        </Box>

        {direction === 'same' && (
          <Typography variant="body2" sx={{ color: colors.slate, fontSize: 12 }}>
            Drag the slider to a new leverage target.
          </Typography>
        )}

        {direction === 'up' && quote.data && quote.data.kind === 'up' && (
          <CostBreakdown
            rows={[
              { label: 'Action', value: `Lever up to ${target.toFixed(2)}×` },
              { label: 'Additional debt', value: `${fmtUnits(quote.data.deltaDebt, DEC.PYUSD, 2)} PYUSD` },
              { label: 'Service fee (0.25%)', value: `${fmtUnits(quote.data.feePyusd, DEC.PYUSD, 4)} PYUSD` },
              { label: 'Curve PYUSD → USDC', value: `≥ ${fmtUnits(quote.data.minUsdc, DEC.USDC, 2)} USDC` },
              { label: 'Net new exposure', value: `${fmtUnits(quote.data.deltaDebt, DEC.PYUSD, 2)} PYUSD as PRIME`, bold: true, tone: 'amber' },
            ]}
          />
        )}

        {direction === 'down' && quote.data && quote.data.kind === 'down' && (
          <CostBreakdown
            rows={[
              { label: 'Action', value: `Lever down to ${target.toFixed(2)}×` },
              { label: 'Debt repaid', value: `${fmtUnits(quote.data.deltaDebt, DEC.PYUSD, 2)} PYUSD` },
              { label: 'PRIME sold on Uniswap', value: `${fmtUnits(quote.data.deltaCollateral, DEC.PRIME, 4)} PRIME (${(quote.data.priceImpactBps / 100).toFixed(3)}% impact)` },
              { label: 'Service fee (0.25%)', value: `${fmtUnits(quote.data.feeUsdc, DEC.USDC, 4)} USDC` },
              { label: 'Equity preserved', value: 'No cash out', bold: true, tone: 'amber' },
            ]}
          />
        )}

        {isStale && (
          <Typography variant="body2" sx={{ color: colors.amber, fontSize: 12 }}>
            Quote is stale. Click to refresh, then submit.
          </Typography>
        )}

        <Button
          variant="contained"
          fullWidth
          disabled={submitDisabled}
          onClick={() => {
            if (isStale) { quote.mutate(); return; }
            void onSubmit();
          }}
        >
          {isStale
            ? 'Refresh quote'
            : direction === 'same'
              ? 'No change'
              : direction === 'up'
                ? `Lever up to ${target.toFixed(2)}×`
                : `Lever down to ${target.toFixed(2)}×`}
        </Button>
      </Stack>
    </ActionPanelShell>
  );
}
