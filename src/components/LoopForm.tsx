'use client';

import { Box, Paper, Slider, Stack, TextField, Typography, Alert } from '@mui/material';
import { useAccount } from 'wagmi';
import { useEffect } from 'react';
import { useUiStore } from '@/state/store';
import { useUsdcBalance } from '@/hooks/useUsdcBalance';
import { useMarketData } from '@/hooks/useMarketData';
import { fmtUnits } from '@/lib/format';
import { DEC, MARKET_PARAMS } from '@/lib/addresses';
import { ltvFromLeverage, leverageRatioFromLtv } from '@/lib/loop';
import { colors } from '@/lib/theme/tokens';

const MIN_LEVERAGE = 1.05;
const MAX_LEVERAGE = leverageRatioFromLtv(MARKET_PARAMS.lltv);

export function LoopForm() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useUsdcBalance(address);
  const { data: market } = useMarketData();
  const usdcInput = useUiStore((s) => s.usdcInput);
  const setUsdcInput = useUiStore((s) => s.setUsdcInput);
  const leverage = useUiStore((s) => s.leverage);
  const setLeverage = useUiStore((s) => s.setLeverage);

  useEffect(() => {
    if (leverage > MAX_LEVERAGE) setLeverage(Math.floor(MAX_LEVERAGE * 100) / 100);
  }, [leverage, setLeverage]);

  const balanceStr = balance !== undefined ? fmtUnits(balance, DEC.USDC, 2) : '—';

  return (
    <Paper elevation={0} sx={{ p: 2.5, maxWidth: 560, mx: 'auto', width: '100%' }}>
      <Stack spacing={2}>
        <Stack spacing={0.5}>
          <Typography variant="caption" sx={{ color: colors.coral, fontSize: 10 }}>
            Leverage, executed cleanly
          </Typography>
          <Typography variant="h2" sx={{ fontSize: 22 }}>
            Open a leveraged loop
          </Typography>
        </Stack>

        <Box>
          <Typography variant="caption" sx={{ color: colors.creamMuted, display: 'block', mb: 0.75, fontSize: 10 }}>
            Deposit
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="0.00"
            value={usdcInput}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '' || /^\d*\.?\d*$/.test(v)) setUsdcInput(v);
            }}
            slotProps={{
              input: {
                endAdornment: (
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <Typography variant="body2" sx={{ color: colors.creamMuted, fontSize: 13 }}>USDC</Typography>
                    <Box
                      component="button"
                      onClick={() => balance && setUsdcInput(fmtUnits(balance, DEC.USDC, 6))}
                      disabled={!balance || balance === 0n}
                      sx={{
                        bgcolor: 'transparent',
                        border: 'none',
                        color: colors.amber,
                        fontSize: 10,
                        fontWeight: 500,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        p: 0.5,
                        '&:disabled': { color: colors.slate, cursor: 'not-allowed' },
                      }}
                    >
                      MAX
                    </Box>
                  </Stack>
                ),
                sx: {
                  fontSize: 20,
                  fontFamily: 'var(--font-geist-sans)',
                  fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.01em',
                },
              },
            }}
          />
          <Typography variant="body2" sx={{ color: colors.slate, mt: 0.5, fontSize: 11.5 }}>
            Wallet balance: <span className="lpw-tnum">{balanceStr}</span> USDC
          </Typography>
        </Box>

        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: colors.creamMuted, fontSize: 10 }}>Leverage</Typography>
            <Typography
              sx={{
                color: colors.amber,
                fontSize: 26,
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              {leverage.toFixed(2)}
              <Box component="span" sx={{ fontSize: 15, ml: 0.25, color: colors.amber }}>×</Box>
            </Typography>
          </Stack>
          <Slider
            value={leverage}
            min={MIN_LEVERAGE}
            max={MAX_LEVERAGE}
            step={0.05}
            size="small"
            onChange={(_, v) => setLeverage(typeof v === 'number' ? v : v[0])}
            marks={[
              { value: 1, label: '1×' },
              { value: 2, label: '2×' },
              { value: 3, label: '3×' },
              { value: 4, label: '4×' },
              { value: Math.floor(MAX_LEVERAGE * 10) / 10, label: `${Math.floor(MAX_LEVERAGE * 10) / 10}×` },
            ]}
            sx={{
              mt: 0.25,
              '& .MuiSlider-markLabel': {
                color: colors.slate,
                fontSize: 10,
                fontWeight: 500,
              },
            }}
          />
        </Box>

        {!isConnected && (
          <Alert
            severity="info"
            variant="outlined"
            sx={{ py: 0.25, bgcolor: 'transparent', borderColor: colors.midnightLine, color: colors.creamMuted, fontSize: 12 }}
          >
            Connect Phantom to see your balance and execute the loop.
          </Alert>
        )}
        {market?.primeApySource === 'fallback' && (
          <Alert
            severity="warning"
            variant="outlined"
            sx={{ py: 0.25, bgcolor: 'transparent', borderColor: colors.midnightLine, color: colors.creamMuted, fontSize: 12 }}
          >
            PRIME APY using fallback. Public RPC archive read failed for NAV history.
          </Alert>
        )}
      </Stack>
    </Paper>
  );
}
