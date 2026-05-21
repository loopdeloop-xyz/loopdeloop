'use client';

import { Button, CircularProgress } from '@mui/material';
import { useAccount, useWalletClient, useChainId, useSwitchChain } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { useUiStore } from '@/state/store';
import { useQuote } from './QuotePanel';
import { useUsdcBalance } from '@/hooks/useUsdcBalance';
import { executeLoop } from '@/lib/execute';
import { useMemo } from 'react';
import { colors } from '@/lib/theme/tokens';

export function ExecuteButton() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { quote, loading } = useQuote();
  const { data: balance } = useUsdcBalance(address);
  const slippageBps = useUiStore((s) => s.slippageBps);
  const startTx = useUiStore((s) => s.startTx);
  const setTxSigning = useUiStore((s) => s.setTxSigning);
  const setTxSending = useUiStore((s) => s.setTxSending);
  const setTxPending = useUiStore((s) => s.setTxPending);
  const setTxSuccess = useUiStore((s) => s.setTxSuccess);
  const setTxError = useUiStore((s) => s.setTxError);
  const txStatus = useUiStore((s) => s.txStatus);

  const disabledReason = useMemo(() => {
    if (!isConnected) return 'Connect Phantom';
    if (chainId !== mainnet.id) return 'Switch to mainnet';
    if (!quote) return 'Enter an amount';
    if (loading) return 'Quoting…';
    if (quote.inputUsdc === 0n) return 'Enter an amount';
    if (balance !== undefined && quote.inputUsdc > balance) return 'Insufficient USDC balance';
    return undefined;
  }, [isConnected, chainId, quote, loading, balance]);

  const isBusy = txStatus === 'signing' || txStatus === 'sending' || txStatus === 'pending';

  async function onClick() {
    if (!walletClient || !address || !quote) return;
    if (chainId !== mainnet.id) {
      switchChain({ chainId: mainnet.id });
      return;
    }
    startTx({ leverage: quote.leverageRatio, netApy: quote.netApyAnnual });
    try {
      setTxSigning();
      await executeLoop(
        walletClient,
        { user: address, inputUsdc: quote.inputUsdc, targetLtvWad: quote.ltvWad, slippageBps },
        {
          onSigning: () => setTxSigning(),
          onSending: () => setTxSending(),
          onSubmitted: (h) => setTxPending(h),
        },
      );
      setTxSuccess();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setTxError(msg);
    }
  }

  return (
    <Button
      variant="contained"
      size="medium"
      fullWidth
      disabled={!!disabledReason || !walletClient || isBusy}
      onClick={onClick}
      sx={{ py: 1.1, fontSize: 14, fontWeight: 500 }}
    >
      {isBusy ? (
        <CircularProgress size={18} sx={{ color: colors.midnight }} />
      ) : (
        (disabledReason ?? 'Open position')
      )}
    </Button>
  );
}
