import type { Metadata } from 'next';
import { Box, Container, Stack, Typography } from '@mui/material';
import { colors } from '@/lib/theme/tokens';
import { Header } from '@/components/Header';
import { Logotype } from '@/components/brand/Logo';

interface SP {
  searchParams: Promise<{ lev?: string; apy?: string; tx?: string }>;
}

const SITE = 'https://loopdeloop.xyz';

export async function generateMetadata({ searchParams }: SP): Promise<Metadata> {
  const sp = await searchParams;
  const lev = sp.lev ?? '';
  const apy = sp.apy ?? '';
  const tx = sp.tx ?? '';
  const qs = new URLSearchParams();
  if (lev) qs.set('lev', lev);
  if (apy) qs.set('apy', apy);
  if (tx) qs.set('tx', tx);
  const imageUrl = `${SITE}/share/og?${qs.toString()}`;
  const title = lev ? `Opened a ${Number(lev).toFixed(2)}× leveraged PRIME loop` : 'loopdeloop';
  const description = apy
    ? `${(Number(apy) * 100).toFixed(2)}% net APY in a single transaction. Non-custodial, flashloan-funded.`
    : 'Leveraged PRIME loops on Morpho Blue. One transaction. Non-custodial.';
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE}/share?${qs.toString()}`,
      images: [{ url: imageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function SharePage({ searchParams }: SP) {
  const sp = await searchParams;
  const lev = sp.lev ? Number(sp.lev) : undefined;
  const apy = sp.apy ? Number(sp.apy) : undefined;
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Stack spacing={3} alignItems="center" sx={{ textAlign: 'center' }}>
          <Logotype height={36} />
          {lev !== undefined && (
            <Typography sx={{ color: colors.amber, fontSize: 80, fontWeight: 600, lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em' }}>
              {lev.toFixed(2)}<Box component="span" sx={{ fontSize: 48 }}>×</Box>
            </Typography>
          )}
          <Typography variant="body1" sx={{ color: colors.cream, fontSize: 22 }}>
            A leveraged PRIME loop just opened in one transaction.
            {apy !== undefined && <> Net APY <Box component="span" sx={{ color: colors.amber, fontWeight: 600 }}>{(apy * 100).toFixed(2)}%</Box>.</>}
          </Typography>
          <Typography component="a" href="/" sx={{ color: colors.coral, textDecoration: 'none', fontSize: 16, fontWeight: 500, '&:hover': { textDecoration: 'underline' } }}>
            Open your own loop →
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
