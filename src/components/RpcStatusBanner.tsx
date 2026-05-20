'use client';

import { Box, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useMarketData } from '@/hooks/useMarketData';
import { colors } from '@/lib/theme/tokens';

const SHOW_AFTER_ERROR_MS = 2500;

export function RpcStatusBanner() {
  const { error } = useMarketData();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setShow(true), SHOW_AFTER_ERROR_MS);
      return () => clearTimeout(t);
    }
    setShow(false);
  }, [error]);

  if (!show) return null;

  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        position: 'fixed',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        bgcolor: colors.midnightRaised,
        border: `1px solid ${colors.danger}`,
        color: colors.cream,
        px: 2,
        py: 1,
        borderRadius: 999,
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: colors.danger,
          flexShrink: 0,
          animation: 'lpw-pulse 1.4s ease-in-out infinite',
          '@keyframes lpw-pulse': {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: 0.35 },
          },
        }}
      />
      <Typography variant="body2" sx={{ fontSize: 12.5, lineHeight: 1.3 }}>
        Public RPC unavailable. Quotes may be stale. Retrying…
      </Typography>
    </Box>
  );
}
