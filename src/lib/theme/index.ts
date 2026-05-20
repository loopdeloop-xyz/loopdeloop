'use client';

import { createTheme } from '@mui/material/styles';
import { colors, radii, fonts } from './tokens';

export const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: 'dark',
    background: {
      default: colors.midnight,
      paper: colors.midnightRaised,
    },
    primary: {
      main: colors.coral,
      dark: colors.coralPressed,
      light: colors.coralHover,
      contrastText: colors.midnight,
    },
    secondary: {
      main: colors.amber,
      contrastText: colors.midnight,
    },
    text: {
      primary: colors.cream,
      secondary: colors.creamMuted,
      disabled: colors.slate,
    },
    divider: colors.midnightLine,
    success: { main: colors.success },
    error: { main: colors.danger },
    warning: { main: colors.warning },
  },
  typography: {
    fontFamily: fonts.sans,
    h1: { fontSize: 48, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.05 },
    h2: { fontSize: 32, fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1.15 },
    h3: { fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' },
    h4: { fontSize: 18, fontWeight: 600 },
    body1: { fontSize: 15, fontWeight: 400, lineHeight: 1.55 },
    body2: { fontSize: 13, fontWeight: 400, lineHeight: 1.5 },
    button: { fontSize: 14, fontWeight: 500, textTransform: 'none', letterSpacing: 0 },
    caption: { fontSize: 11, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase' },
  },
  shape: { borderRadius: radii.md },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: radii.md, paddingInline: 18, paddingBlock: 10, fontWeight: 500 },
        containedPrimary: {
          backgroundColor: colors.coral,
          color: colors.midnight,
          '&:hover': { backgroundColor: colors.coralHover },
          '&:active': { backgroundColor: colors.coralPressed },
        },
        outlined: {
          borderColor: colors.midnightLine,
          color: colors.cream,
          '&:hover': { borderColor: colors.coral, backgroundColor: 'transparent' },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: colors.midnightRaised,
          border: `1px solid ${colors.midnightLine}`,
          borderRadius: radii.lg,
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: colors.midnight,
            borderRadius: radii.md,
            '& fieldset': { borderColor: colors.midnightLine },
            '&:hover fieldset': { borderColor: colors.slate },
            '&.Mui-focused fieldset': { borderColor: colors.coral, borderWidth: 1 },
          },
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: { color: colors.coral, height: 4 },
        thumb: {
          backgroundColor: colors.amber,
          width: 18, height: 18,
          '&:hover, &.Mui-focusVisible': { boxShadow: `0 0 0 8px ${colors.coral}1A` },
        },
        track: { border: 'none' },
        rail: { backgroundColor: colors.midnightLine, opacity: 1 },
        mark: { backgroundColor: colors.slate },
      },
    },
    MuiDivider: { styleOverrides: { root: { borderColor: colors.midnightLine } } },
  },
});
