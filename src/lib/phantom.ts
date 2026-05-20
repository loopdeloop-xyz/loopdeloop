'use client';

type Eip1193 = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
type WindowWithPhantom = Window & {
  phantom?: { ethereum?: Eip1193 };
};

export function getPhantomProvider(): Eip1193 | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as WindowWithPhantom).phantom?.ethereum;
}

export function isPhantomInstalled(): boolean {
  return getPhantomProvider() !== undefined;
}

export const PHANTOM_INSTALL_URL = 'https://phantom.com/download';
