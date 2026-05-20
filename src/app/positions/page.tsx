'use client';

import { Box, Container, Stack, Typography, Paper } from '@mui/material';
import { useAccount } from 'wagmi';
import { Header } from '@/components/Header';
import { PositionCard } from '@/components/PositionCard';
import { colors } from '@/lib/theme/tokens';

export default function PositionsPage() {
  const { address, isConnected } = useAccount();
  return (
    <Box sx={{ minHeight: '100vh' }}>
      <Header />
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Stack spacing={4}>
          <Stack spacing={1}>
            <Typography variant="caption" sx={{ color: colors.coral }}>Live state</Typography>
            <Typography variant="h2" sx={{ fontSize: 28 }}>Your loops</Typography>
            <Typography variant="body2" sx={{ color: colors.creamMuted }}>
              Position read directly from Morpho Blue PRIME / PYUSD market.
            </Typography>
          </Stack>
          {!isConnected || !address ? (
            <Paper elevation={0} sx={{ p: 4 }}>
              <Typography variant="body2" sx={{ color: colors.creamMuted }}>
                Connect Phantom to view your position.
              </Typography>
            </Paper>
          ) : (
            <PositionCard user={address} />
          )}
        </Stack>
      </Container>
    </Box>
  );
}
