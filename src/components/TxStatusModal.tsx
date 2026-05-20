'use client';

import { useState } from 'react';
import { Dialog, DialogContent, Stack, Typography, Link, Button, Box } from '@mui/material';
import { useUiStore } from '@/state/store';
import { LoopSpinner } from './brand/LoopSpinner';
import { colors } from '@/lib/theme/tokens';

function StatusIcon({ status }: { status: string }) {
  if (status === 'success') {
    return (
      <svg width="56" height="56" viewBox="0 0 64 64" fill="none" aria-label="success">
        <circle cx="32" cy="32" r="28" fill="none" stroke={colors.amber} strokeWidth={3} />
        <path d="M20 32 L28 40 L44 24" stroke={colors.amber} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    );
  }
  if (status === 'error') {
    return (
      <svg width="56" height="56" viewBox="0 0 64 64" fill="none" aria-label="error">
        <circle cx="32" cy="32" r="28" fill="none" stroke={colors.danger} strokeWidth={3} />
        <path d="M22 22 L42 42 M42 22 L22 42" stroke={colors.danger} strokeWidth={4} strokeLinecap="round" />
      </svg>
    );
  }
  return <LoopSpinner size={56} />;
}

function buildShareLinks(lev?: number, apy?: number) {
  const qs = new URLSearchParams();
  if (lev !== undefined) qs.set('lev', lev.toFixed(2));
  if (apy !== undefined) qs.set('apy', apy.toFixed(4));
  const shareUrl = `https://loopdeloop.xyz/share?${qs.toString()}`;
  const ogUrl = `https://loopdeloop.xyz/share/og?${qs.toString()}`;
  const text =
    lev !== undefined && apy !== undefined
      ? `Just opened a ${lev.toFixed(2)}× leveraged PRIME loop. ${(apy * 100).toFixed(2)}% net APY in a single transaction.`
      : 'Just opened a leveraged PRIME loop in a single transaction.';
  const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
  return { shareUrl, ogUrl, intentUrl, text };
}

function XLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-label="X">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

interface Share { shareUrl: string; ogUrl: string; intentUrl: string; text: string }

function ShareControls({ share }: { share: Share }) {
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function fetchImage(): Promise<{ blob: Blob; file: File } | null> {
    const res = await fetch(share.ogUrl, { cache: 'force-cache' });
    if (!res.ok) return null;
    const blob = await res.blob();
    const file = new File([blob], 'loopdeloop-position.png', { type: 'image/png' });
    return { blob, file };
  }

  async function onShare() {
    setBusy(true);
    setHint(null);
    try {
      const got = await fetchImage();
      if (!got) {
        window.open(share.intentUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      const { blob, file } = got;

      // 1. Web Share API with files. Mobile (and some desktops) opens a native sheet
      // that hands the image directly to the X app as attached media.
      const nav = typeof navigator !== 'undefined' ? navigator : undefined;
      if (nav?.canShare?.({ files: [file] })) {
        try {
          await nav.share({ text: share.text, url: share.shareUrl, files: [file] });
          return;
        } catch (e) {
          // user cancelled or unsupported target; fall through to clipboard path
          if (e instanceof Error && e.name === 'AbortError') return;
        }
      }

      // 2. Clipboard image + open X compose. User pastes the image into the tweet.
      let clipboardOk = false;
      if (typeof ClipboardItem !== 'undefined' && nav?.clipboard?.write) {
        try {
          await nav.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          clipboardOk = true;
        } catch {
          // clipboard blocked or denied; continue with intent only
        }
      }

      window.open(share.intentUrl, '_blank', 'noopener,noreferrer');
      if (clipboardOk) {
        const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
        setHint(`Image copied — paste into your tweet with ${isMac ? '⌘V' : 'Ctrl+V'}.`);
      } else {
        setHint('Tip: download the image below if your browser blocked the clipboard.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack spacing={1.25} alignItems="center" sx={{ width: '100%', pt: 0.5 }}>
      <Box
        component="img"
        src={share.ogUrl}
        alt="Tweet image"
        sx={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 2,
          border: `1px solid ${colors.midnightLine}`,
          display: 'block',
        }}
      />
      <Stack direction="row" spacing={1} sx={{ width: '100%', maxWidth: 420 }}>
        <Button
          variant="contained"
          onClick={onShare}
          disabled={busy}
          sx={{ flex: 1, gap: 1, '&:hover': { textDecoration: 'none' } }}
        >
          <XLogo size={15} />
          {busy ? 'Preparing…' : 'Share on X'}
        </Button>
        <Button
          variant="outlined"
          component={Link}
          href={share.ogUrl}
          download="loopdeloop-position.png"
          sx={{ '&:hover': { textDecoration: 'none' } }}
        >
          Download
        </Button>
      </Stack>
      {hint && (
        <Typography variant="caption" sx={{ color: colors.amber, fontSize: 11, letterSpacing: 0, textTransform: 'none', textAlign: 'center', maxWidth: 420 }}>
          {hint}
        </Typography>
      )}
    </Stack>
  );
}

export function TxStatusModal() {
  const { txOpen, txStatus, txHash, txError, txLeverage, txNetApy, closeTx } = useUiStore();

  const title =
    txStatus === 'signing' ? 'Sign in your wallet'
    : txStatus === 'sending' ? 'Sending'
    : txStatus === 'pending' ? 'Confirming on-chain'
    : txStatus === 'success' ? 'Position opened'
    : txStatus === 'error' ? 'Transaction failed'
    : 'Working';

  const sub =
    txStatus === 'signing' ? 'Approve the signature requests in Phantom.'
    : txStatus === 'sending' ? 'Awaiting wallet broadcast.'
    : txStatus === 'pending' ? 'Waiting for block inclusion.'
    : undefined;

  const explorerUrl = txHash ? `https://etherscan.io/tx/${txHash}` : undefined;
  const dismissible = txStatus === 'success' || txStatus === 'error';
  const isSuccess = txStatus === 'success';
  const share = isSuccess ? buildShareLinks(txLeverage, txNetApy) : undefined;

  return (
    <Dialog
      open={txOpen}
      onClose={dismissible ? closeTx : undefined}
      slotProps={{ paper: { sx: { minWidth: isSuccess ? 480 : 380, p: 1 } } }}
    >
      <DialogContent sx={{ pt: 4, pb: 3 }}>
        <Stack spacing={2.5} alignItems="center">
          <StatusIcon status={txStatus} />
          <Stack spacing={0.5} alignItems="center">
            <Typography variant="h4" sx={{ color: colors.cream }}>{title}</Typography>
            {sub && <Typography variant="body2" sx={{ color: colors.creamMuted, textAlign: 'center' }}>{sub}</Typography>}
            {txStatus === 'success' && (
              <Typography variant="body2" sx={{ color: colors.creamMuted, textAlign: 'center' }}>
                Position is live. Check the Positions page for state.
              </Typography>
            )}
            {txStatus === 'error' && txError && (
              <Typography variant="body2" sx={{ color: colors.danger, textAlign: 'center', mt: 1, fontFamily: 'var(--font-geist-mono)' }}>
                {txError.slice(0, 240)}
              </Typography>
            )}
          </Stack>
          {explorerUrl && (
            <Link
              href={explorerUrl}
              target="_blank"
              rel="noopener"
              sx={{ color: colors.coral, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              View on Etherscan ↗
            </Link>
          )}

          {isSuccess && share && <ShareControls share={share} />}

          {dismissible && (
            <Box sx={{ mt: 1 }}>
              <Button variant="outlined" onClick={closeTx}>Close</Button>
            </Box>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
