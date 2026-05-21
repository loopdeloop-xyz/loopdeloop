'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Slider, Stack, Typography, Chip } from '@mui/material';
import { useAccount, useWalletClient } from 'wagmi';
import useSWR from 'swr';
import { CLOSE_FEE_BPS, DEC, DEFAULT_CLOSE_SLIPPAGE_BPS } from '@/lib/addresses';
import { fmtUnits } from '@/lib/format';
import { usePosition } from '@/hooks/usePosition';
import { useUiStore } from '@/state/store';
import { executeClose } from '@/lib/execute';
import { publicClient } from '@/lib/viem';
import {
  quoteUniV3PrimeToUsdc,
  quoteCurveUsdcToPyusd,
  applySlippage,
  inflateForSlippage,
} from '@/lib/quote';
import { colors } from '@/lib/theme/tokens';
import { ActionPanelShell, CostBreakdown } from './ActionPanelShell';

const STALE_AFTER_MS = 15_000;
const PRESETS = [25, 50, 75, 100];

export function CloseAction() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { data: pos } = usePosition(address);
  const startTx = useUiStore((s) => s.startTx);
  const setTxSigning = useUiStore((s) => s.setTxSigning);
  const setTxSending = useUiStore((s) => s.setTxSending);
  const setTxPending = useUiStore((s) => s.setTxPending);
  const setTxSuccess = useUiStore((s) => s.setTxSuccess);
  const setTxError = useUiStore((s) => s.setTxError);

  const [percent, setPercent] = useState(100);
  const [quoteAt, setQuoteAt] = useState<number | null>(null);

  const fraction = percent / 100;
  const collateralToWithdraw = useMemo(() => {
    if (!pos) return 0n;
    const num = BigInt(Math.round(fraction * 1_000_000));
    return (pos.collateralPrime * num) / 1_000_000n;
  }, [pos, fraction]);
  const debtToRepay = useMemo(() => {
    if (!pos) return 0n;
    const num = BigInt(Math.round(fraction * 1_000_000));
    return percent === 100 ? pos.borrowAssets : (pos.borrowAssets * num) / 1_000_000n;
  }, [pos, fraction, percent]);

  const quote = useSWR(
    pos && pos.hasPosition && collateralToWithdraw > 0n
      ? ['close-quote', collateralToWithdraw.toString(), debtToRepay.toString()]
      : null,
    async () => {
      const safetyBuffer = debtToRepay / 10_000n > 1000n ? debtToRepay / 10_000n : 1000n;
      const flashAmount = debtToRepay + safetyBuffer;

      const uni = await quoteUniV3PrimeToUsdc(publicClient, collateralToWithdraw);
      const minUsdcFromPrime = applySlippage(uni.amountOut, DEFAULT_CLOSE_SLIPPAGE_BPS);

      const dyAtFlash = await quoteCurveUsdcToPyusd(publicClient, flashAmount);
      const dxEstimate = dyAtFlash > 0n ? (flashAmount * flashAmount) / dyAtFlash : flashAmount;
      const dxUsdcForFlashRepay = inflateForSlippage(dxEstimate, DEFAULT_CLOSE_SLIPPAGE_BPS);

      const expectedNet = minUsdcFromPrime > dxUsdcForFlashRepay
        ? minUsdcFromPrime - dxUsdcForFlashRepay
        : 0n;
      const fee = (expectedNet * CLOSE_FEE_BPS) / 10_000n;
      const userOutMin = expectedNet > fee ? expectedNet - fee : 0n;

      return {
        usdcFromUni: uni.amountOut,
        priceImpactBps: uni.priceImpactBps,
        minUsdcFromPrime,
        dxUsdcForFlashRepay,
        flashAmount,
        fee,
        userOutMin,
        ts: Date.now(),
      };
    },
    { refreshInterval: STALE_AFTER_MS, revalidateOnFocus: false, keepPreviousData: true },
  );

  useEffect(() => {
    if (quote.data) setQuoteAt(quote.data.ts);
  }, [quote.data]);

  const isStale = quoteAt !== null && Date.now() - quoteAt > STALE_AFTER_MS;

  const submitDisabled =
    !walletClient ||
    !address ||
    !pos?.hasPosition ||
    percent <= 0 ||
    !quote.data ||
    (quote.data && quote.data.userOutMin <= 0n);

  async function onSubmit() {
    if (!walletClient || !address) return;
    startTx();
    try {
      setTxSigning();
      await executeClose(
        walletClient,
        { user: address, fraction, slippageBps: DEFAULT_CLOSE_SLIPPAGE_BPS },
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
    <ActionPanelShell caption="Exit" title="Close position">
      <Stack spacing={2}>
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: colors.creamMuted }}>
              Close amount
            </Typography>
            <Typography sx={{ color: colors.amber, fontSize: 24, fontWeight: 600, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {percent}%
            </Typography>
          </Stack>
          <Slider
            value={percent}
            min={1}
            max={100}
            step={1}
            size="small"
            onChange={(_, v) => setPercent(typeof v === 'number' ? v : v[0])}
            sx={{ mt: 0.5 }}
          />
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            {PRESETS.map((p) => (
              <Chip
                key={p}
                label={`${p}%`}
                clickable
                onClick={() => setPercent(p)}
                variant={percent === p ? 'filled' : 'outlined'}
                sx={{
                  borderColor: colors.midnightLine,
                  bgcolor: percent === p ? colors.coral : 'transparent',
                  color: percent === p ? colors.midnight : colors.cream,
                  fontWeight: 500,
                  '&:hover': { borderColor: colors.coral, bgcolor: percent === p ? colors.coralHover : 'transparent' },
                }}
              />
            ))}
          </Stack>
        </Box>

        <Typography variant="body2" sx={{ color: colors.slate, fontSize: 12, lineHeight: 1.5 }}>
          Closes by selling {fmtUnits(collateralToWithdraw, DEC.PRIME, 4)} PRIME on Uniswap V3,
          repaying {fmtUnits(debtToRepay, DEC.PYUSD, 2)} PYUSD of debt, and sending the remainder
          to your wallet in one transaction.
        </Typography>

        {quote.data && pos && (
          <CostBreakdown
            rows={[
              { label: 'Action notional', value: `${fmtUnits(collateralToWithdraw, DEC.PRIME, 4)} PRIME` },
              { label: `Uniswap V3 sale (${(quote.data.priceImpactBps / 100).toFixed(3)}% impact, ≤${(DEFAULT_CLOSE_SLIPPAGE_BPS / 100).toFixed(2)}% slippage)`, value: `${fmtUnits(quote.data.usdcFromUni, DEC.USDC, 2)} USDC` },
              { label: 'Curve buyback to repay flash', value: `−${fmtUnits(quote.data.dxUsdcForFlashRepay, DEC.USDC, 2)} USDC` },
              { label: 'Service fee (0.5%)', value: `−${fmtUnits(quote.data.fee, DEC.USDC, 2)} USDC` },
              { label: 'Min you receive', value: `${fmtUnits(quote.data.userOutMin, DEC.USDC, 2)} USDC`, bold: true, tone: 'amber' },
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
            if (isStale) {
              quote.mutate();
              return;
            }
            void onSubmit();
          }}
        >
          {isStale ? 'Refresh quote' : percent === 100 ? 'Close position' : `Close ${percent}%`}
        </Button>
      </Stack>
    </ActionPanelShell>
  );
}
