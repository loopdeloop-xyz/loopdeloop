export const colors = {
  midnight: '#0F1729',
  midnightRaised: '#172238',
  midnightLine: '#1F2E48',
  coral: '#FF6B4A',
  coralHover: '#FF815F',
  coralPressed: '#E55A3D',
  amber: '#FFB84D',
  cream: '#F5F1E8',
  creamMuted: '#A8B0C0',
  slate: '#6B7B95',
  success: '#5FD68A',
  danger: '#FF5E5E',
  warning: '#FFB84D',
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
} as const;

// The `var(--font-geist-...)` references come from `next/font/google` in
// `app/layout.tsx`, which assigns the loaded font to those CSS variables on
// `<html>`. Listing them first means the MUI theme uses the next/font
// instance (with all its subsetting and woff2 preloading) rather than relying
// on the literal name 'Geist' to match.
export const fonts = {
  sans: "var(--font-geist-sans), 'Geist', 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
  mono: "var(--font-geist-mono), 'Geist Mono', 'JetBrains Mono', ui-monospace, monospace",
} as const;
