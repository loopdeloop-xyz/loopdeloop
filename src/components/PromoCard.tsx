'use client';

import { Box, Grid, Paper, Stack, Typography } from '@mui/material';
import { colors } from '@/lib/theme/tokens';
import { ProtocolIcon, TokenIcon } from './brand/TokenIcon';

type TokenSymbol = 'USDC' | 'PYUSD' | 'PRIME';

interface Step {
  num: number;
  token: TokenSymbol;
  title: string;
  sub: string;
}

const STEPS: Step[] = [
  { num: 1, token: 'USDC', title: 'Deposit USDC', sub: 'Your equity' },
  { num: 2, token: 'PYUSD', title: 'Flash PYUSD', sub: 'Morpho Bundler3' },
  { num: 3, token: 'PRIME', title: 'Mint PRIME', sub: 'Curve swap, Hastra mint' },
  { num: 4, token: 'PRIME', title: 'Supply + Borrow', sub: 'Loop opens, flash repaid' },
];

function Bullet({ children, href }: { children: React.ReactNode; href?: string }) {
  const content = (
    <Typography variant="body2" sx={{ color: colors.cream, fontSize: 12.5 }}>{children}</Typography>
  );
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: colors.amber, flexShrink: 0 }} />
      {href ? (
        <Box
          component="a"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ textDecoration: 'none', '&:hover': { color: colors.coral } }}
        >
          {content}
        </Box>
      ) : content}
    </Box>
  );
}

function StepNode({ step, last }: { step: Step; last: boolean }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 0 }}>
        <Box sx={{ position: 'relative' }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: `1.5px solid ${colors.coral}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.midnight,
              position: 'relative',
              zIndex: 1,
            }}
          >
            <TokenIcon symbol={step.token} size={30} />
          </Box>
          <Box
            sx={{
              position: 'absolute',
              bottom: -2,
              right: -4,
              width: 18,
              height: 18,
              borderRadius: '50%',
              backgroundColor: colors.amber,
              color: colors.midnight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10.5,
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
              border: `2px solid ${colors.midnightRaised}`,
              zIndex: 2,
              lineHeight: 1,
            }}
          >
            {step.num}
          </Box>
        </Box>
        <Typography
          sx={{
            mt: 1.25,
            color: colors.cream,
            fontSize: 12,
            fontWeight: 500,
            textAlign: 'center',
            lineHeight: 1.25,
            px: 0.25,
          }}
        >
          {step.title}
        </Typography>
        <Typography
          sx={{
            mt: 0.25,
            color: colors.slate,
            fontSize: 10.5,
            textAlign: 'center',
            lineHeight: 1.25,
            px: 0.25,
          }}
        >
          {step.sub}
        </Typography>
      </Box>
      {!last && (
        <Box
          aria-hidden
          sx={{
            mt: '21px',
            mx: -0.5,
            flexShrink: 0,
            width: 18,
            height: 2,
            backgroundColor: colors.coral,
            position: 'relative',
            zIndex: 0,
            '&::after': {
              content: '""',
              position: 'absolute',
              right: -1,
              top: -3,
              width: 0,
              height: 0,
              borderLeft: `5px solid ${colors.amber}`,
              borderTop: '4px solid transparent',
              borderBottom: '4px solid transparent',
            },
          }}
        />
      )}
    </Box>
  );
}

export function PromoCard() {
  return (
    <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, mb: 2 }}>
      <Grid container spacing={{ xs: 2, md: 3 }} alignItems="center">
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={1.25}>
            <Typography variant="caption" sx={{ color: colors.coral, fontSize: 10 }}>
              Why loopdeloop
            </Typography>
            <Typography variant="h2" sx={{ fontSize: { xs: 19, md: 22 }, lineHeight: 1.15 }}>
              Looping PRIME, executed cleanly.
            </Typography>
            <Typography variant="body2" sx={{ color: colors.creamMuted, fontSize: 12.5, lineHeight: 1.45, maxWidth: 540 }}>
              Looping on mainnet is a chore. Approve, swap, supply, borrow, then iterate to target leverage.
              We pack the whole sequence into a single transaction using Morpho&apos;s Bundler3 and a PYUSD flashloan.
              You sign twice. The bundle assembles on your device.
            </Typography>
            <Stack direction="row" flexWrap="wrap" rowGap={0.75} columnGap={2.25} sx={{ pt: 0.25 }}>
              <Bullet>Non-custodial</Bullet>
              <Bullet>Client-side tx</Bullet>
              <Bullet>Morpho Bundler3 + flashloan</Bullet>
              <Bullet>2 sigs, 1 tx</Bullet>
              <Bullet href="https://github.com/loopdeloop-xyz/loopdeloop">Open source ↗</Bullet>
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ pt: 0.5 }}>
              <Typography variant="caption" sx={{ color: colors.slate, fontSize: 9, letterSpacing: '0.18em' }}>
                Powered by
              </Typography>
              <Stack direction="row" spacing={1.25} alignItems="center">
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <ProtocolIcon name="Morpho" size={12} />
                  <Typography variant="body2" sx={{ color: colors.creamMuted, fontSize: 11 }}>Morpho</Typography>
                </Stack>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <ProtocolIcon name="Hastra" size={12} />
                  <Typography variant="body2" sx={{ color: colors.creamMuted, fontSize: 11 }}>Hastra</Typography>
                </Stack>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <TokenIcon symbol="USDC" size={12} />
                  <Typography variant="body2" sx={{ color: colors.creamMuted, fontSize: 11 }}>USDC</Typography>
                </Stack>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <TokenIcon symbol="PYUSD" size={12} />
                  <Typography variant="body2" sx={{ color: colors.creamMuted, fontSize: 11 }}>PYUSD</Typography>
                </Stack>
              </Stack>
            </Stack>
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Box
            sx={{
              border: `1px solid ${colors.midnightLine}`,
              borderRadius: 2,
              p: { xs: 1.5, md: 2 },
              bgcolor: colors.midnight,
            }}
          >
            <Typography variant="caption" sx={{ color: colors.creamMuted, display: 'block', mb: 1.25, fontSize: 10 }}>
              How a loop opens
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              {STEPS.map((s, i) => (
                <StepNode key={s.num} step={s} last={i === STEPS.length - 1} />
              ))}
            </Box>
            <Typography
              sx={{
                color: colors.slate,
                fontSize: 10,
                textAlign: 'center',
                mt: 1.25,
                letterSpacing: '0.04em',
              }}
            >
              All four steps land in a single Ethereum transaction.
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
}
