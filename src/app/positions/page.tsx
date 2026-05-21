'use client';

import { Box, Container, Grid, Stack, Typography, Paper } from '@mui/material';
import { useAccount } from 'wagmi';
import { Header } from '@/components/Header';
import { TxStatusModal } from '@/components/TxStatusModal';
import { PositionStatCard } from '@/components/positions/PositionStatCard';
import { RiskCard } from '@/components/positions/RiskCard';
import { ManageSection } from '@/components/positions/ManageSection';
import { colors } from '@/lib/theme/tokens';

export default function PositionsPage() {
  const { address, isConnected } = useAccount();
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Header />
      <Container maxWidth="lg" sx={{ py: 2, flex: 1, minHeight: 0, overflow: 'auto' }}>
        {!isConnected || !address ? (
          <Paper elevation={0} sx={{ p: 3 }}>
            <Typography variant="body2" sx={{ color: colors.creamMuted }}>
              Connect Phantom to view your position.
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={2} alignItems="stretch">
            <Grid size={{ xs: 12, md: 7 }}>
              <ManageSection user={address} />
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Stack spacing={2} sx={{ height: '100%' }}>
                <PositionStatCard user={address} />
                <RiskCard user={address} />
              </Stack>
            </Grid>
          </Grid>
        )}
      </Container>
      <TxStatusModal />
    </Box>
  );
}
