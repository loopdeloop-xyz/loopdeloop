'use client';

import { Box, Button, Stack, Typography } from '@mui/material';
import { useAccount, useConnect, useDisconnect, useSwitchChain, useChainId } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { shortAddr } from '@/lib/format';
import { colors } from '@/lib/theme/tokens';

function isPhantom(c: { id?: string; name?: string }): boolean {
  const id = (c.id ?? '').toLowerCase();
  const name = (c.name ?? '').toLowerCase();
  return id === 'app.phantom' || id === 'phantom' || name === 'phantom';
}

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const chainId = useChainId();

  if (isConnected && address) {
    const wrongChain = chainId !== mainnet.id;
    return (
      <Stack direction="row" spacing={1} alignItems="center">
        {wrongChain && (
          <Button size="small" variant="contained" color="warning" onClick={() => switchChain({ chainId: mainnet.id })}>
            Switch to mainnet
          </Button>
        )}
        <Button
          variant="outlined"
          size="small"
          onClick={() => disconnect()}
          sx={{ pl: 1.5, pr: 1.5, gap: 1 }}
        >
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: colors.amber,
            }}
          />
          <Box component="span" sx={{ fontFamily: 'var(--font-geist-mono)', fontSize: 13 }}>
            {shortAddr(address)}
          </Box>
        </Button>
      </Stack>
    );
  }

  const phantomConnector =
    connectors.find((c) => c.id === 'app.phantom') ??
    connectors.find(isPhantom) ??
    connectors[0];

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Button
        variant="contained"
        size="small"
        disabled={isPending || !phantomConnector}
        onClick={() => phantomConnector && connect({ connector: phantomConnector })}
      >
        {isPending ? 'Connecting…' : 'Connect Phantom'}
      </Button>
      {error && (
        <Typography variant="caption" color="error" sx={{ letterSpacing: 0, textTransform: 'none', maxWidth: 280 }}>
          {error.message.slice(0, 100)}
        </Typography>
      )}
    </Stack>
  );
}
