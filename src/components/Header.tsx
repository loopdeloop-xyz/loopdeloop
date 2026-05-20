'use client';

import { AppBar, Toolbar, Stack, Box, Typography } from '@mui/material';
import Link from 'next/link';
import { ConnectButton } from './ConnectButton';
import { Logotype } from './brand/Logo';
import { IntroAnimation } from './IntroAnimation';
import { colors } from '@/lib/theme/tokens';

const navLinkSx = {
  textDecoration: 'none',
  color: colors.creamMuted,
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
  fontSize: 11,
  fontWeight: 500,
  transition: 'color 160ms ease-out',
  '&:hover': { color: colors.cream },
};

export function Header() {
  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{ bgcolor: 'transparent', borderBottom: `1px solid ${colors.midnightLine}` }}
    >
      <Toolbar sx={{ gap: 4, minHeight: 52, py: 0.5 }} variant="dense">
        <Link href="/" style={{ textDecoration: 'none' }}>
          <IntroAnimation>{(animateOnce) => <Logotype height={26} animateOnce={animateOnce} />}</IntroAnimation>
        </Link>
        <Stack direction="row" spacing={3} sx={{ ml: 1 }}>
          <Typography component={Link} href="/" sx={navLinkSx}>Loop</Typography>
          <Typography component={Link} href="/positions" sx={navLinkSx}>Positions</Typography>
        </Stack>
        <Box sx={{ flexGrow: 1 }} />
        <ConnectButton />
      </Toolbar>
    </AppBar>
  );
}
