'use client';

import { useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import type { Address } from 'viem';
import { usePosition } from '@/hooks/usePosition';
import { colors } from '@/lib/theme/tokens';
import { CloseAction } from './CloseAction';
import { AdjustLeverageAction } from './AdjustLeverageAction';

type TileKey = 'close' | 'adjust';

function AdjustIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <line x1="3" y1="12" x2="21" y2="12" stroke={colors.coral} strokeWidth={2} strokeLinecap="round" />
      <circle cx="15" cy="12" r="3.5" fill={colors.amber} />
    </svg>
  );
}

function CloseIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="12" r="5" fill="none" stroke={colors.coral} strokeWidth={2} />
      <line x1="14" y1="12" x2="21" y2="12" stroke={colors.coral} strokeWidth={2} strokeLinecap="round" />
      <path d="M21 12 L17 9.5 L18.5 12 L17 14.5 Z" fill={colors.amber} />
    </svg>
  );
}

const TILES: { key: TileKey; title: string; sub: string; Icon: React.FC<{ size?: number }> }[] = [
  { key: 'adjust', title: 'Adjust leverage', sub: 'Lever up or down at the same equity', Icon: AdjustIcon },
  { key: 'close', title: 'Close', sub: 'Exit full or partial to USDC', Icon: CloseIcon },
];

export function ManageSection({ user }: { user: Address }) {
  const { data: pos } = usePosition(user);
  const [open, setOpen] = useState<TileKey | null>(null);
  const disabled = !pos?.hasPosition;

  return (
    <Box
      sx={{
        bgcolor: colors.midnightRaised,
        border: `1px solid ${colors.midnightLine}`,
        borderRadius: 2,
        p: 2,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <Typography variant="caption" sx={{ color: colors.creamMuted, display: 'block', mb: 1 }}>
        Manage
      </Typography>
      <Stack direction="row" spacing={1}>
        {TILES.map((t) => {
          const active = open === t.key;
          return (
            <Box
              key={t.key}
              component="button"
              onClick={() => !disabled && setOpen(active ? null : t.key)}
              disabled={disabled}
              sx={{
                flex: 1,
                bgcolor: active ? colors.midnight : 'transparent',
                border: `1px solid ${active ? colors.coral : colors.midnightLine}`,
                borderRadius: 1.5,
                py: 1.25,
                px: 1.5,
                textAlign: 'left',
                color: colors.cream,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                transition: 'border-color 160ms ease-out, background 160ms ease-out',
                '&:hover': !disabled ? { borderColor: colors.coral } : {},
                fontFamily: 'inherit',
                minWidth: 0,
              }}
            >
              <Stack direction="row" spacing={1.25} alignItems="center">
                <Box sx={{ flexShrink: 0, display: 'flex' }}>
                  <t.Icon size={22} />
                </Box>
                <Stack spacing={0.15} sx={{ minWidth: 0 }}>
                  <Typography sx={{ color: colors.cream, fontSize: 13.5, fontWeight: 500, lineHeight: 1.2 }}>
                    {t.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: colors.creamMuted, fontSize: 11, lineHeight: 1.3 }}>
                    {t.sub}
                  </Typography>
                </Stack>
              </Stack>
            </Box>
          );
        })}
      </Stack>
      {open === 'close' && <CloseAction />}
      {open === 'adjust' && <AdjustLeverageAction />}
    </Box>
  );
}
