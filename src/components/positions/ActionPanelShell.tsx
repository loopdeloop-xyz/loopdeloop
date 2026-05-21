'use client';

import { Box, Stack, Typography } from '@mui/material';
import { colors } from '@/lib/theme/tokens';

// Shared layout for an action's expanded panel. Each action plugs in its own
// inputs + cost breakdown + submit row.
export function ActionPanelShell({
  caption,
  title,
  children,
}: {
  caption: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        mt: 1.5,
        pt: 1.5,
        borderTop: `1px solid ${colors.midnightLine}`,
      }}
    >
      <Stack spacing={1.5}>
        <Stack spacing={0.15}>
          <Typography variant="caption" sx={{ color: colors.coral }}>
            {caption}
          </Typography>
          <Typography sx={{ color: colors.cream, fontSize: 14, fontWeight: 600 }}>
            {title}
          </Typography>
        </Stack>
        {children}
      </Stack>
    </Box>
  );
}

export function CostBreakdown({
  rows,
}: {
  rows: { label: string; value: React.ReactNode; bold?: boolean; tone?: 'amber' | 'danger' | 'success' }[];
}) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: colors.creamMuted, display: 'block', mb: 0.5 }}>
        Cost breakdown
      </Typography>
      <Box sx={{ '& > div + div': { borderTop: `1px solid ${colors.midnightLine}` } }}>
        {rows.map((r) => {
          const color = r.tone === 'amber' ? colors.amber
            : r.tone === 'danger' ? colors.danger
            : r.tone === 'success' ? colors.success
            : colors.cream;
          return (
            <Stack key={r.label} direction="row" justifyContent="space-between" alignItems="baseline" sx={{ py: 0.85 }}>
              <Typography variant="body2" sx={{ color: colors.creamMuted, fontSize: 12.5 }}>
                {r.label}
              </Typography>
              <Box component="span" sx={{
                fontFamily: 'var(--font-geist-sans)',
                fontVariantNumeric: 'tabular-nums',
                fontSize: 13,
                fontWeight: r.bold ? 600 : 500,
                color,
              }}>
                {r.value}
              </Box>
            </Stack>
          );
        })}
      </Box>
    </Box>
  );
}
