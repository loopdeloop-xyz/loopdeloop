'use client';

import { Box, Container, Grid, Stack } from '@mui/material';
import { Header } from '@/components/Header';
import { LoopForm } from '@/components/LoopForm';
import { QuotePanel } from '@/components/QuotePanel';
import { ExecuteButton } from '@/components/ExecuteButton';
import { TxStatusModal } from '@/components/TxStatusModal';
import { PromoCard } from '@/components/PromoCard';

export default function Home() {
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Header />
      <Container maxWidth="lg" sx={{ py: 2, flex: 1, minHeight: 0, overflow: 'auto' }}>
        <PromoCard />
        <Grid container spacing={2.5} alignItems="flex-start">
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={1.5}>
              <LoopForm />
              <Box sx={{ maxWidth: 560, mx: 'auto', width: '100%' }}>
                <ExecuteButton />
              </Box>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <QuotePanel />
          </Grid>
        </Grid>
      </Container>
      <TxStatusModal />
    </Box>
  );
}
